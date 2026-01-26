"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BranchList from "@/components/BranchList";
import { useBranches } from "@/components/useBranches";
import { Branch } from "@/types/branch";
import { filterBranches, getCountryOptions, getCityOptions, sortBranches } from "@/lib/utils";

// Dynamic import for MapView to avoid SSR issues with Mapbox
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[var(--cream)] rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[var(--slate)]">Loading map...</p>
      </div>
    </div>
  ),
});

export default function BranchFinderPage() {
  const { branches, isLoading, error, loadProgress, refetch } = useBranches();
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "city" | "country">("name");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [activeView, setActiveView] = useState<"list" | "map">("list");

  // Get country options for filter dropdown
  const countryOptions = useMemo(() => getCountryOptions(branches), [branches]);

  // Get city options (filtered by country if selected)
  const cityOptions = useMemo(() => {
    const filteredByCountry = countryFilter
      ? branches.filter((b) => b.CountryCode === countryFilter)
      : branches;
    return getCityOptions(filteredByCountry);
  }, [branches, countryFilter]);

  // Filter and sort branches
  const filteredBranches = useMemo(() => {
    const filtered = filterBranches(branches, searchQuery, countryFilter, cityFilter);
    return sortBranches(filtered, sortBy);
  }, [branches, searchQuery, countryFilter, cityFilter, sortBy]);

  // Handle branch selection
  const handleBranchSelect = useCallback((branch: Branch) => {
    setSelectedBranch(branch);
    // On mobile, switch to map view when selecting a branch
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setActiveView("map");
    }
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedBranch(null);
  }, []);

  // Handle country change
  const handleCountryChange = useCallback((code: string | null) => {
    setCountryFilter(code);
    setCityFilter(null); // Reset city when country changes
    setSelectedBranch(null);
  }, []);

  // Handle city change
  const handleCityChange = useCallback((city: string | null) => {
    setCityFilter(city);
    setSelectedBranch(null);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((sort: "name" | "city" | "country") => {
    setSortBy(sort);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--warm-white)]">
      <Header />

      {/* Hero Section */}
      <section className="pt-20 sm:pt-24 pb-8 bg-gradient-to-br from-[var(--midnight)] via-[var(--navy)] to-[var(--deep-teal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-8">
            <h1 className="font-[var(--font-playfair)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--warm-white)] mb-4">
              Find Your Nearest Branch
            </h1>
            <p className="text-[var(--cream)] text-lg max-w-2xl mx-auto opacity-90">
              With over 1,000 branches worldwide, exceptional banking service is
              always nearby. Search by location, city, or country.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <SearchBar
              onSearchChange={handleSearchChange}
              onCountryChange={handleCountryChange}
              onCityChange={handleCityChange}
              onSortChange={handleSortChange}
              countries={countryOptions}
              cities={cityOptions}
              totalResults={filteredBranches.length}
              totalBranches={branches.length}
              selectedCountry={countryFilter}
              selectedCity={cityFilter}
              sortBy={sortBy}
            />
          </div>
        </div>
      </section>

      {/* Loading Progress */}
      {isLoading && loadProgress > 0 && loadProgress < 1 && (
        <div className="bg-[var(--cream)] px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--gold)] transition-all duration-300"
                  style={{ width: `${loadProgress * 100}%` }}
                />
              </div>
              <span className="text-sm text-[var(--slate)] whitespace-nowrap">
                Loading branches... {Math.round(loadProgress * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 px-4 py-6">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 text-red-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Failed to load branches</span>
            </div>
            <p className="text-red-500 mb-4">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Mobile View Toggle */}
      <div className="lg:hidden sticky top-16 z-40 bg-[var(--warm-white)] border-b border-[var(--cream)] px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("list")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-colors ${
              activeView === "list"
                ? "bg-[var(--midnight)] text-[var(--warm-white)]"
                : "bg-[var(--cream)] text-[var(--midnight)]"
            }`}
            suppressHydrationWarning
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              List
            </span>
          </button>
          <button
            onClick={() => setActiveView("map")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-colors ${
              activeView === "map"
                ? "bg-[var(--midnight)] text-[var(--warm-white)]"
                : "bg-[var(--cream)] text-[var(--midnight)]"
            }`}
            suppressHydrationWarning
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              Map
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:h-[calc(100vh-340px)] lg:min-h-[600px]">
          {/* Branch List */}
          <div
            className={`lg:col-span-2 lg:overflow-y-auto lg:pr-2 ${
              activeView === "list" ? "block" : "hidden lg:block"
            }`}
          >
            <BranchList
              branches={filteredBranches}
              selectedBranch={selectedBranch}
              onBranchSelect={handleBranchSelect}
              isLoading={isLoading}
            />
          </div>

          {/* Map View */}
          <div
            className={`lg:col-span-3 h-[60vh] lg:h-full ${
              activeView === "map" ? "block" : "hidden lg:block"
            }`}
          >
            <MapView
              branches={filteredBranches}
              selectedBranch={selectedBranch}
              onBranchSelect={handleBranchSelect}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--midnight)] text-[var(--cream)] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm opacity-80">
              &copy; 2024 Brightstream Bank. All rights reserved. Member FDIC.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-[var(--gold)] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-[var(--gold)] transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-[var(--gold)] transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
