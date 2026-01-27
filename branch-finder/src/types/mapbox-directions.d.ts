declare module "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions" {
  import mapboxgl from "mapbox-gl";

  interface DirectionsOptions {
    accessToken?: string;
    unit?: "imperial" | "metric";
    profile?: "mapbox/driving-traffic" | "mapbox/driving" | "mapbox/walking" | "mapbox/cycling";
    alternatives?: boolean;
    congestion?: boolean;
    controls?: {
      inputs?: boolean;
      instructions?: boolean;
      profileSwitcher?: boolean;
    };
    interactive?: boolean;
    styles?: Array<{
      id: string;
      type: string;
      source: string;
      layout?: Record<string, unknown>;
      paint?: Record<string, unknown>;
      filter?: unknown[];
    }>;
  }

  export default class MapboxDirections implements mapboxgl.IControl {
    constructor(options: DirectionsOptions);
    onAdd(map: mapboxgl.Map): HTMLElement;
    onRemove(map: mapboxgl.Map): void;
    setOrigin(origin: [number, number] | string): this;
    setDestination(destination: [number, number] | string): this;
    removeRoutes(): this;
    on(event: string, callback: (e: unknown) => void): void;
    getOrigin(): { geometry: { coordinates: [number, number] } } | undefined;
    getDestination(): { geometry: { coordinates: [number, number] } } | undefined;
  }
}
