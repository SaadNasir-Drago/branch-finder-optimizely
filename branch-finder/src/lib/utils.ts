import { Branch, BranchRaw, CountryOption } from "@/types/branch";

/**
 * Parse coordinates string "lat, lng" into separate lat/lng numbers
 */
export function parseCoordinates(coordString: string): { lat: number; lng: number } | null {
  if (!coordString) return null;

  const parts = coordString.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return null;
  }

  return { lat: parts[0], lng: parts[1] };
}

/**
 * Transform raw branch data to include parsed coordinates
 */
export function transformBranch(raw: BranchRaw): Branch | null {
  const coords = parseCoordinates(raw.Coordinates);
  if (!coords) return null;

  return {
    ...raw,
    lat: coords.lat,
    lng: coords.lng,
  };
}

/**
 * Transform array of raw branches, filtering out invalid ones
 */
export function transformBranches(rawBranches: BranchRaw[]): Branch[] {
  return rawBranches
    .map(transformBranch)
    .filter((b): b is Branch => b !== null);
}

/**
 * Get unique countries from branches with counts
 */
export function getCountryOptions(branches: Branch[]): CountryOption[] {
  const countryMap = new Map<string, { name: string; count: number }>();

  branches.forEach((branch) => {
    const existing = countryMap.get(branch.CountryCode);
    if (existing) {
      existing.count++;
    } else {
      countryMap.set(branch.CountryCode, {
        name: branch.Country,
        count: 1,
      });
    }
  });

  return Array.from(countryMap.entries())
    .map(([code, data]) => ({
      code,
      name: data.name,
      count: data.count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get unique cities from branches with counts
 */
export function getCityOptions(branches: Branch[]): Array<{ city: string; count: number }> {
  const cityMap = new Map<string, number>();

  branches.forEach((branch) => {
    const existing = cityMap.get(branch.City);
    if (existing) {
      cityMap.set(branch.City, existing + 1);
    } else {
      cityMap.set(branch.City, 1);
    }
  });

  return Array.from(cityMap.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

/**
 * Filter branches by search query, country, and city
 */
export function filterBranches(
  branches: Branch[],
  searchQuery: string,
  countryCode: string | null,
  city: string | null = null
): Branch[] {
  let filtered = branches;

  if (countryCode) {
    filtered = filtered.filter((b) => b.CountryCode === countryCode);
  }

  if (city) {
    filtered = filtered.filter((b) => b.City === city);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (b) =>
        b.Name.toLowerCase().includes(query) ||
        b.City.toLowerCase().includes(query) ||
        b.Street.toLowerCase().includes(query) ||
        b.Country.toLowerCase().includes(query) ||
        b.ZipCode.toLowerCase().includes(query)
    );
  }

  return filtered;
}

/**
 * Sort branches by different criteria
 */
export function sortBranches(
  branches: Branch[],
  sortBy: "name" | "city" | "country"
): Branch[] {
  const sorted = [...branches];

  switch (sortBy) {
    case "name":
      return sorted.sort((a, b) => a.Name.localeCompare(b.Name));
    case "city":
      return sorted.sort((a, b) => a.City.localeCompare(b.City));
    case "country":
      return sorted.sort((a, b) => a.Country.localeCompare(b.Country));
    default:
      return sorted;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
