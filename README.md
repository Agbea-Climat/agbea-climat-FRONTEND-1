# AGBÉA CLIMAT

**AGBÉA CLIMAT** is a climate intelligence platform that turns NASA Earth observation data into clear, actionable environmental information for communities, farmers, researchers, and local decision-makers across Togo's five regions (**Savanes**, **Kara**, **Centrale**, **Plateaux**, and **Maritime**).

---

## Features & Pages

- **Home (`/`)**: Bilingual (**Français** / **English**) entry point with profile onboarding (*"Vous êtes… ?"*), region selector, NASA regional highlights, and a 5-region overview map.
- **Interactive Map (`/carte`)**: Leaflet map centered on Togo with NASA GIBS overlays and NASA POWER observations for **Rainfall**, **Greenness (Vegetation & Soil Moisture)**, **Land Surface Temperature**, and **Elevation**, plus coordinate lookup, 12-month trend charts, and indicator explanations.
- **Before / After Comparison (`/comparer`)**: Side-by-side split slider map and multi-year numerical comparison between two time periods.
- **Agriculture / Public Mode (`/grand-public`)**: Plain-language seasonal overview (rainy vs. dry season, rainfall and vegetation status, practical crop tips, and official forecast disclaimer).
- **Scientific Mode (`/scientifique`)**: 12/24-month time series vs. 2020–2024 baseline, multi-year comparisons, **CSV export**, and dataset resolution/limitation metadata.
- **AGBÉA Assistant (`/assistant`)**: Grounded Q&A over regional NASA observations with inline charts and clickable dataset citations *(Voice input is currently marked **In development**; Ewe language support is marked **Planned**)*.
- **Data Sources & About (`/a-propos`)**: Documentation of NASA datasets (**GPM IMERG / POWER Precipitation**, **MODIS Terra NDVI**, **MODIS Terra LST**, **SRTM Elevation**).

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Leaflet, Recharts, Lucide Icons
- **Backend / Dev Server**: Express (Node.js 22+, TypeScript via `tsx` in development and native TypeScript execution in production)
- **Data Sources**:
  - [NASA POWER API](https://power.larc.nasa.gov/) (`PRECTOTCORR`, `GWETROOT`, `TS`)
  - [NASA GIBS WMTS](https://wiki.earthdata.nasa.gov/display/GIBS) (`IMERG_Precipitation_Rate`, `MODIS_Terra_NDVI_8Day`, `MODIS_Terra_Land_Surface_Temp_Day`)

---

## Project Structure

```text
├── public/assets/           # Brand logo & static assets
├── src/
│   ├── components/          # Navbar, Footer, TogoLeafletMap, Profile & Dataset modals
│   ├── context/             # Global session, language, region, profile & health state
│   ├── data/                # Togo regions, GeoJSON boundaries, profiles, indicator/dataset catalogs
│   ├── layouts/             # Shared MainLayout shell
│   ├── pages/               # Home, Map, Compare, Public/Agriculture, Scientific, Assistant, About
│   ├── services/            # apiClient, climateApi (/api/v1), and standaloneApi (NASA direct fallback)
│   └── types/               # TypeScript definitions for the /api/v1 contract
├── server.ts                # Optional local/production Express API server (/api/v1/*)
├── vercel.json              # SPA routing rewrites for Vercel static deployment
└── .env.example             # Environment variable template
```

---

## Local Development

### Prerequisites

- **Node.js 22+**
- **npm**

### Install & Run

```bash
npm install
npm run dev
```

This starts the Express + Vite full-stack server on `http://localhost:3000`.

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts local Express + Vite dev server (`server.ts`) on port `3000` |
| `npm run build` | Builds the production frontend bundle into `dist/` |
| `npm run start` | Runs `node server.ts` serving `dist/` and `/api/v1/*` |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |
| `npm run clean` | Removes `dist/` |

---

## Environment Variables

Copy `.env.example` to `.env` if needed:

```env
# Optional: URL of an external /api/v1 backend (defaults to /api/v1)
VITE_API_BASE_URL="/api/v1"

# Optional (server.ts only): API key for server-side assistant & explanations
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# Optional: Hosted application URL
APP_URL="MY_APP_URL"
```

---

## Frontend Deployment (Vercel)

1. Push the repository to GitHub/GitLab/Bitbucket and import it in **Vercel**.
2. Keep the default Vite build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. `vercel.json` handles SPA route rewrites while preserving `/assets/*` and `/api/*`.
4. **No backend required to start**: when `VITE_API_BASE_URL` is unset on Vercel, the frontend automatically detects that no `/api/v1` server is mounted and runs in standalone mode using live NASA POWER & GIBS endpoints directly from the browser alongside `localStorage` session persistence.

### Connecting an External Backend Later

When your team deploys the `/api/v1` backend service:

1. In **Vercel** → **Project Settings** → **Environment Variables**, add:
   ```text
   VITE_API_BASE_URL = https://your-backend-domain.com/api/v1
   ```
2. Redeploy the Vercel project. All calls in `src/services/climateApi.ts` will automatically route to your backend.
