# Brightstream Bank - Branch Finder

Branch finder application for Brightstream Bank's 1,000+ worldwide locations. Integrates with Optimizely Graph (GraphQL) for branch data and Mapbox GL JS for interactive mapping.

## Live Demo

[branch-finder-optimizely.vercel.app](https://branch-finder-optimizely.vercel.app/)

## Setup

```bash
npm install

# Create .env.local:
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://cg.optimizely.com/content/v2?auth=iQEyR1jR1cBG5mnLQoRotCyNmKUgaO0DT5cRbJPKA3oZGGQo

npm run dev
```

Mapbox tokens available at [mapbox.com](https://mapbox.com) (free tier).

## Technologies

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Data:** Optimizely Graph GraphQL API (direct fetch, no Apollo)
- **Maps:** Mapbox GL JS v3, Mapbox Directions API
- **Geolocation:** Browser Geolocation API + Haversine distance calculation

## Approach

### Research
- Explored the Optimizely Graph API via GraphQL Playground to understand the Branch schema, pagination model, and available fields
- Identified that coordinates are stored as comma-separated strings, requiring client-side parsing
- Studied Brightstream's HTML mockups (`home.html`, `articles.html`) to extract the design system

### Design System Extraction
HTML Pulled directly from the Brightstream mockups:
- **Colors:** Midnight `#0a1628`, Navy `#1a2942`, Deep Teal `#0d4d56`, Sage `#8b9d83`, Cream `#f8f6f1`, Gold `#d4af37`
- **Typography:** Playfair Display (headings), Jost (body)
- **Patterns:** Rounded corners, gradient backgrounds, hover lift effects, gold accent CTAs

These were codified as Tailwind design tokens in `globals.css` so every component uses the same system.

### Key Decisions

**Client-side data fetching** — All 1,000 branches load on mount via parallel batch requests. The Optimizely Graph API has no search capability, so client-side filtering provides instant results without round-trips. The dataset is small enough (~100KB) to hold in memory.

**Mapbox over Google Maps/Leaflet** — Better WebGL performance with 1,000+ markers, more styling control to match the brand, built-in Directions API, and a generous free tier.

**Map-based marker management** — Markers stored in a `Map<branchId, Marker>` rather than an array, giving stable references that survive filtering and enabling selective updates (only re-render markers whose selection state changed).

**Mobile: list/map toggle** — On mobile, users toggle between list and map views. On desktop, a 40/60 split view shows both simultaneously.

## Features

**Core:** Search by name/city/address, filter by country and city, sort by name/city/country/distance, responsive design, Brightstream brand styling

**Nice to have (all implemented):** Interactive Mapbox map with custom markers, geolocation (nearest branch), distance badges, turn-by-turn directions, branch detail panel with share, URL state for shareable filtered views

## Project Structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout, font loading
│   ├── page.tsx              # Main page, state coordination
│   └── globals.css           # Tailwind config + design tokens
├── components/
│   ├── Header.tsx            # Navigation bar
│   ├── SearchBar.tsx         # Search, filters, sort controls
│   ├── BranchCard.tsx        # Branch card with actions
│   ├── BranchList.tsx        # Scrollable list container
│   ├── MapView.tsx           # Mapbox map + markers + directions
│   ├── BranchDetailPanel.tsx # Slide-out detail view
│   └── useBranches.ts        # Data fetching hook
├── hooks/
│   └── useGeolocation.ts     # Browser geolocation wrapper
├── lib/
│   └── utils.ts              # Filtering, sorting, distance calc
└── types/
    ├── branch.ts             # Branch interfaces
    └── mapbox-directions.d.ts
```

## Known Limitations

- Initial load takes 2-4 seconds (fetching all branches); trade-off for instant client-side search
- No branch operating hours or services data (not available in the API schema)
- Coordinates stored as strings in the API; parsed client-side on fetch
