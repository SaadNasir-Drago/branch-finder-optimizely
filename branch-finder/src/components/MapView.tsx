"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import "@/styles/mapbox-directions-custom.css";
import { Branch, UserLocation } from "@/types/branch";
import { formatDistance } from "@/lib/utils";

type MapStatus =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; reason: "missing-token" | "init-failed" | "auth-failed"; message: string };

interface MapViewProps {
  branches: Branch[];
  selectedBranch: Branch | null;
  onBranchSelect: (branch: Branch) => void;
  userLocation?: UserLocation | null;
  onDirectionsReady?: (handler: (branch: Branch) => void) => void;
  onPopupDirectionsClick?: (branch: Branch) => void;
  onMapError?: (reason: "missing-token" | "init-failed" | "auth-failed") => void;
}

export default function MapView({
  branches,
  selectedBranch,
  onBranchSelect,
  userLocation,
  onDirectionsReady,
  onPopupDirectionsClick,
  onMapError,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const branchesByIdRef = useRef<Map<string, Branch>>(new Map());
  const layersReadyRef = useRef(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const clusterHoverPopupRef = useRef<mapboxgl.Popup | null>(null);
  const directionsRef = useRef<MapboxDirections | null>(null);
  const [showingDirections, setShowingDirections] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  // Track the branch the current route is rendered for so repeated clicks on
  // the same destination don't re-trigger the route request and spinner.
  const activeDirectionsBranchIdRef = useRef<string | null>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>({ kind: "loading" });
  const flyToTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);
  const routeLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SOURCE_ID = "branches";
  const CLUSTERS_LAYER = "branches-clusters";
  const CLUSTER_COUNT_LAYER = "branches-cluster-count";
  const POINTS_LAYER = "branches-points";

  // Stable refs so marker listeners always call the latest handler/selection
  // without forcing the marker-build effect to re-run when these props change.
  const onBranchSelectRef = useRef(onBranchSelect);
  useEffect(() => {
    onBranchSelectRef.current = onBranchSelect;
  }, [onBranchSelect]);

  const onMapErrorRef = useRef(onMapError);
  useEffect(() => {
    onMapErrorRef.current = onMapError;
  }, [onMapError]);

  const onPopupDirectionsClickRef = useRef(onPopupDirectionsClick);
  useEffect(() => {
    onPopupDirectionsClickRef.current = onPopupDirectionsClick;
  }, [onPopupDirectionsClick]);

  // Keep userLocation in a ref so showDirections can be stable yet always read
  // the latest value. Without this, showDirections captures userLocation in its
  // closure and the parent ends up holding a stale handler that early-returns
  // when the user grants location permission and we then try to fire pending
  // directions.
  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not found");
      setMapStatus({
        kind: "error",
        reason: "missing-token",
        message: "Map unavailable: NEXT_PUBLIC_MAPBOX_TOKEN is not set.",
      });
      onMapErrorRef.current?.("missing-token");
      return;
    }

    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [0, 20],
        zoom: 1.5,
        projection: "mercator",
        // Performance optimizations
        preserveDrawingBuffer: false, // Better performance when not exporting map
        antialias: false, // Disable antialiasing for better performance
        fadeDuration: 100, // Reduce fade duration for snappier feel
        attributionControl: false, // Remove attribution control (we'll add it back manually)
      });
    } catch (err) {
      console.error("Mapbox initialization failed", err);
      setMapStatus({
        kind: "error",
        reason: "init-failed",
        message: "Failed to initialize the map.",
      });
      onMapErrorRef.current?.("init-failed");
      return;
    }

    // Surface runtime errors (e.g., 401 from invalid token, tile fetch failures)
    map.current.on("error", (e) => {
      const status = (e?.error as { status?: number } | undefined)?.status;
      if (status === 401 || status === 403) {
        setMapStatus({
          kind: "error",
          reason: "auth-failed",
          message: "Map unavailable: the Mapbox token was rejected.",
        });
        onMapErrorRef.current?.("auth-failed");
      } else {
        console.error("Mapbox runtime error", e?.error ?? e);
      }
    });

    map.current.on("load", () => {
      setMapStatus({ kind: "ready" });
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Initialize and add directions control to map
    directionsRef.current = new MapboxDirections({
      accessToken: token,
      unit: "metric",
      profile: "mapbox/driving-traffic",
      alternatives: false,
      congestion: true,
      controls: {
        inputs: false, // Hide input fields
        instructions: true,
        profileSwitcher: false,
      },
      interactive: false,
    });

    // Add directions control to map (it will be hidden until we set origin/destination)
    map.current.addControl(directionsRef.current, "top-left");

    // Track loading state of route fetches so we can render a spinner while
    // Mapbox Directions is computing the route. The plugin's "route" event
    // fires when a new route is rendered; "error" fires on failures. Also
    // listen on the underlying directions GeoJSON sources so we don't get
    // stuck if the plugin's event fires before our listener attaches.
    const clearRouteLoading = () => {
      if (routeLoadingTimeoutRef.current) {
        clearTimeout(routeLoadingTimeoutRef.current);
        routeLoadingTimeoutRef.current = null;
      }
      setRouteLoading(false);
    };
    directionsRef.current.on("route", clearRouteLoading);
    directionsRef.current.on("error", clearRouteLoading);
    map.current.on("sourcedata", (e) => {
      // The directions plugin uses sources prefixed with "directions-".
      if (e.sourceId && e.sourceId.startsWith("directions-") && e.isSourceLoaded) {
        clearRouteLoading();
      }
    });

    return () => {
      // Directions control is removed when map is removed
      map.current?.remove();
      map.current = null;
      directionsRef.current = null;
      layersReadyRef.current = false;
    };
  }, []);

  // Create user location marker element
  const createUserMarkerElement = useCallback(() => {
    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.style.cssText = `
      width: 24px;
      height: 24px;
      background-color: #4285F4;
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.5);
      position: relative;
    `;

    // Add pulsing ring
    const pulse = document.createElement("div");
    pulse.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 48px;
      height: 48px;
      margin-left: -24px;
      margin-top: -24px;
      background-color: rgba(66, 133, 244, 0.2);
      border-radius: 50%;
      animation: pulse-ring 2s infinite;
    `;
    el.appendChild(pulse);

    return el;
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!map.current) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Add user marker if location is available
    if (userLocation) {
      const el = createUserMarkerElement();

      userMarkerRef.current = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);
    }
  }, [userLocation, createUserMarkerElement]);

  // Function to show directions. Reads userLocation from a ref so this
  // callback is stable across location updates — the parent caches this
  // handler, and a stale closure here was silently no-op'ing the first
  // directions request after the user granted location permission.
  const showDirections = useCallback((branch: Branch) => {
    const loc = userLocationRef.current;
    if (!map.current || !directionsRef.current || !loc) return;

    // Already routing to this branch — repeated clicks would otherwise
    // re-fire the request, restart the spinner, and stack pending fetches.
    if (activeDirectionsBranchIdRef.current === branch._id) {
      if (popupRef.current) popupRef.current.remove();
      return;
    }

    setRouteLoading(true);
    // Safety net: even if neither the plugin's "route" event nor the
    // directions sourcedata event fires, never leave the spinner stuck.
    if (routeLoadingTimeoutRef.current) clearTimeout(routeLoadingTimeoutRef.current);
    routeLoadingTimeoutRef.current = setTimeout(() => setRouteLoading(false), 8000);

    directionsRef.current.setOrigin([loc.lng, loc.lat]);
    directionsRef.current.setDestination([branch.lng, branch.lat]);

    activeDirectionsBranchIdRef.current = branch._id;
    setShowingDirections(true);

    if (popupRef.current) {
      popupRef.current.remove();
    }
  }, []);

  // Function to clear directions
  const clearDirections = useCallback(() => {
    if (!directionsRef.current) return;

    // Remove the routes from the map
    directionsRef.current.removeRoutes();
    activeDirectionsBranchIdRef.current = null;
    setShowingDirections(false);
    setRouteLoading(false);
    if (routeLoadingTimeoutRef.current) {
      clearTimeout(routeLoadingTimeoutRef.current);
      routeLoadingTimeoutRef.current = null;
    }
  }, []);

  // Expose showDirections to parent component
  useEffect(() => {
    if (onDirectionsReady) {
      onDirectionsReady(showDirections);
    }
  }, [onDirectionsReady, showDirections]);

  // Build the GeoJSON FeatureCollection for the current branches list.
  // Feature `id` must be a number for feature-state lookups via filter
  // expressions, so we hash branch._id into a stable numeric id and keep
  // a map back to the full branch object for click handlers.
  const buildFeatureCollection = useCallback(
    (
      list: Branch[]
    ): GeoJSON.FeatureCollection<GeoJSON.Point, { branchId: string }> => ({
      type: "FeatureCollection",
      features: list.map((b, i) => ({
        type: "Feature",
        id: i,
        geometry: { type: "Point", coordinates: [b.lng, b.lat] },
        properties: { branchId: b._id },
      })),
    }),
    []
  );

  // Initialize cluster source + layers + interactions once the map is ready.
  // This effect runs after `mapStatus` flips to `ready`, ensuring the style
  // is loaded before we add sources.
  useEffect(() => {
    if (mapStatus.kind !== "ready" || !map.current || layersReadyRef.current) return;
    const m = map.current;

    m.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 6,
    });

    m.addLayer({
      id: CLUSTERS_LAYER,
      type: "circle",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#d4af37",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#0a1628",
        "circle-radius": [
          "step",
          ["get", "point_count"],
          18,
          25,
          24,
          100,
          30,
        ],
        "circle-opacity": 0.95,
      },
    });

    m.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 13,
      },
      paint: {
        "text-color": "#0a1628",
      },
    });

    m.addLayer({
      id: POINTS_LAYER,
      type: "circle",
      source: SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#d4af37",
          "#0a1628",
        ],
        "circle-radius": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          10,
          7,
        ],
        "circle-stroke-width": 3,
        "circle-stroke-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#0a1628",
          "#d4af37",
        ],
      },
    });

    // Click a single point → select the branch.
    m.on("click", POINTS_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const branchId = (feature.properties as { branchId?: string } | null)?.branchId;
      if (!branchId) return;
      const branch = branchesByIdRef.current.get(branchId);
      if (branch) onBranchSelectRef.current(branch);
    });

    // Click a cluster → zoom into it.
    m.on("click", CLUSTERS_LAYER, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const clusterId = (feature.properties as { cluster_id?: number } | null)?.cluster_id;
      if (clusterId == null) return;
      const source = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        const geom = feature.geometry as GeoJSON.Point;
        m.easeTo({ center: geom.coordinates as [number, number], zoom });
      });
    });

    const setPointer = () => {
      m.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      m.getCanvas().style.cursor = "";
    };
    m.on("mouseenter", POINTS_LAYER, setPointer);
    m.on("mouseleave", POINTS_LAYER, clearPointer);

    // Cluster hover: show "<N> branches in this area" popup.
    m.on("mouseenter", CLUSTERS_LAYER, (e) => {
      setPointer();
      const feature = e.features?.[0];
      if (!feature) return;
      const count = (feature.properties as { point_count?: number } | null)?.point_count;
      if (count == null) return;
      const geom = feature.geometry as GeoJSON.Point;
      clusterHoverPopupRef.current?.remove();
      clusterHoverPopupRef.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 16,
        className: "cluster-hover-popup",
      })
        .setLngLat(geom.coordinates as [number, number])
        .setHTML(
          `<div style="padding: 6px 10px; font-family: 'Jost', sans-serif; font-size: 13px; color: #0a1628; font-weight: 500;">${count} branches in this area</div>`
        )
        .addTo(m);
    });
    m.on("mouseleave", CLUSTERS_LAYER, () => {
      clearPointer();
      clusterHoverPopupRef.current?.remove();
      clusterHoverPopupRef.current = null;
    });

    layersReadyRef.current = true;
  }, [mapStatus]);

  // Update the cluster source whenever the filtered branches change.
  // Also re-applies feature-state for the currently selected branch (if any)
  // since rebuilding the source clears prior feature-state.
  useEffect(() => {
    if (!map.current || !layersReadyRef.current) return;
    const m = map.current;
    const source = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    branchesByIdRef.current = new Map(branches.map((b) => [b._id, b]));
    source.setData(buildFeatureCollection(branches));
    // Feature state is cleared when setData runs; reapply selection.
    prevSelectedIdRef.current = null;

    if (branches.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      branches.forEach((branch) => bounds.extend([branch.lng, branch.lat]));
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);

      requestAnimationFrame(() => {
        if (map.current) {
          map.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 12,
            duration: 1000,
          });
        }
      });
    }
    // userLocation intentionally omitted: bounds extension is only relevant
    // when the branches list changes, and re-fitting on every location update
    // would override the user's manual pan/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, buildFeatureCollection]);

  // Apply feature-state for the selected branch. Uses a sourceFilter so we
  // toggle exactly one feature without iterating all of them.
  useEffect(() => {
    if (!map.current || !layersReadyRef.current) return;
    const m = map.current;
    const prevId = prevSelectedIdRef.current;
    const nextId = selectedBranch?._id ?? null;
    if (prevId === nextId) return;

    const setSelected = (branchId: string, value: boolean) => {
      // Find the feature index by branchId. Features in the source are keyed
      // by numeric id; we look it up via the branches list order to match.
      const idx = branches.findIndex((b) => b._id === branchId);
      if (idx < 0) return;
      m.setFeatureState({ source: SOURCE_ID, id: idx }, { selected: value });
    };

    if (prevId) setSelected(prevId, false);
    if (nextId) setSelected(nextId, true);
    prevSelectedIdRef.current = nextId;
  }, [selectedBranch, branches]);

  // Fly to selected branch - OPTIMIZED with debouncing.
  // Re-runs when mapStatus flips to "ready" so a deep-link selection (set
  // before the map finished loading) lands the camera on the branch.
  useEffect(() => {
    if (mapStatus.kind !== "ready" || !map.current || !selectedBranch) return;

    // Clear any pending fly-to animation
    if (flyToTimeoutRef.current) {
      clearTimeout(flyToTimeoutRef.current);
    }

    // Close existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // Debounce fly-to animation to avoid stuttering when quickly clicking branches
    flyToTimeoutRef.current = setTimeout(() => {
      if (map.current && selectedBranch) {
        map.current.flyTo({
          center: [selectedBranch.lng, selectedBranch.lat],
          zoom: 14,
          duration: 1200, // Reduced from 1500ms for snappier feel
          essential: true, // This animation is essential for proper UX
        });
      }
    }, 100);

    // Show popup with distance if available - Use template strings efficiently
    const distanceHtml = selectedBranch.distance !== undefined
      ? `<p style="font-size: 13px; color: #0d4d56; font-weight: 500; margin: 0 0 12px 0;">
           📍 ${formatDistance(selectedBranch.distance)} away
         </p>`
      : '';

    // Always render the directions button; the click handler triggers the
    // location request if the user hasn't granted it yet.
    const directionsButton = `<button id="show-directions-btn"
         style="font-size: 14px; color: white; background: #0d4d56; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: background 0.2s;">
        🗺️ Show Directions
      </button>`;

    // Use setTimeout to defer popup creation slightly for smoother animation
    setTimeout(() => {
      if (!map.current || !selectedBranch) return;

      popupRef.current = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "300px",
        className: "branch-popup", // Add class for potential CSS optimizations
      })
        .setLngLat([selectedBranch.lng, selectedBranch.lat])
        .setHTML(
          `
          <div style="padding: 16px; font-family: 'Jost', sans-serif;">
            <h3 style="font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #0a1628; margin: 0 0 8px 0;">
              ${selectedBranch.Name}
            </h3>
            ${distanceHtml}
            <p style="font-size: 14px; color: #64748b; margin: 0 0 4px 0;">
              ${selectedBranch.Street}
            </p>
            <p style="font-size: 14px; color: #64748b; margin: 0 0 12px 0;">
              ${selectedBranch.City}, ${selectedBranch.Country}
            </p>
            <div style="display: flex; gap: 12px; align-items: center;">
              <a href="tel:${selectedBranch.Phone}"
                 style="font-size: 14px; color: #0d4d56; text-decoration: none; font-weight: 500;">
                📞 Call
              </a>
              ${directionsButton}
            </div>
          </div>
        `
        )
        .addTo(map.current);

      // Wire the directions button to the parent handler. If location isn't
      // granted, the parent triggers the geolocation request and fires
      // directions once it resolves.
      const btn = document.getElementById("show-directions-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          onPopupDirectionsClickRef.current?.(selectedBranch);
        });
        btn.addEventListener("mouseenter", () => {
          btn.style.background = "#0a1628";
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.background = "#0d4d56";
        });
      }
    }, 200); // Delay popup to let fly-to animation start first

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
      if (flyToTimeoutRef.current) {
        clearTimeout(flyToTimeoutRef.current);
      }
    };
  }, [selectedBranch, userLocation, showDirections, mapStatus]);

  return (
    <div
      role="region"
      aria-label={`Interactive branch location map with ${branches.length} branches`}
      className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg"
    >
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map loading placeholder */}
      {mapStatus.kind === "loading" && (
        <div className="absolute inset-0 bg-cream flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map error state */}
      {mapStatus.kind === "error" && (
        <div
          role="alert"
          className="absolute inset-0 bg-cream flex items-center justify-center p-6"
        >
          <div className="text-center max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-midnight/5 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-midnight"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <p className="text-midnight font-medium mb-2">Map unavailable</p>
            <p className="text-slate text-sm">
              {mapStatus.reason === "missing-token"
                ? "The Mapbox access token is not configured. The list view is still available."
                : mapStatus.reason === "auth-failed"
                ? "The Mapbox token was rejected. Please check that it is valid."
                : "We couldn't load the map. The list view is still available."}
            </p>
          </div>
        </div>
      )}

      {/* Branch count badge */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md">
        <p className="text-sm font-medium text-midnight">
          <span className="text-gold">{branches.length}</span> branches
        </p>
      </div>

      {/* User location indicator */}
      {userLocation && (
        <div className="absolute top-4 right-14 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-md flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-midnight font-medium">Your location</span>
        </div>
      )}

      {/* Directions loading indicator */}
      {routeLoading && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md flex items-center gap-2"
        >
          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-midnight">Loading directions…</span>
        </div>
      )}

      {/* Clear Directions Button */}
      {showingDirections && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-md">
          <button
            onClick={clearDirections}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-midnight hover:text-deep-teal transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Directions
          </button>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
