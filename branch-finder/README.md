# Brightstream Bank - Branch Finder

A web-based branch finder application for Brightstream Bank that helps customers locate their nearest branch from 1,000+ locations worldwide.

## Live Demo

[View Live Application](https://your-deployment-url.vercel.app)

## Overview

This application integrates with Optimizely Graph's GraphQL API to fetch and display branch data with an interactive map interface. The design matches Brightstream Bank's brand aesthetic extracted from provided HTML mockups.

### Key Features

- **Search & Filter**: Search branches by name, city, or address. Filter by country.
- **Interactive Map**: Mapbox-powered map with custom-styled markers and clustering.
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices.
- **Real-time Loading**: Progressive loading indicator while fetching 1,000 branches.
- **Branch Details**: View contact information, address, and location on map.

## Technologies Used

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom Brightstream design tokens
- **Map**: Mapbox GL JS
- **Data**: GraphQL (Optimizely Graph API)
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites

- Node.js 18+
- Mapbox account (free tier available at [mapbox.com](https://mapbox.com))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/branch-finder.git
cd branch-finder
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Add your Mapbox access token to `.env.local`:
```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout with fonts
│   ├── page.tsx        # Main branch finder page
│   └── globals.css     # Brightstream design tokens
├── components/
│   ├── Header.tsx      # Navigation bar
│   ├── SearchBar.tsx   # Search input + country filter
│   ├── BranchCard.tsx  # Individual branch card
│   ├── BranchList.tsx  # Scrollable branch list
│   ├── MapView.tsx     # Mapbox map with markers
│   └── useBranches.ts  # Data fetching hook
├── lib/
│   └── utils.ts        # Utility functions
└── types/
    └── branch.ts       # TypeScript interfaces
```

## Approach & Decisions

### 1. Design System Extraction
- Analyzed provided HTML mockups (home.html, articles.html)
- Extracted color palette, typography (Playfair Display + Jost), spacing, and component patterns
- Implemented as CSS custom properties for consistency

### 2. Data Fetching Strategy
- **Client-side fetching**: All 1,000 branches loaded on initial page load
- **Parallel batch requests**: Fetches data in groups of 3 parallel requests for speed
- **Progressive loading**: Shows loading progress as batches complete
- **Client-side filtering**: Instant search/filter without additional API calls

### 3. Map Integration
- Used Mapbox GL JS for professional map rendering
- Custom markers styled to match Brightstream brand (gold/midnight colors)
- Fly-to animation when selecting branches
- Popup displays branch details on marker click

### 4. Responsive Design
- Desktop: Side-by-side list + map layout
- Mobile: Toggle between list and map views
- Touch-friendly interactions throughout

### 5. Performance Optimizations
- Dynamic import for MapView to avoid SSR issues
- Memoized filtering with useMemo
- Debounced search input (300ms)

## API Integration

### Optimizely Graph
- **Endpoint**: `https://cg.optimizely.com/content/v2`
- **Authentication**: Single-key auth via URL parameter
- **Query Type**: Branch
- **Pagination**: 100 items per request, 10 requests total

### Available Branch Fields
- Name, Street, City, Country, CountryCode, ZipCode
- Coordinates (lat/lng as comma-separated string)
- Phone, Email

## Known Limitations

1. **No opening hours**: The API doesn't provide branch operating hours
2. **No services list**: Branch services/amenities not available in schema
3. **Coordinate parsing**: Coordinates come as strings and need parsing

## Future Improvements

With more time, these features could be added:

- [ ] Geolocation "Find nearest branch" button
- [ ] Distance calculation and sorting by proximity
- [ ] Branch detail modal with directions integration
- [ ] URL parameters for shareable filtered results
- [ ] Marker clustering for dense areas
- [ ] Keyboard navigation improvements
- [ ] Unit and integration tests

## Build & Deploy

### Production Build
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel
```

Remember to add `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel's environment variables.

## License

This project was created as a technical assessment for Optimizely.

---

Built with Next.js, Tailwind CSS, and Mapbox
