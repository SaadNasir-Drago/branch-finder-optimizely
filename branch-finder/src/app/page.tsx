"use client";

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import BranchList from "@/components/BranchList";
import BranchDetailPanel from "@/components/BranchDetailPanel";
import { useBranches } from "@/hooks/useBranches";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Branch } from "@/types/branch";
import {
  filterBranches,
  getCountryOptions,
  getCityOptions,
  sortBranches,
  addDistanceToBranches,
} from "@/lib/utils";

// Dynamic import for MapView to avoid SSR issues with Mapbox
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-cream rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate">Loading map...</p>
      </div>
    </div>
  ),
});

// Wrapper component to handle Suspense for useSearchParams
export default function BranchFinderPage() {
  return (
    <Suspense fallback={<BranchFinderLoading />}>
      <BranchFinderContent />
    </Suspense>
  );
}

function BranchFinderLoading() {
  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate text-lg">Loading Branch Finder...</p>
      </div>
    </div>
  );
}

function BranchFinderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { branches, isLoading, error, loadProgress, refetch } = useBranches();
  const {
    location: userLocation,
    isLoading: isLocating,
    error: locationError,
    isSupported: isGeolocationSupported,
    requestLocation,
    clearLocation,
  } = useGeolocation();

  // Hydrate filter state from URL on first render only — lazy initializers
  // avoid an extra render and don't fight subsequent user-driven URL updates.
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [countryFilter, setCountryFilter] = useState<string | null>(
    () => searchParams.get("country")
  );
  const [cityFilter, setCityFilter] = useState<string | null>(
    () => searchParams.get("city")
  );
  const [sortBy, setSortBy] = useState<"name" | "city" | "country" | "distance">("name");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "map">("list");
  const [directionsHandler, setDirectionsHandler] = useState<((branch: Branch) => void) | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  // Set only when the page is opened via a shared `?branch=<id>` URL.
  // Narrows list + map to the single shared branch until the user clears it.
  const [pinnedBranchId, setPinnedBranchId] = useState<string | null>(
    () => searchParams.get("branch")
  );
  const pendingDirectionsBranchRef = useRef<Branch | null>(null);

  // Track when component is mounted (client-side only) so geolocation UI
  // doesn't render during SSR and cause a hydration mismatch.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync pinnedBranchId from the URL whenever it changes (back/forward nav,
  // pasting a shared link into the bar of an already-open tab). The lazy
  // useState initializer only runs once, so without this effect navigating
  // to a `?branch=<id>` URL on an already-mounted page wouldn't narrow the list.
  useEffect(() => {
    setPinnedBranchId(searchParams.get("branch"));
  }, [searchParams]);

  useEffect(() => {
    if (!pinnedBranchId || branches.length === 0) return;
    const branch = branches.find((b) => b._id === pinnedBranchId);
    if (branch) {
      setSelectedBranch(branch);
    }
  }, [branches, pinnedBranchId]);

  // Update URL when filters change
  const updateURL = useCallback(
    (params: { branch?: string; country?: string; city?: string; q?: string }) => {
      const url = new URL(window.location.href);

      // Clear existing params
      url.searchParams.delete("branch");
      url.searchParams.delete("country");
      url.searchParams.delete("city");
      url.searchParams.delete("q");

      // Set new params
      if (params.branch) url.searchParams.set("branch", params.branch);
      if (params.country) url.searchParams.set("country", params.country);
      if (params.city) url.searchParams.set("city", params.city);
      if (params.q) url.searchParams.set("q", params.q);

      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router]
  );

  // Get country options for filter dropdown
  const countryOptions = useMemo(() => getCountryOptions(branches), [branches]);

  // Get city options (filtered by country if selected)
  const cityOptions = useMemo(() => {
    const filteredByCountry = countryFilter
      ? branches.filter((b) => b.CountryCode === countryFilter)
      : branches;
    return getCityOptions(filteredByCountry);
  }, [branches, countryFilter]);

  // Add distances and filter/sort branches
  const filteredBranches = useMemo(() => {
    let branchesWithDistance = branches;

    // Add distance if user location is available
    if (userLocation) {
      branchesWithDistance = addDistanceToBranches(branches, userLocation);
    }

    // Shared link: narrow to just the pinned branch (once it's loaded). If the
    // id doesn't match anything yet (still loading), fall through so the list
    // stays empty rather than showing all branches and then snapping to one.
    if (pinnedBranchId) {
      const pinned = branchesWithDistance.find((b) => b._id === pinnedBranchId);
      return pinned ? [pinned] : [];
    }

    const filtered = filterBranches(branchesWithDistance, searchQuery, countryFilter, cityFilter);
    return sortBranches(filtered, sortBy);
  }, [branches, userLocation, searchQuery, countryFilter, cityFilter, sortBy, pinnedBranchId]);

  // Handle "Find Nearest" button click
  const handleFindNearest = useCallback(() => {
    requestLocation();
    setSortBy("distance");
  }, [requestLocation]);

  // Handle clearing location
  const handleClearLocation = useCallback(() => {
    clearLocation();
    if (sortBy === "distance") {
      setSortBy("name");
    }
  }, [clearLocation, sortBy]);

  // Clear the shared-link narrowing so the user can browse all branches again.
  const handleClearPinned = useCallback(() => {
    setPinnedBranchId(null);
    setSelectedBranch(null);
    updateURL({
      country: countryFilter || undefined,
      city: cityFilter || undefined,
      q: searchQuery || undefined,
    });
  }, [countryFilter, cityFilter, searchQuery, updateURL]);

  // Handle branch selection. We deliberately do NOT write `?branch=` to the
  // URL here — that param is reserved for shared-link entry, and writing it
  // on every click would narrow the list to the clicked branch via the
  // pinnedBranchId sync effect.
  const handleBranchSelect = useCallback(
    (branch: Branch) => {
      setSelectedBranch(branch);

      // On mobile, switch to map view when selecting a branch
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setActiveView("map");
      }
    },
    []
  );

  // Handle opening detail panel
  const handleOpenDetails = useCallback((branch: Branch) => {
    setSelectedBranch(branch);
    setShowDetailPanel(true);
  }, []);

  // Handle closing detail panel
  const handleCloseDetails = useCallback(() => {
    setShowDetailPanel(false);
    updateURL({
      country: countryFilter || undefined,
      city: cityFilter || undefined,
      q: searchQuery || undefined,
    });
  }, [countryFilter, cityFilter, searchQuery, updateURL]);

  // Handle search change
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setSelectedBranch(null);
      // Any user-driven filter change implicitly exits the shared-link view.
      setPinnedBranchId(null);
      updateURL({
        country: countryFilter || undefined,
        city: cityFilter || undefined,
        q: query || undefined,
      });
    },
    [countryFilter, cityFilter, updateURL]
  );

  // Handle country change
  const handleCountryChange = useCallback(
    (code: string | null) => {
      setCountryFilter(code);
      setCityFilter(null);
      setSelectedBranch(null);
      setPinnedBranchId(null);
      updateURL({
        country: code || undefined,
        q: searchQuery || undefined,
      });
    },
    [searchQuery, updateURL]
  );

  // Handle city change
  const handleCityChange = useCallback(
    (city: string | null) => {
      setCityFilter(city);
      setSelectedBranch(null);
      setPinnedBranchId(null);
      updateURL({
        country: countryFilter || undefined,
        city: city || undefined,
        q: searchQuery || undefined,
      });
    },
    [countryFilter, searchQuery, updateURL]
  );

  // Handle sort change
  const handleSortChange = useCallback((sort: "name" | "city" | "country" | "distance") => {
    setSortBy(sort);
  }, []);

  // Handle directions ready from MapView
  const handleDirectionsReady = useCallback((handler: (branch: Branch) => void) => {
    setDirectionsHandler(() => handler);
  }, []);

  // If the map fails to load, fall back to the list view on mobile
  const handleMapError = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setActiveView("list");
    }
  }, []);

  // Handle get directions from BranchCard / DetailPanel / map popup.
  // If location isn't already on, this acts like a click on "Use My Location"
  // (triggers the same browser permission prompt), and once the position
  // resolves the queued branch's directions render automatically.
  const handleGetDirections = useCallback(
    (branch: Branch) => {
      setSelectedBranch(branch);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setActiveView("map");
      }

      if (userLocation && directionsHandler) {
        directionsHandler(branch);
        return;
      }

      // Request location without flipping sort to "distance" — that would
      // re-order the list when permission resolves and bump the selected
      // card out of view.
      pendingDirectionsBranchRef.current = branch;
      requestLocation();
    },
    [directionsHandler, userLocation, requestLocation]
  );

  // Fire pending directions once location resolves; cancel on permission errors.
  useEffect(() => {
    if (locationError) {
      pendingDirectionsBranchRef.current = null;
      return;
    }
    const pending = pendingDirectionsBranchRef.current;
    if (pending && userLocation && directionsHandler) {
      directionsHandler(pending);
      pendingDirectionsBranchRef.current = null;
    }
  }, [userLocation, directionsHandler, locationError]);

  return (
    <div className="min-h-screen bg-warm-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-20 sm:pt-24 pb-8 bg-linear-to-br from-midnight via-navy to-deep-teal">
        <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center mb-8">
            <h1 className="font-(family-name:--font-playfair) text-3xl sm:text-4xl lg:text-5xl font-bold text-warm-white mb-4">
              Find Your Nearest Branch
            </h1>
            <p className="text-[clamp(1.1rem,2vw,1.3rem)] text-cream font-light tracking-[0.5px] opacity-95 max-w-2xl mx-auto">
              With over 1,000 branches worldwide, exceptional banking service is
              always nearby. Search by location, city, or country.
            </p>
          </div>

          {/* Find Nearest Button */}
          {isMounted && isGeolocationSupported && (
            <div className="flex justify-center mb-6">
              {!userLocation ? (
                <button
                  onClick={handleFindNearest}
                  disabled={isLocating}
                  className="flex items-center gap-2 px-6 py-3 bg-gold text-midnight font-medium rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                >
                  {isLocating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-midnight border-t-transparent rounded-full animate-spin"></div>
                      <span>Finding your location...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>Use My Location</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white">
                    <svg className="w-5 h-5 text-gold" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
                    </svg>
                    <span className="text-sm">Location active - showing distances</span>
                  </div>
                  <button
                    onClick={handleClearLocation}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Clear location"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Location Error */}
          {locationError && (
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-200 rounded-xl text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{locationError}</span>
              </div>
            </div>
          )}


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
              hasUserLocation={!!userLocation}
              initialSearchQuery={searchQuery}
            />
          </div>
        </div>
      </section>

      {/* Loading Progress */}
      {isLoading && loadProgress > 0 && loadProgress < 1 && (
        <div className="bg-cream px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold transition-all duration-300"
                  style={{ width: `${loadProgress * 100}%` }}
                />
              </div>
              <span className="text-sm text-slate whitespace-nowrap">
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
      <div className="lg:hidden sticky top-16 z-40 bg-warm-white border-b border-cream px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView("list")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-colors ${
              activeView === "list"
                ? "bg-midnight text-warm-white"
                : "bg-cream text-midnight"
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
                ? "bg-midnight text-warm-white"
                : "bg-cream text-midnight"
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

      {/* Shared-link banner: shown when arriving via ?branch=<id> so the user
          can see why the list is narrowed and return to all branches. */}
      {pinnedBranchId && (
        <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-cream border border-gold/40 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-midnight">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 015.656 0l1.414 1.414a4 4 0 010 5.656l-3 3a4 4 0 01-5.656 0l-1.06-1.06m1.06-7.07a4 4 0 00-5.656 0l-3 3a4 4 0 000 5.656l1.414 1.414a4 4 0 005.656 0l1.06-1.06" />
              </svg>
              <span>Showing a shared branch.</span>
            </div>
            <button
              onClick={handleClearPinned}
              className="text-sm font-medium text-midnight hover:text-deep-teal underline underline-offset-2"
            >
              Show all branches
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:h-[calc(100vh-300px)] lg:min-h-175">
          {/* Branch List */}
          <div
            className={`lg:col-span-2 lg:overflow-y-auto lg:pr-2 lg:h-full ${
              activeView === "list" ? "block h-[calc(100vh-240px)] overflow-y-auto" : "hidden lg:block"
            }`}
          >
            <BranchList
              branches={filteredBranches}
              selectedBranch={selectedBranch}
              onBranchSelect={handleBranchSelect}
              onBranchDetails={handleOpenDetails}
              onGetDirections={handleGetDirections}
              isLoading={isLoading}
            />
          </div>

          {/* Map View */}
          <div
            className={`lg:col-span-3 lg:h-full ${
              activeView === "map" ? "block h-[calc(100vh-240px)]" : "hidden lg:block"
            }`}
          >
            <MapView
              branches={filteredBranches}
              selectedBranch={selectedBranch}
              onBranchSelect={handleBranchSelect}
              userLocation={userLocation}
              onDirectionsReady={handleDirectionsReady}
              onPopupDirectionsClick={handleGetDirections}
              onMapError={handleMapError}
            />
          </div>
        </div>
      </main>

      {/* Branch Detail Panel */}
      {showDetailPanel && (
        <BranchDetailPanel
          branch={selectedBranch}
          onClose={handleCloseDetails}
          userLocation={userLocation}
          onGetDirections={handleGetDirections}
        />
      )}

      {/* Articles Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-[5%] bg-warm-white">
        <div className="max-w-350 mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="font-(family-name:--font-playfair) text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-midnight mb-4 tracking-tight leading-[1.1]">
              Banking Resources
            </h2>
            <p className="text-slate text-[1.1rem] max-w-2xl mx-auto font-light leading-relaxed">
              Expert insights and guides to help you make smarter financial decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
            {/* Article 1 */}
            <article className="bg-cream rounded-[25px] overflow-hidden transition-all duration-400 ease-in-out hover:-translate-y-2.5 hover:shadow-[0_30px_60px_rgba(10,22,40,0.15)]">
              <div className="h-62.5 relative">
                <Image
                  src="/photo-1486406146926-c627a92ad1ab.jpeg"
                  alt="Personal Finance"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span className="absolute top-6 left-6 bg-gold text-midnight px-5 py-2 rounded-[20px] text-[0.85rem] font-semibold uppercase tracking-[0.5px] z-10">
                  Personal Finance
                </span>
              </div>
              <div className="p-6 sm:p-8 lg:p-10 flex flex-col">
                <div className="flex gap-4 sm:gap-6 mb-4 sm:mb-6 text-[0.9rem] text-slate">
                  <span>December 8, 2024</span>
                  <span>5 min read</span>
                </div>
                <h3 className="font-(family-name:--font-playfair) text-[1.8rem] font-semibold text-midnight mb-4 leading-[1.3]">
                  Building Your Emergency Fund
                </h3>
                <p className="text-slate leading-[1.8] mb-8 font-light flex-1">
                  Learn how to build a safety net that protects you from unexpected expenses and financial emergencies.
                </p>
                <a href="#" className="text-gold font-medium inline-flex items-center gap-2 transition-all duration-300 hover:gap-4">
                  Read More →
                </a>
              </div>
            </article>

            {/* Article 2 */}
            <article className="bg-cream rounded-[25px] overflow-hidden transition-all duration-400 ease-in-out hover:-translate-y-2.5 hover:shadow-[0_30px_60px_rgba(10,22,40,0.15)]">
              <div className="h-62.5 relative">
                <Image
                  src="/photo-1551135049-8a33b5883817.jpeg"
                  alt="Investing"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span className="absolute top-6 left-6 bg-gold text-midnight px-5 py-2 rounded-[20px] text-[0.85rem] font-semibold uppercase tracking-[0.5px] z-10">
                  Investing
                </span>
              </div>
              <div className="p-6 sm:p-8 lg:p-10 flex flex-col">
                <div className="flex gap-4 sm:gap-6 mb-4 sm:mb-6 text-[0.9rem] text-slate">
                  <span>December 5, 2024</span>
                  <span>8 min read</span>
                </div>
                <h3 className="font-(family-name:--font-playfair) text-[1.8rem] font-semibold text-midnight mb-4 leading-[1.3]">
                  Diversification Strategies for 2025
                </h3>
                <p className="text-slate leading-[1.8] mb-8 font-light flex-1">
                  Navigate market volatility with smart diversification and balanced asset allocation strategies.
                </p>
                <a href="#" className="text-gold font-medium inline-flex items-center gap-2 transition-all duration-300 hover:gap-4">
                  Read More →
                </a>
              </div>
            </article>

            {/* Article 3 */}
            <article className="bg-cream rounded-[25px] overflow-hidden transition-all duration-400 ease-in-out hover:-translate-y-2.5 hover:shadow-[0_30px_60px_rgba(10,22,40,0.15)]">
              <div className="h-62.5 relative">
                <Image
                  src="/photo-1559526324-4b87b5e36e44.jpeg"
                  alt="Business"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span className="absolute top-6 left-6 bg-gold text-midnight px-5 py-2 rounded-[20px] text-[0.85rem] font-semibold uppercase tracking-[0.5px] z-10">
                  Business
                </span>
              </div>
              <div className="p-6 sm:p-8 lg:p-10 flex flex-col">
                <div className="flex gap-4 sm:gap-6 mb-4 sm:mb-6 text-[0.9rem] text-slate">
                  <span>December 3, 2024</span>
                  <span>6 min read</span>
                </div>
                <h3 className="font-(family-name:--font-playfair) text-[1.8rem] font-semibold text-midnight mb-4 leading-[1.3]">
                  Cash Flow Management for Small Businesses
                </h3>
                <p className="text-slate leading-[1.8] mb-8 font-light flex-1">
                  Master the art of cash flow management with proven techniques for business growth.
                </p>
                <a href="#" className="text-gold font-medium inline-flex items-center gap-2 transition-all duration-300 hover:gap-4">
                  Read More →
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Newsletter Section - Stay Informed */}
      <section className="py-16 sm:py-20 lg:py-24 px-[5%] bg-cream">
        <div className="max-w-175 mx-auto text-center">
          <h2 className="font-(family-name:--font-playfair) text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-midnight mb-6 tracking-tight leading-[1.1]">
            Stay Informed
          </h2>
          <p className="text-slate text-[1.1rem] mb-10 font-light leading-relaxed">
            Subscribe to our newsletter for weekly financial insights, market updates, and exclusive banking tips delivered to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-125 mx-auto" suppressHydrationWarning>
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 px-6 py-4 border-2 border-midnight rounded-[50px] font-(family-name:--font-jost) text-base outline-none transition-all duration-300 focus:border-gold focus:shadow-[0_0_0_4px_rgba(212,175,55,0.1)]"
              required
              suppressHydrationWarning
            />
            <button
              type="submit"
              className="px-8 py-4 bg-gold text-midnight rounded-[50px] font-medium text-base transition-all duration-300 hover:bg-midnight hover:text-warm-white whitespace-nowrap"
              suppressHydrationWarning
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-midnight text-cream py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm opacity-80">
              &copy; 2024 Brightstream Bank. All rights reserved. Member FDIC.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-gold transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-gold transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-gold transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
