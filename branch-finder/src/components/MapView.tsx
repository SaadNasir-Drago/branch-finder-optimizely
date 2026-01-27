"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import "@/styles/mapbox-directions-custom.css";
import { Branch, UserLocation } from "@/types/branch";
import { formatDistance } from "@/lib/utils";

interface MapViewProps {
  branches: Branch[];
  selectedBranch: Branch | null;
  onBranchSelect: (branch: Branch) => void;
  userLocation?: UserLocation | null;
  onDirectionsReady?: (handler: (branch: Branch) => void) => void;
}

export default function MapView({
  branches,
  selectedBranch,
  onBranchSelect,
  userLocation,
  onDirectionsReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const directionsRef = useRef<MapboxDirections | null>(null);
  const [showingDirections, setShowingDirections] = useState(false);
  const flyToTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not found");
      return;
    }

    mapboxgl.accessToken = token;

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

    return () => {
      // Directions control is removed when map is removed
      map.current?.remove();
      map.current = null;
      directionsRef.current = null;
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

  // Function to show directions
  const showDirections = useCallback((branch: Branch) => {
    if (!map.current || !directionsRef.current || !userLocation) return;

    // Set origin (user location) and destination (branch)
    directionsRef.current.setOrigin([userLocation.lng, userLocation.lat]);
    directionsRef.current.setDestination([branch.lng, branch.lat]);

    // Mark that we're showing directions
    setShowingDirections(true);

    // Close popup
    if (popupRef.current) {
      popupRef.current.remove();
    }
  }, [userLocation]);

  // Function to clear directions
  const clearDirections = useCallback(() => {
    if (!directionsRef.current) return;

    // Remove the routes from the map
    directionsRef.current.removeRoutes();
    setShowingDirections(false);
  }, []);

  // Expose showDirections to parent component
  useEffect(() => {
    if (onDirectionsReady) {
      onDirectionsReady(showDirections);
    }
  }, [onDirectionsReady, showDirections]);

  // Create marker element
  const createMarkerElement = useCallback((isSelected: boolean) => {
    const el = document.createElement("div");
    el.className = "branch-marker";
    el.style.cssText = `
      width: ${isSelected ? "40px" : "32px"};
      height: ${isSelected ? "40px" : "32px"};
      background-color: ${isSelected ? "#d4af37" : "#0a1628"};
      border: 3px solid ${isSelected ? "#0a1628" : "#d4af37"};
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(10, 22, 40, ${isSelected ? "0.4" : "0.3"});
      transition: all 0.2s ease;
      z-index: ${isSelected ? "40" : "10"};
    `;

    const inner = document.createElement("div");
    inner.style.cssText = `
      width: ${isSelected ? "16px" : "12px"};
      height: ${isSelected ? "16px" : "12px"};
      background-color: ${isSelected ? "#0a1628" : "#d4af37"};
      border-radius: 50%;
    `;
    el.appendChild(inner);

    return el;
  }, []);

  // Update markers when branches change - OPTIMIZED with selective updates
  useEffect(() => {
    if (!map.current) return;

    // Get current branch IDs for quick lookup
    const currentBranchIds = new Set(branches.map(b => b._id));

    // Remove markers for branches that are no longer in the filtered list
    markersRef.current.forEach((marker, branchId) => {
      if (!currentBranchIds.has(branchId)) {
        marker.remove();
        markersRef.current.delete(branchId);
      }
    });

    // Add or update markers for current branches
    branches.forEach((branch) => {
      const isSelected = selectedBranch?._id === branch._id;
      const existingMarker = markersRef.current.get(branch._id);

      if (existingMarker) {
        // Update existing marker if selection state changed
        const el = existingMarker.getElement();
        const wasSelected = el.style.backgroundColor === "rgb(212, 175, 55)"; // gold color

        if (wasSelected !== isSelected) {
          // Remove and recreate marker with new state
          existingMarker.remove();
          const newEl = createMarkerElement(isSelected);
          const inner = newEl.firstChild as HTMLDivElement;

          // Add event listeners
          const handleMouseEnter = () => {
            if (!isSelected) {
              newEl.style.width = "38px";
              newEl.style.height = "38px";
              if (inner) {
                inner.style.width = "14px";
                inner.style.height = "14px";
              }
            }
          };

          const handleMouseLeave = () => {
            if (!isSelected) {
              newEl.style.width = "32px";
              newEl.style.height = "32px";
              if (inner) {
                inner.style.width = "12px";
                inner.style.height = "12px";
              }
            }
          };

          const handleClick = () => {
            onBranchSelect(branch);
          };

          newEl.addEventListener("mouseenter", handleMouseEnter);
          newEl.addEventListener("mouseleave", handleMouseLeave);
          newEl.addEventListener("click", handleClick);

          const newMarker = new mapboxgl.Marker({
            element: newEl,
            anchor: "center"
          })
            .setLngLat([branch.lng, branch.lat])
            .addTo(map.current!);

          markersRef.current.set(branch._id, newMarker);
        }
      } else {
        // Create new marker
        const el = createMarkerElement(isSelected);
        const inner = el.firstChild as HTMLDivElement;

        const handleMouseEnter = () => {
          if (!isSelected) {
            el.style.width = "38px";
            el.style.height = "38px";
            if (inner) {
              inner.style.width = "14px";
              inner.style.height = "14px";
            }
          }
        };

        const handleMouseLeave = () => {
          if (!isSelected) {
            el.style.width = "32px";
            el.style.height = "32px";
            if (inner) {
              inner.style.width = "12px";
              inner.style.height = "12px";
            }
          }
        };

        const handleClick = () => {
          onBranchSelect(branch);
        };

        el.addEventListener("mouseenter", handleMouseEnter);
        el.addEventListener("mouseleave", handleMouseLeave);
        el.addEventListener("click", handleClick);

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: "center"
        })
          .setLngLat([branch.lng, branch.lat])
          .addTo(map.current!);

        markersRef.current.set(branch._id, marker);
      }
    });

    // Fit bounds only when branches list changes (not on selection)
    if (branches.length > 0 && markersRef.current.size === branches.length) {
      const bounds = new mapboxgl.LngLatBounds();
      branches.forEach((branch) => {
        bounds.extend([branch.lng, branch.lat]);
      });

      // Include user location in bounds if available
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }

      // Use requestAnimationFrame to defer bounds fitting
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
  }, [branches, selectedBranch, onBranchSelect, createMarkerElement, userLocation]);

  // Fly to selected branch - OPTIMIZED with debouncing
  useEffect(() => {
    if (!map.current || !selectedBranch) return;

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

    // Create popup with directions button if user location is available
    const directionsButton = userLocation
      ? `<button id="show-directions-btn"
           style="font-size: 14px; color: white; background: #0d4d56; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: background 0.2s;">
          🗺️ Show Directions
        </button>`
      : '';

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

      // Add click event listener to the directions button if it exists
      if (userLocation) {
        const btn = document.getElementById("show-directions-btn");
        if (btn) {
          btn.addEventListener("click", () => showDirections(selectedBranch));
          btn.addEventListener("mouseenter", () => {
            btn.style.background = "#0a1628";
          });
          btn.addEventListener("mouseleave", () => {
            btn.style.background = "#0d4d56";
          });
        }
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
  }, [selectedBranch, userLocation, showDirections]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map loading placeholder */}
      {!map.current && (
        <div className="absolute inset-0 bg-cream flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate">Loading map...</p>
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

      {/* Clear Directions Button */}
      {showingDirections && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-md">
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
