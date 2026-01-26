"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Branch } from "@/types/branch";

interface MapViewProps {
  branches: Branch[];
  selectedBranch: Branch | null;
  onBranchSelect: (branch: Branch) => void;
}

export default function MapView({
  branches,
  selectedBranch,
  onBranchSelect,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

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
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

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
      z-index: ${isSelected ? "1000" : "1"};
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

  // Update markers when branches change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    branches.forEach((branch) => {
      const isSelected = selectedBranch?._id === branch._id;
      const el = createMarkerElement(isSelected);
      const inner = el.firstChild as HTMLDivElement;

      el.addEventListener("mouseenter", () => {
        if (!isSelected) {
          el.style.width = "38px";
          el.style.height = "38px";
          if (inner) {
            inner.style.width = "14px";
            inner.style.height = "14px";
          }
        }
      });

      el.addEventListener("mouseleave", () => {
        if (!isSelected) {
          el.style.width = "32px";
          el.style.height = "32px";
          if (inner) {
            inner.style.width = "12px";
            inner.style.height = "12px";
          }
        }
      });

      el.addEventListener("click", () => {
        onBranchSelect(branch);
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center"
      })
        .setLngLat([branch.lng, branch.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (branches.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      branches.forEach((branch) => {
        bounds.extend([branch.lng, branch.lat]);
      });

      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 12,
        duration: 1000,
      });
    }
  }, [branches, selectedBranch, onBranchSelect, createMarkerElement]);

  // Fly to selected branch
  useEffect(() => {
    if (!map.current || !selectedBranch) return;

    // Close existing popup
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // Fly to branch
    map.current.flyTo({
      center: [selectedBranch.lng, selectedBranch.lat],
      zoom: 14,
      duration: 1500,
    });

    // Show popup
    popupRef.current = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      maxWidth: "300px",
    })
      .setLngLat([selectedBranch.lng, selectedBranch.lat])
      .setHTML(
        `
        <div style="padding: 16px; font-family: 'Jost', sans-serif;">
          <h3 style="font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #0a1628; margin: 0 0 8px 0;">
            ${selectedBranch.Name}
          </h3>
          <p style="font-size: 14px; color: #64748b; margin: 0 0 4px 0;">
            ${selectedBranch.Street}
          </p>
          <p style="font-size: 14px; color: #64748b; margin: 0 0 12px 0;">
            ${selectedBranch.City}, ${selectedBranch.Country}
          </p>
          <a href="tel:${selectedBranch.Phone}"
             style="display: inline-block; font-size: 14px; color: #0d4d56; text-decoration: none; font-weight: 500;">
            ${selectedBranch.Phone}
          </a>
        </div>
      `
      )
      .addTo(map.current);

    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
    };
  }, [selectedBranch]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map loading placeholder */}
      {!map.current && (
        <div className="absolute inset-0 bg-[var(--cream)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[var(--slate)]">Loading map...</p>
          </div>
        </div>
      )}

      {/* Branch count badge */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md">
        <p className="text-sm font-medium text-[var(--midnight)]">
          <span className="text-[var(--gold)]">{branches.length}</span> branches
        </p>
      </div>
    </div>
  );
}
