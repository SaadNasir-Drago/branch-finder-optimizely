"use client";

import { CountryOption } from "@/types/branch";
import { useCallback, useState, useEffect, useRef } from "react";
import { debounce } from "@/lib/utils";

interface SearchBarProps {
  onSearchChange: (query: string) => void;
  onCountryChange: (countryCode: string | null) => void;
  onCityChange: (city: string | null) => void;
  onSortChange: (sortBy: "name" | "city" | "country" | "distance") => void;
  countries: CountryOption[];
  cities: Array<{ city: string; count: number }>;
  totalResults: number;
  totalBranches: number;
  selectedCountry: string | null;
  selectedCity: string | null;
  sortBy: "name" | "city" | "country" | "distance";
  hasUserLocation?: boolean;
  initialSearchQuery?: string;
}

export default function SearchBar({
  onSearchChange,
  onCountryChange,
  onCityChange,
  onSortChange,
  countries,
  cities,
  totalResults,
  totalBranches,
  selectedCountry,
  selectedCity,
  sortBy,
  hasUserLocation = false,
  initialSearchQuery = "",
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState(initialSearchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const isFirstRunRef = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      onSearchChange(value);
    }, 300),
    [onSearchChange]
  );

  // Skip the first run so a URL-hydrated query (e.g. from a shared link)
  // isn't immediately overwritten by an `onSearchChange("")` round-trip
  // before the user has interacted.
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    debouncedSearch(searchValue);
  }, [searchValue, debouncedSearch]);

  const handleClearFilters = () => {
    setSearchValue("");
    onSearchChange("");
    onCountryChange(null);
    onCityChange(null);
  };

  const activeFilterCount = [
    searchValue.trim() !== "",
    selectedCountry !== null,
    selectedCity !== null,
  ].filter(Boolean).length;

  const selectedCountryName = countries.find((c) => c.code === selectedCountry)?.name;

  return (
    <div className="w-full">
      {/* Search Input Row */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-slate"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search branches..."
            className="w-full pl-12 pr-10 py-3.5 bg-white border-2 border-white/20 rounded-xl text-midnight placeholder-slate focus:border-gold focus:ring-0 outline-none shadow-lg"
            suppressHydrationWarning
          />
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue("");
                onSearchChange("");
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate hover:text-midnight"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
            showFilters || activeFilterCount > 0
              ? "bg-gold text-midnight"
              : "bg-white text-midnight hover:bg-cream"
          }`}
          suppressHydrationWarning
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-midnight text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-4 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium text-midnight mb-2">
                Country
              </label>
              <div className="relative">
                <select
                  value={selectedCountry || ""}
                  onChange={(e) => onCountryChange(e.target.value || null)}
                  className="w-full px-4 py-2.5 bg-(--cream)/50 border border-cream rounded-lg text-midnight focus:border-gold focus:ring-0 outline-none appearance-none cursor-pointer"
                  suppressHydrationWarning
                >
                  <option value="">All Countries</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.count})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-midnight mb-2">
                City
                {!selectedCountry && (
                  <span className="text-xs text-slate font-normal ml-1">(select country first)</span>
                )}
              </label>
              <div className="relative">
                <select
                  value={selectedCity || ""}
                  onChange={(e) => onCityChange(e.target.value || null)}
                  disabled={!selectedCountry}
                  className={`w-full px-4 py-2.5 border border-cream rounded-lg text-midnight focus:border-gold focus:ring-0 outline-none appearance-none ${
                    selectedCountry
                      ? "bg-(--cream)/50 cursor-pointer"
                      : "bg-gray-100 cursor-not-allowed opacity-60"
                  }`}
                  suppressHydrationWarning
                >
                  <option value="">All Cities</option>
                  {cities.map((city) => (
                    <option key={city.city} value={city.city}>
                      {city.city} ({city.count})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-midnight mb-2">
                Sort by
              </label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value as "name" | "city" | "country" | "distance")}
                  className="w-full px-4 py-2.5 bg-(--cream)/50 border border-cream rounded-lg text-midnight focus:border-gold focus:ring-0 outline-none appearance-none cursor-pointer"
                  suppressHydrationWarning
                >
                  {hasUserLocation && <option value="distance">Distance (Nearest)</option>}
                  <option value="name">Branch Name</option>
                  <option value="city">City</option>
                  <option value="country">Country</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-cream">
              <button
                onClick={handleClearFilters}
                className="text-sm text-slate hover:text-midnight flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters & Results */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Active Filter Chips */}
        {selectedCountry && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {selectedCountryName}
            <button
              onClick={() => onCountryChange(null)}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}
        {selectedCity && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {selectedCity}
            <button
              onClick={() => onCityChange(null)}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}
        {searchValue.trim() && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            &quot;{searchValue}&quot;
            <button
              onClick={() => {
                setSearchValue("");
                onSearchChange("");
              }}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}

        {/* Results Count */}
        <div className="ml-auto text-sm text-white/80">
          <span className="font-semibold text-white">{totalResults.toLocaleString()}</span>
          {totalResults !== totalBranches && (
            <span> of {totalBranches.toLocaleString()}</span>
          )}{" "}
          {totalResults === 1 ? "branch" : "branches"}
        </div>
      </div>
    </div>
  );
}
