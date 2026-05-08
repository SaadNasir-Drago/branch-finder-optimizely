# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `branch-finder/`:

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite is configured.

## Environment Variables

Copy `branch-finder/.env.example` to `branch-finder/.env.local` and fill in real values:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://cg.optimizely.com/content/v2?auth=<TOKEN>
```

Both are required. `useBranches.ts` throws if `NEXT_PUBLIC_GRAPHQL_ENDPOINT` is unset; `MapView` renders an error state if `NEXT_PUBLIC_MAPBOX_TOKEN` is missing. Never commit the real token — `.env*` is gitignored.

## Architecture

This is a single-page Next.js 16 App Router app. All logic lives in `branch-finder/src/`.

**Data flow:**
- `useBranches.ts` fetches all ~1,000 branches on mount via batched parallel GraphQL requests (3 concurrent, 100/batch) to Optimizely Graph. No server-side fetching — everything is client-side. Uses raw `fetch` against the Graph endpoint (no Apollo client).
- The Optimizely Graph API has no search/filter capability, so all filtering, sorting, and search happens client-side in `lib/utils.ts` (search matches Name/City/Street/Country/ZipCode; sort by `name | city | country | distance`).
- Branch coordinates come from the API as comma-separated strings (`"lat,lng"`) and are parsed in `transformBranch()`.
- Distance uses the Haversine formula in `calculateDistance()` and is returned in **kilometers** (not miles); `addDistanceToBranches()` adds a `distance` field used by the `distance` sort and the "Find Nearest" flow.
- `useGeolocation` (in `src/hooks/`) wraps `navigator.geolocation` and is gated on `isSupported` so SSR/unsupported browsers don't blow up.
- `page.tsx` is the state coordinator — it holds all filter/sort/selection state and passes handlers down to components. It must be wrapped in `<Suspense>` because it calls `useSearchParams()` (Next 16 requirement).

**Map:**
- `MapView.tsx` is dynamically imported (`ssr: false`) to avoid Mapbox SSR issues.
- Markers are stored in a `Map<branchId, Marker>` ref for stable references across re-renders; only markers whose selection state changes are updated.
- Directions (turn-by-turn) use `@mapbox/mapbox-gl-directions`. The handler is lifted up to `page.tsx` via `onDirectionsReady` callback so `BranchCard` can trigger directions without direct MapView access.

**URL state:** Search query, country/city filters, and selected branch ID are synced to URL params (`?q=`, `?country=`, `?city=`, `?branch=`) for shareable links. URL writes go through `router.replace(...)` with `scroll: false` to avoid scroll jumps on every keystroke.

**Responsive layout:** Mobile shows a list/map toggle. Desktop shows a 40/60 split (`lg:grid-cols-5`, list takes 2 cols, map takes 3).

## Design System

Defined as Tailwind v4 CSS custom properties in `src/app/globals.css`. Key tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `midnight` | `#0a1628` | Primary dark, text |
| `navy` | `#1a2942` | Secondary dark |
| `deep-teal` | `#0d4d56` | Gradient accent |
| `gold` | `#d4af37` | CTAs, accents |
| `cream` | `#f8f6f1` | Card backgrounds |
| `warm-white` | near-white | Page background |

Fonts: Playfair Display (headings), Jost (body) — loaded via `layout.tsx`.

## Key Constraints

- **No SSR for MapView** — always use `dynamic(() => import(...), { ssr: false })` for any Mapbox component.
- **Coordinates are strings in the API** — always go through `parseCoordinates()` / `transformBranch()` in `lib/utils.ts`; never access `raw.Coordinates` directly as numbers. Branches with unparseable coordinates are silently dropped by `transformBranch()` (returns `null`).
- **No persistent cache** — branch data lives only in React state for the session; page refresh re-fetches everything.
- **Branch markers use Mapbox GL's built-in clustering** via a GeoJSON source (`cluster: true`, `clusterRadius: 50`, `clusterMaxZoom: 6`) with three layers (cluster circles, cluster count labels, unclustered points). Selection styling uses `feature-state` rather than per-DOM-node mutation.
- **Mapbox Directions UI is custom-styled** via `src/styles/mapbox-directions-custom.css`, which overrides the default `@mapbox/mapbox-gl-directions` panel styles to match the brand.
- **Geolocation is opt-in.** Distance/the `distance` sort only work after the user clicks "Use My Location" — don't assume `userLocation` is set. `useGeolocation.isSupported` must be checked before showing geolocation UI to avoid SSR/hydration mismatches (see the `isMounted` gate in `page.tsx`).
- **No tests.** `npm test` does not exist; rely on `npm run build` + `npm run lint` and exercising the UI in a browser.
