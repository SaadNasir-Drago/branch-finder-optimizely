"use client";

import { useState, useCallback } from "react";
import { UserLocation } from "@/types/branch";

interface GeolocationState {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    isLoading: false,
    error: null,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
  });

  const requestLocation = useCallback(() => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          isLoading: false,
          error: null,
          isSupported: true,
        });
      },
      (error) => {
        let errorMessage = "Failed to get your location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access was denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Your location is currently unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, [state.isSupported]);

  const clearLocation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      location: null,
      error: null,
    }));
  }, []);

  return {
    ...state,
    requestLocation,
    clearLocation,
  };
}
