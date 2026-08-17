# Apollo AgriVerse — Digital Twin Frontend

A React + Three.js "digital twin" dashboard for a grape (*Vitis vinifera*) farm. It visualizes a
procedurally generated 3D farm at four zoom levels — Farm, Field, Plant, and Soil — alongside a
2D dashboard of weather, soil, hydrogel, mulching, and lifecycle telemetry, plus an independent
365‑day growth simulation driven by live environmental sliders.

> This is a front-end prototype: all telemetry is mocked or randomized locally. There is no
> backend, API, or database — everything runs client-side in the browser, nothing persists
> between page reloads, and every "AI" or "ML" label in the UI (predictions, formula
> recommendations, soil advisor) is static copy, not a model inference.

---

## Table of Contents

1. [Domain Primer](#domain-primer)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Project Structure (active app only)](#project-structure-active-app-only)
5. [Build & Tooling Configuration](#build--tooling-configuration)
6. [Application Shell (`App.tsx`)](#application-shell-apptsx)
7. [The Digital Twin 3D Scene (`DigitalTwinMap.tsx`)](#the-digital-twin-3d-scene-digitaltwinmaptsx)
8. [The Growth Simulator (`SimulationPanel.tsx`)](#the-growth-simulator-simulationpaneltsx)
9. [Dashboard Panels — Full Detail](#dashboard-panels--full-detail)
10. [Shared UI Primitives](#shared-ui-primitives)
11. [Data Models](#data-models)
12. [Design System](#design-system)
13. [Alternate & Legacy Implementations](#alternate--legacy-implementations)
14. [Performance Notes](#performance-notes)
15. [Security & Data-Handling Notes](#security--data-handling-notes)
16. [Known Issues / Housekeeping](#known-issues--housekeeping)
17. [Suggested Next Steps](#suggested-next-steps)
18. [Glossary](#glossary)

---

## Domain Primer

Apollo AgriVerse models a single conceptual vineyard growing **Thompson Seedless** grapes across
four fields (A–D), instrumented with two fictional precision-agriculture technologies that recur
throughout the UI:

- **Intelligent Soil** — simulated NPK (nitrogen/phosphorus/potassium), moisture, pH, electrical
  conductivity (EC), organic matter (OM), and root-zone sensors.
- **Intelligent Hydrogels** — simulated water-absorbing polymer beads buried in the root zone
  that swell when wet and slowly release stored water during dry periods, reducing irrigation
  frequency. The app visualizes them underground in 3D (glowing blue spheres) and tracks a
  saturation percentage in the dashboard.
- **Smart Mulching** — a sensor-integrated plastic film laid over the soil surface that reduces
  evaporation and surface temperature swings; the dashboard compares "with mulch" vs. "without
  mulch" outcomes.

The crop lifecycle used consistently across the 3D twin and the Lifecycle panel is a seven-stage
phenology model: **Germination → Vegetative Growth → Flowering → Fruit Set → Berry Development →
Ripening → Harvest**, mapped onto a simulated day counter (0–150 in the Digital Twin, 0–365 in
the standalone Simulation panel — see [Known Issues](#known-issues--housekeeping) for why these
two clocks disagree).

## Tech Stack

| Layer            | Library                                   | Version |
|-------------------|--------------------------------------------|---------|
| Framework         | React + `react-dom`                        | 19.2.8  |
| Language          | TypeScript                                  | ~6.0    |
| Build tool        | Vite (`@vitejs/plugin-react`)              | 8.2.1 / 6.0.5 |
| Styling           | Tailwind CSS 3 + PostCSS + Autoprefixer     | 3.4.19  |
| 3D rendering      | Three.js (`three`)                          | 0.185.1 |
| Charts            | Recharts                                    | 3.10.1  |
| Icons             | lucide-react                                | 1.30.0  |
| Linting           | oxlint (`react`, `typescript`, `oxc` plugins) | 1.75–1.77 |

No router, state-management library, or component library is used. All state is local React
state (`useState` / `useRef` / `useEffect`); all styling is Tailwind utility classes, many with
arbitrary hex-value colors (e.g. `bg-[#16202d]`) rather than theme tokens.

## Getting Started

```bash
npm install
npm run dev        # start the Vite dev server (HMR)
npm run build       # type-check (tsc -b) and produce a production build in dist/
npm run preview     # serve the production build locally
npm run lint          # run oxlint against src/
```

No environment variables, `.env` file, or backend service is required — the app runs entirely
against in-memory mock data. `npm run build` currently fails type-checking; see
[Known Issues](#known-issues--housekeeping) item 1 before relying on it in CI.

## Project Structure (active app only)

```
index.html                 Vite entry HTML; loads /src/main.tsx as a module script
public/
  favicon.svg               Purple gradient "A" mark used as the browser tab icon
  icons.svg                 Sprite sheet of social/doc icons (bluesky, discord, github, x, …) —
                             not currently referenced by any active component
src/
  main.tsx                  React root; wraps <App /> in <StrictMode> and mounts it
  index.css                 Tailwind directives + global dark theme + custom scrollbar styling
  App.tsx                   App shell: sidebar navigation, top bar, and the panel router;
                             also defines MainDashboard, WeatherPanel, SoilPanel, LifecyclePanel,
                             HydrogelPanel, MulchingPanel, CircularGauge, and PanelHeader inline
  DigitalTwinMap.tsx        Three.js scene: procedural 4-field farm, single grape vine, and a
                             soil diorama, with 4 camera zoom levels and a day/night light rig
  SimulationPanel.tsx        Standalone 3D grape-lifecycle growth simulator driven by 6 sliders
```

Everything else in the repository (`App_before_restore.tsx`, `DigitalTwinMap_before_restore.tsx`,
`apollo_agriverse_digital_twin (1).tsx`, `apollo_agriverse_html_shell.tsx`,
`apollo_agriverse_complete (6).html`, `main.backup.tsx`, `original_map.tsx`, `App.css`,
`replace_app.cjs`, `replace_map.cjs`) is **not** imported by `main.tsx` and is dead weight in the
working tree — see [Alternate & Legacy Implementations](#alternate--legacy-implementations) and
[Known Issues](#known-issues--housekeeping).

## Build & Tooling Configuration

- **`tsconfig.app.json`** explicitly whitelists only four files for type-checking —
  `src/App.tsx`, `src/main.tsx`, `src/DigitalTwinMap.tsx`, `src/SimulationPanel.tsx` — and
  explicitly excludes `apollo_agriverse_digital_twin (1).tsx` and
  `apollo_agriverse_complete (6).html`. This `include`/`exclude` pair is the most reliable way to
  confirm which files are "live," and is used throughout this README to distinguish active code
  from snapshots. Target is `es2023`, module resolution is `bundler`, `jsx: react-jsx`,
  `verbatimModuleSyntax: true`, and `noUnusedLocals`/`noUnusedParameters` are both disabled
  (permissive — dead variables won't fail the build).
- **`tsconfig.node.json`** covers only `vite.config.ts` and is stricter (`noUnusedLocals: true`,
  `noUnusedParameters: true`).
- **`vite.config.ts`** is minimal — just `@vitejs/plugin-react`, no aliases, no env handling, no
  custom asset pipeline. The `apollo_agriverse_html_shell.tsx` legacy file relies on Vite's
  `?raw` import suffix to pull in `apollo_agriverse_complete (6).html` as a string; this works
  out of the box with Vite's default asset handling and needs no extra config.
- **`tailwind.config.js`** uses the stock preset (`content` globbing `index.html` and
  `src/**/*.{js,ts,jsx,tsx}`) with `theme.extend` empty — every custom color in the app is an
  inline arbitrary value (`bg-[#0b131e]`) rather than a named token, which is why the palette
  below has to be reverse-engineered from usage rather than read off a config file.
- **`.oxlintrc.json`** enables the `react`, `typescript`, and `oxc` rule sets with two explicit
  overrides: `react/rules-of-hooks: error` and `react/only-export-components: warn` (allowing
  constant exports). No `typeAware` option is set, so lint runs on syntax only, not full
  type information.
- **`postcss.config.js`** wires `tailwindcss` and `autoprefixer` — nothing bespoke.

## Application Shell (`App.tsx`)

`App.tsx` is the single largest file in the active app and does three jobs: it is the **root
component**, the **panel router**, and the **home** for most of the 2D dashboard panels (only
the 3D-heavy panels live in their own files).

### Layout

```
┌───────────────────────────────────────────────────────────┐
│  Sidebar (w-64, fixed)   │  Main content (flex-1)          │
│  ─────────────────────   │  ┌───────────────────────────┐ │
│  Brand header             │  │ Top utility bar (h-16)     │ │
│  13 nav buttons            │  ├───────────────────────────┤ │
│  Farm-health gauge footer  │  │ Active panel (router body) │ │
│                             │  └───────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

- **Sidebar** (`SIDEBAR_ITEMS`, 13 entries): Digital Twin, Weather Intelligence, Intelligent
  Soil, Grape Lifecycle, Intelligent Hydrogels, Smart Mulching, Predictions, Recommendations,
  Simulation, Analytics, Alerts, Reports, Settings. Each item carries an `id`, a `lucide-react`
  icon, a `label`, and a one-line `sub` description. The active item is highlighted with an
  emerald border/background and its icon and label switch to `text-emerald-400`.
- **Sidebar footer**: a permanently visible "FARM STATUS" block showing a `Heart` icon, the text
  "Healthy", and a `CircularGauge` fixed at `87` — not wired to any live health calculation.
- **Top utility bar**: two static readouts (28 °C, 65 % humidity) and a hard-coded date
  ("20 May 2025") — none of these read from the mock telemetry object; they are literal JSX.
- **Router body**: `activeTab` (default `'twin'`) is a plain `useState<string>`; the JSX renders
  a chain of `{activeTab === 'X' && <Panel/>}` expressions — there is no `<Suspense>`, no code
  splitting per tab, and no URL/hash sync, so refreshing the page always returns to the Digital
  Twin tab regardless of which tab was previously open, and the browser back/forward buttons do
  nothing.

### Panels defined inside `App.tsx`

| Component | Rendered for tab | Summary |
|---|---|---|
| `MainDashboard` | `twin` | Embeds `<DigitalTwinMap />` plus the Key Metrics strip, Quick Actions, Farm Summary, mini Weather Summary, and Recent Alerts feed. |
| `WeatherPanel` | `weather` | Full weather intelligence view. |
| `SoilPanel` | `soil` | Full soil telemetry view. |
| `LifecyclePanel` | `lifecycle` | Full 7-stage phenology view. |
| `HydrogelPanel` | `hydrogels` | Full hydrogel dynamics + "AI" formula view. |
| `MulchingPanel` | `mulching` | Full mulching telemetry + comparison table. |
| `SimulationPanel` (imported) | `simulation` | 365-day 3D growth simulator (own file). |
| `PredictionsPanel`, `RecommendationsPanel`, `AnalyticsPanel`, `AlertsPanel`, `ReportsPanel`, `SettingsPanel` | respective tabs | All six are thin wrappers around the shared `PlaceholderPanel` component — icon, title, and "Component under construction." |

---

## The Digital Twin 3D Scene (`DigitalTwinMap.tsx`)

This is the most complex file in the codebase: a single `useEffect` (empty dependency array)
builds an entire Three.js scene graph on mount and tears it down on unmount; a second
`useEffect` (keyed on `zoomLevel, activeField`) retargets the camera without rebuilding the
scene.

### Props

```ts
interface DigitalTwinMapProps {
  zoomLevel: 0 | 1 | 2 | 3;
  setZoomLevel: (z: 0 | 1 | 2 | 3) => void;
  activeField: string;
  setActiveField: (f: string) => void;
}
```
*(All four are currently marked required — see [Known Issues](#known-issues--housekeeping) for
why this breaks the active call site in `App.tsx`, which renders `<DigitalTwinMap />` with zero
props.)*

### `FIELDS` data

Four hard-coded fields, each with a 3D center, a display color, and mock stats:

| id | name | center (x, z) | health | area | moisture |
|---|---|---|---|---|---|
| A | Field A | (‑30, ‑30) | 88 % | 2.30 Acres | 62 |
| B | Field B | (30, ‑30) | 85 % | 2.45 Acres | 58 |
| C | Field C | (30, 30) | 82 % | 2.15 Acres | 55 |
| D | Field D | (‑30, 30) | 90 % | 2.60 Acres | 68 |

### Scene graph

```
scene
├── hemiLight (THREE.HemisphereLight)
├── dirLight  (THREE.DirectionalLight, shadow-casting, 4096² shadow map)
├── macroGroup   (Farm-scale content — always exists, visibility toggled)
│    ├── 4 × terrain meshes (per field, procedurally ridged PlaneGeometry, 128×128 segments)
│    ├── 4 × 20 mulch-strip meshes (one per crop row per field)
│    └── 1 × THREE.InstancedMesh "instancedCrops" (4 × 20 × 40 = 3,200 instances)
├── mesoGroup    (Single grape-vine close-up — hidden except at zoom level 2)
│    ├── stem mesh (TubeGeometry along a CatmullRomCurve3, 5 control points)
│    ├── 15 × nutrient-flow dot meshes (small cyan spheres, animated along the stem curve)
│    ├── 14 × broad lobed leaf meshes (custom-displaced PlaneGeometry, 15×15 segments)
│    └── 3 × grape-bunch groups (40 grapes each, cone-arranged, positioned along the stem curve)
└── microGroup   (Soil diorama — hidden except at zoom level 3)
     ├── top mulch slab + cyan GridHelper "sensor grid" overlay (8×8, 20 divisions)
     ├── 2 × dirt wall meshes (back + left, forms an open diorama box)
     ├── 15 × procedurally routed root TubeGeometry meshes (recursive random-walk points)
     ├── 40 × glowing hydrogel sphere meshes (emissive blue, individually animated)
     └── 40 × floating dodecahedron "soil rock" meshes
```

### Procedural terrain & mulch rows

For each field, a `128×128` segment `PlaneGeometry` is displaced per-vertex using
`ridge = sin(x·1.5)·0.3` plus a secondary `sin/cos` noise term, then `computeVertexNormals()` is
called so lighting reacts correctly to the fake furrows. Twenty mulch strips per field are
generated the same way, offset to sit on top of each furrow crest, with an additional arch term
(`cos((localX/1.4)·π)·0.1`) so the strip appears to drape over the row rather than float flat.

### Instanced crops

`instancedCrops` is a single `THREE.InstancedMesh` built from a spiked `IcosahedronGeometry`
(stretched vertically and vertex-jittered to look organic). Every one of the 3,200 instances gets
a `THREE.Object3D` "dummy" transform (position/rotation/scale) and an HSL-randomized green color
computed once at scene-build time, then stored in `cropAnimDataRef` for per-frame animation. This
is the single most expensive object in the scene by instance count, but instancing keeps it to
one draw call.

### Per-frame animation loop

A single `requestAnimationFrame` loop (via `THREE.Clock`) does, every frame:
1. **Camera lerp** — `camera.position.lerp(targetCamPos, 0.05)` and a separate `lerp` for the
   look-at target, producing the smooth "flying" transition between zoom levels.
2. **Day/night lighting** — `timeOfDay` (0–24, local `useState`) is mapped to `hourAngle`, which
   drives the directional light's `x`/`y` position, its intensity (`0.5 + daylightStr·2.5`), the
   hemisphere light's intensity, and the scene background color (day `#0a1128` vs. night
   `#030712`).
3. **Macro animation** (only if `macroGroup.visible`): every crop instance gets a sinusoidal sway
   (`sin(time·1.5+phase)`, `cos(time·1.2+phase)`) applied to its position and a matching tilt
   applied to its rotation, then `instancedCrops.instanceMatrix.needsUpdate = true`.
4. **Meso animation** (only if visible): each leaf's rotation oscillates independently by phase;
   each nutrient-flow dot advances a `progress` value along the stem's `CatmullRomCurve3` and
   orbits slightly around it — a decorative visualization of water/nutrient uptake, not tied to
   any real simulated quantity.
5. **Micro animation** (only if visible): each hydrogel sphere bobs vertically and pulses in
   scale via `sin(time·4+phase)` — a constant idle pulse, not reactive to soil moisture data.

### Zoom levels

| Level | Label | Camera behavior | Visible groups |
|---|---|---|---|
| 0 | Farm View | Wide orbit at `(90, 80, 90)` looking at the origin | macro |
| 1 | Field View | Offset `(+15, 12, +15)` from the active field's center, looking at that field | macro |
| 2 | Plant View | Close orbit `(‑5, 4.5, +7)` relative to the field center | macro + meso (meso group repositioned to the field center) |
| 3 | Soil View | Below-ground camera `(‑10, ‑1.0, +9)` relative to the field, looking down at `y=‑2.5` | micro only (macro & meso hidden; micro group repositioned to the field center) |

### On-screen (non-3D) overlay

- **Top-right pill nav** — four buttons (Farm / Field / Plant / Soil View) that call
  `setZoomLevel`.
- **Simulated Time card** (top-right, below the nav) — a `0–24` range input bound to local
  `timeOfDay` state, labeled "`HH:00 HRS`".
- **Field markers** — rendered only when `zoomLevel === 0`; one absolutely-positioned button per
  field, projected from 3D `field.center` to 2D screen space with a fixed linear scale
  (`x·2.5px`, `z·1.5px` offset from the container's center — **not** a true 3D→2D camera
  projection, so marker alignment will drift if the camera framing changes). Hovering reveals the
  field's name and health percentage; clicking sets `activeField` and jumps to zoom level 1.

---

## The Growth Simulator (`SimulationPanel.tsx`)

A self-contained page (no props) with its **own independent Three.js scene** — it does not share
a renderer, camera, or any state with `DigitalTwinMap`. Conceptually this is a second, smaller
digital twin: one vine, six sliders, and a much longer (365-day) timeline.

### State

```ts
isPlaying: boolean                         // default true
simulationDay: number                      // 0–365, default 0
envParams: { temp, humidity, rainfall, solar, wind, co2 }
soilParams: { ph, ec, om, n, p, k }
```

Note that `humidity`, `wind`, `co2`, `ec`, and `om` are tracked in state and displayed nowhere —
only `temp`, `rainfall`, `solar` (env) and `ph`, `n`, `p` (soil) have UI sliders and feed the
growth model.

### Layout

- **Left column** — two cards of `CustomSlider` controls:
  - *Atmospheric Stimulants*: Temperature (10–45 °C), Rainfall/Irrigation (0–200 mm), Solar
    Radiation (0–1200 W/m²), each with a colored `lucide-react` icon and a live numeric readout.
  - *Soil & Nutrient Settings*: Nitrogen (0–200 kg/ha), Phosphorus (0–100 kg/ha), Soil pH
    (4.0–9.0).
  - A callout box explicitly suggests: *"Push Temperature above 35 °C and drop Rainfall below
    10 mm to watch the 3D plant wilt and turn yellow in real time."*
- **Right column** — the 3D viewport (auto-rotating vine) with two floating overlay cards
  (Growth Stage, Yield Prediction) and a bottom timeline scrubber with a play/pause button.

### 3D content

A single vine is built once: a `CylinderGeometry` stem (origin-shifted to grow from its base), 40
flat leaf `PlaneGeometry` meshes scattered around it (each **cloned** material so per-leaf color
can be animated independently), and 30 grape `SphereGeometry` meshes. Everything starts at
`scale = 0`. The whole group spins slowly (`rotation.y += 0.005`/frame) so the viewer can see all
sides without any mouse/orbit control being wired up.

### Growth engine

Two effects drive the simulation:

1. **Day advancement** — while `isPlaying`, a `setInterval(…, 50ms)` increments `simulationDay`
   by 1 each tick (looping back to 0 after day 365), i.e. roughly **18 seconds per simulated
   year**.
2. **Growth/stress application** — a second effect re-runs whenever `simulationDay`,
   `envParams`, or `soilParams` change, and:
   - Computes a `stress` scalar (0–1) from simple threshold rules: `temp > 35` or `temp < 15`
     each add penalty proportional to the overshoot; `rainfall < 10` adds a flat `+0.4`;
     `nitrogen < 30` adds a flat `+0.3`; the total is clamped to `[0, 1]`.
   - **Stem**: scales up to full height by day 100, then shrinks by `stress·0.3`.
   - **Leaves**: staggered growth between day 30–150 (`leafGrowthPhase`), staggered die-off after
     day 300 (`leafDeathPhase`); leaf color is set per-frame — green when healthy, yellow
     (`#eab308`) once `stress > 0.5`, brown (`#a16207`) once `leafDeathPhase > 0`; leaves also
     visually droop (`rotation.x = stress·π/2`).
   - **Grapes**: only appear in the fruiting window (day 120–250); scale multiplied by
     `1 − stress·0.4`; grapes fully hide if `stress > 0.8`; color shifts unripe green
     (`#84cc16`) → ripe purple (`#6b21a8`) once `fruitPhase ≥ 0.7`.
- The overlay **Growth Stage** card derives its label purely from `simulationDay` thresholds:
  `<30` Germination, `<120` Vegetative Growth, `<250` Fruiting & Ripening, else Harvest/Dormancy
  — a coarser four-bucket version of the seven-stage model used elsewhere in the app.
- The overlay **Yield Prediction** card is a simple boolean readout: *"Low (Stressed)"* if
  `temp > 35 OR nitrogen < 30`, else *"High (Optimal)"* — not a numeric prediction and not
  connected to the `expectedYield` figures shown elsewhere in the dashboard.

---

## Dashboard Panels — Full Detail

All panels below live in `App.tsx` and share the `PanelHeader` component for their title bar.

### `MainDashboard` (Digital Twin tab body)

- **3D map area** — `<DigitalTwinMap />` filling the available space (note: rendered with no
  props; see Known Issues).
- **Key Metrics strip** (6 cards): Soil Health Score (78/100), Crop Health Index (87 %), Water
  Use Efficiency (2.6 kg/m³), Yield Prediction (4.8 tons/acre), Hydrogel Efficiency (73 %), Mulch
  Efficiency (85 %) — all static values from `MOCK_TELEMETRY`.
- **Quick Actions** (5 icon buttons, non-functional): Run Simulation, Irrigation Plan, Nutrient
  Advisor, View Alerts (with a red "3" badge), Generate Report.
- **Farm Summary card** (right column): 9 rows — Total Area (9.50 Acres), Total Plants (4,320),
  Active Fields (4), Grape Variety (Thompson Seedless), Average Soil Moisture (62 %), Crop Health
  Index (87 %), Water Availability (Good), Next Irrigation (Not Required), Rainfall Forecast 3d
  (18 mm) — plus a non-functional "View Full Summary" button. (Note the 9.50-acre total here
  disagrees with the 25.6-acre figure quoted elsewhere in the codebase's alternate
  implementations — see [Known Issues](#known-issues--housekeeping).)
- **Mini Weather Summary card**: current temp/condition, min/max, a 3-stat row
  (rainfall/humidity/wind), and a hand-rolled 7-day rainfall mini bar-chart (plain `<div>` bars
  sized with inline `style={{height}}`, not a Recharts component) — plus a non-functional "View
  Weather Intelligence" button.
- **Recent Alerts card**: 3 static alert rows (high temperature, low nitrogen in Zone B2,
  rainfall expected) with relative timestamps and a field tag.

### `WeatherPanel`

- Current-conditions card: temperature, condition text, and a 2×2 grid of Humidity / Wind Speed /
  UV Index / Evapotranspiration.
- 7-day forecast `ComposedChart` (Recharts) — grouped bar (rainfall, left axis) + line
  (temperature, right axis) over `FORECAST_DATA` (7 fixed day/rain/temp tuples).
- "Weather Impact on Farm Ecosystem" — two callout cards: a green "no irrigation required" card
  and a blue "rainfall expected in 18 hours" card referencing hydrogel capacity.

### `SoilPanel`

- Macronutrient Status: four `CircularGauge`s (Nitrogen, Phosphorus, Potassium, Moisture) with
  color-coded sub-labels (Adequate/Low/Optimal).
- "AI Soil Advisor" card: three fixed bullet rows (Needs / Enough / Excess) plus an "Action"
  callout ("Monitor moisture. No irrigation needed.").
- Detailed Soil Parameters table (Zone B‑4): 8 metric cards — Soil Moisture, Temperature,
  Electrical Conductivity, Organic Matter, Root Zone Moisture, Soil pH, Microbial Activity, Soil
  Type — each with a status tag.

### `LifecyclePanel`

- Left rail: 7-stage timeline (Germination → Harvesting) with day ranges; the active stage
  ("Flowering", stage 3 of 7) is highlighted, all others rendered at 50 % opacity.
- Main card: current stage headline, day-in-stage progress, a 2-column grid of Stage Requirements
  (temperature/moisture/sunlight targets) and Time Remaining (6 days, static), plus a decorative
  right-hand panel with a dotted background and a `Sprout` icon badge reading *"Vitis vinifera
  L."*
- "Stage Impact & Benefits": three cards — Better Pollination, Higher Fruit Set (both positive,
  full opacity), and Fungal Risk (negative, rendered at 50 % opacity to indicate it is currently
  inactive).

### `HydrogelPanel`

- Hydrogel Status card: a saturation `CircularGauge` plus a stat list (Capacity 850 mL, Stored
  Water 620 mL, Release Rate 18 mL/hr, Est. Remaining 34 hrs).
- Water Dynamics `AreaChart` (Recharts) over 7 days of **randomly generated** absorbed/released
  volumes (`HYDROGEL_DATA`, regenerated on every mount via `Math.random()`).
- Irrigation Recommendation banner ("NO IRRIGATION REQUIRED").
- "Hydrogel Optimization Lab" card: two static stat tiles plus a non-functional "RUN FORMULA
  OPTIMIZER" button.
- "AI Formula Adjustment" card: two mock recommendation rows (cross-linker %, base polymer %)
  each with a projected benefit, plus a free-text rationale paragraph. This same copy
  ("increasing MBA cross-linking density…extends moisture release duration by 14.5 hours") is
  duplicated near-verbatim in the legacy standalone HTML prototype's "Hydrogel Optimizer Lab"
  modal — see [Alternate Implementations](#alternate--legacy-implementations).

### `MulchingPanel`

- Mulch Coverage `CircularGauge` plus Mulch Type (Silver-Black Film) / Condition (Good).
- Mulch Impact Metrics: 4-row stat list (Surface Temp, Surface Moisture, Evaporation Reduced,
  Water Saved).
- With/Without comparison `<table>`: Soil Temp, Evaporation, Soil Moisture, Irrigation Need —
  each row shows the "without mulch" baseline, the "with mulch" value, and a delta with an
  up/down arrow icon.

### Placeholder panels

`PredictionsPanel`, `RecommendationsPanel`, `AnalyticsPanel`, `AlertsPanel`, `ReportsPanel`,
`SettingsPanel` are one-line wrappers around `PlaceholderPanel`, which renders `PanelHeader` plus
a dashed-border empty state (large faded icon + "`{title} Module`" + "Component under
construction.").

---

## Shared UI Primitives

- **`CircularGauge({ value, label, subLabel, color })`** — an SVG ring (radius 36, computed
  `strokeDasharray`/`strokeDashoffset`) with a CSS `transition-all duration-1000` for smooth
  value changes, a centered percentage readout, and an optional colored sub-label underneath.
  Used in the sidebar footer and every telemetry panel.
- **`PanelHeader({ title, icon, subtitle })`** — a consistent header row: icon badge + title +
  optional subtitle on the left, a pulsing "Simulation Active" pill on the right. Used by every
  full-page panel except `MainDashboard`.
- **`PlaceholderPanel({ title, icon, subtitle })`** — see above.
- **`CustomSlider` (in `SimulationPanel.tsx`)** — a labeled range input with an icon, a live
  value/unit readout, and min/max end labels; the accent color is derived from a Tailwind class
  string split (`colorClass.split('-')[1]`), which is a fragile pattern worth hardening if more
  colors are added (it silently breaks for any color class not shaped like `text-{name}-{shade}`).

---

## Data Models

### `MOCK_TELEMETRY` (`App.tsx`)

```ts
{
  currentDay: 12, totalDays: 30,
  weather: { temp, humidity, rainfall24h, wind, et, uv, forecastRain },
  soil:    { moisture, n, p, k, ph, temp, ec, om, rzMoisture },
  hydrogel:{ capacity, stored, saturation, releaseRate, estRemaining },
  mulch:   { coverage, surfaceTemp, surfaceMoisture, evaporationReduced, waterSaved },
  crop:    { stage, dayInStage, totalStageDays, health, expectedYield }
}
```
A single flat object read by `MainDashboard`, `WeatherPanel`, `SoilPanel`, `HydrogelPanel`, and
`MulchingPanel`. It never changes at runtime — there is no setter, timer, or event that mutates
it, so every numeric readout across the dashboard is effectively a hard-coded constant dressed up
as live telemetry. `currentDay`/`totalDays` (12/30) are also never displayed and don't correspond
to either the 150-day Digital Twin clock or the 365-day Simulation clock.

### `FORECAST_DATA`, `HYDROGEL_DATA` (`App.tsx`)

Chart-only datasets. `FORECAST_DATA` is a fixed 7-entry array (day/rain/temp). `HYDROGEL_DATA` is
generated fresh on every component mount via `Array.from({length:7}).map(() => ({..
Math.random()..}))` — meaning the Hydrogel panel's chart literally re-randomizes every time the
user navigates away and back.

### `FIELDS` (`DigitalTwinMap.tsx`)

See the [Digital Twin](#the-digital-twin-3d-scene-digitaltwinmaptsx) section above.

---

## Design System

- **Palette**: near-black page background `#060B12`; card surfaces `#16202d` / `#0f1722`;
  borders `#1e2d40`. Emerald (`emerald-400`/`500`) is the primary "healthy/positive" accent;
  cyan/blue for water-related data; amber/rose for warnings and deficits; purple for AI/ML
  callouts; `#CFB53B` (old-gold) is used as a secondary accent in some of the legacy/alternate
  layouts for the zoom-level pill controls.
- **Typography**: default Tailwind sans stack; panel titles are `uppercase tracking-wide`;
  numeric readouts favor `font-light` at large sizes for a dashboard feel; small metadata uses
  `font-mono` (e.g. gauge percentages, chart tooltips).
- **Cards**: consistently `rounded-xl border border-[#1e2d40] shadow-lg` on a `#16202d`
  background — this pattern is repeated by hand in dozens of places rather than extracted into a
  `<Card>` component.
- **Scrollbars**: `.custom-scrollbar` (defined in `index.css`) gives a thin, dark, rounded
  WebKit scrollbar used on the sidebar-adjacent summary column and any panel with vertical
  overflow.
- **No component library** — every card, gauge, table, and button is bespoke Tailwind + JSX;
  `recharts` and `lucide-react` are the only visual dependencies beyond Tailwind itself.

---

## Alternate & Legacy Implementations

The repository contains three complete, independent re-implementations of the same product
concept, none of which are wired into `main.tsx`. They are useful as design references but should
not be edited as if they were live.

### `apollo_agriverse_digital_twin (1).tsx`

A single ~700-line file containing an entire alternate app (`export default function App()`),
including its own Three.js scene distinct from `DigitalTwinMap.tsx`. Notable differences from the
active twin:
- A particle-based **rain system** (`THREE.LineSegments` of 4,000 streak segments) with opacity
  driven by the selected weather mode (`sun` / `normal` / `rain`), plus matching background/fog
  color shifts and a `terrainMat.clearcoat` change to simulate wet soil.
- A **farm-wide underground hydrogel field** rendered as a 12,000-instance `InstancedMesh`
  (`farmGels`), scaled each frame by a shared `gelSatRef` multiplier so the whole field visibly
  swells or shrinks together — a much larger-scale version of the 40 individual hydrogel spheres
  used in the active `DigitalTwinMap`'s micro view.
- **Stage-accurate per-plant instancing**: rather than one static crop mesh, each of the 720
  simulated plants gets four separate `InstancedMesh` layers (seed, stem, flower, grape) whose
  per-instance scale is driven by the simulated day, so plants visibly progress through
  germination → vegetative → flowering → fruiting → ripening as the simulation clock advances,
  purely at the macro (whole-farm) zoom level.
- A trellis system with wooden posts (`CylinderGeometry`) and wire lines, plus a translucent soil
  material so the underground hydrogel field is visible from above.
- Its own tabbed layout (`NAV_ITEMS`, 12 entries) mirroring the active sidebar, with panels for
  Weather, Grape Lifecycle, and an "Intelligent Hydrogels Lab" (Bayesian-optimization framing,
  functionally identical copy to the active `HydrogelPanel`'s AI Formula Adjustment card).

### `apollo_agriverse_html_shell.tsx` + `apollo_agriverse_complete (6).html`

A **third**, entirely non-React implementation: a self-contained HTML document (Tailwind CDN,
Three.js r128 via `<script>` tag, Chart.js for the moisture chart, `lucide` for icons) totalling
roughly 900 lines of inline `<script>`. `apollo_agriverse_html_shell.tsx` imports this file as a
raw string (`import completeExperience from './apollo_agriverse_complete (6).html?raw'`) and
renders it inside an `<iframe srcDoc={completeExperience}>`, then layers a React "panel menu"
sidebar and modal-style detail panels on top of the iframe using static `PANEL_CONTENT` copy.
Key implementation differences from the active app:
- Uses vanilla `THREE.Points` for rain instead of line segments.
- Drives its own DOM directly (`document.getElementById(...).innerText = ...`) inside a global
  `setInterval` simulation loop, rather than React state/props.
- Includes a "Hydrogel Optimizer Lab" `<div id="formula-modal">` with the same AI-recommendation
  copy that appears in the active `HydrogelPanel` and in `apollo_agriverse_digital_twin (1).tsx`,
  suggesting this HTML file was the original prototype the two React versions were built from.
- Ships its own translucent-soil / underground-hydrogel visualization (15,000-instance
  `farmGels` mesh) — the largest hydrogel particle count of the three implementations.

### `App_before_restore.tsx` + `DigitalTwinMap_before_restore.tsx`

A more advanced draft of the *active* React implementation, showing the direction development was
heading before being reverted:
- `DigitalTwinMap` accepts **optional, controlled-or-uncontrolled** props
  (`zoomLevel?`, `weather?`, `simulationDay?`, etc.) with internal `useState` fallbacks — this is
  the fix that would resolve the required-props/no-props mismatch described in
  [Known Issues](#known-issues--housekeeping).
- `App.tsx` lifts `zoomLevel`, `weather`, and `simulationDay` into shared state and passes them
  into `DigitalTwinMap`, plus a **daily hypothetical weather feed** effect
  (`simulationDay % 9` → cycles through rain/sun/normal) that automatically drives the weather
  mode instead of requiring manual button clicks.
- Adds four independent show/hide toggles (sidebar, HUD dashboard, farm summary card, weather
  control card) not present in the active `App.tsx`.
- Uses a lighter, daytime color palette (`#dfeefb` background) versus the active twin's dark
  navy-blue night palette (`#0a1128`).

### `main.backup.tsx`, `original_map.tsx`, `replace_app.cjs`, `replace_map.cjs`

`main.backup.tsx` is byte-identical to `main.tsx`. `original_map.tsx` is an empty file.
`replace_app.cjs` / `replace_map.cjs` are one-off Node scripts (not part of any npm script) that
read a hard-coded absolute Windows path (`E:/Apollo_AgriVerse/preview-app/...`), splice a new
`MainDashboard`/`DigitalTwinMap` implementation into the target file via string search, and
`fs.writeFileSync` the result — artifacts of how earlier component swaps were performed
programmatically outside of version control diffs. They cannot run in this environment and are
not referenced anywhere else in the build.

---

## Performance Notes

- The active `DigitalTwinMap` scene's heaviest single object is the 3,200-instance crop mesh;
  every visible instance is re-transformed (position + rotation, full matrix rebuild) every
  animation frame regardless of whether the macro group is on-screen, as long as
  `macroGroup.visible` is true (which it is at zoom levels 0–2, not just 0).
- `DigitalTwinMap` and `SimulationPanel` each run their **own** `requestAnimationFrame` loop and
  `THREE.WebGLRenderer`; when the Simulation tab is active there is no twin scene mounted, but the
  reverse is not tested here — both loops throttle independently via the browser's frame
  scheduler, so there's no risk of them fighting over the same canvas, only of duplicated
  renderer/GPU context setup cost when switching tabs repeatedly.
- Shadow maps are configured at 2048² (`apollo_agriverse_digital_twin (1).tsx`) to 4096²
  (`DigitalTwinMap.tsx`, `DigitalTwinMap_before_restore.tsx`) — the higher-resolution shadow map
  is the most GPU-memory-intensive single setting in the active twin and is a reasonable first
  target if a lower-end device needs to be supported.
- None of the three Three.js scenes dispose of geometries/materials individually on unmount —
  only `renderer.dispose()` is called. Geometries and materials created inside the mount
  `useEffect` are garbage-collected once dereferenced, which is acceptable given the effect only
  ever runs once per mount, but would leak if the scene-build effect were ever changed to depend
  on props that change over the component's lifetime.

## Security & Data-Handling Notes

- `apollo_agriverse_html_shell.tsx` renders `apollo_agriverse_complete (6).html` via
  `<iframe srcDoc={completeExperience}>`. The HTML is pulled in at **build time** via Vite's
  `?raw` import from a file inside the repository, so there is no runtime/user-controlled input
  reaching `srcDoc` today — this is not an active XSS vector. It would become one if this pattern
  were ever repurposed to render server-fetched or user-submitted HTML without sanitization.
- No network calls are made anywhere in the active app (`fetch`, `XMLHttpRequest`, and WebSocket
  usage are all absent) — all "telemetry" is local mock data, so there is no API surface, auth
  token, or CORS configuration to review.
- No `localStorage`/`sessionStorage`/cookies are read or written by the active app.

## Known Issues / Housekeeping

- **Dead/duplicate source files** are present in `src/` and the project root and are *not* part
  of the build (not imported anywhere): `App_before_restore.tsx`,
  `DigitalTwinMap_before_restore.tsx`, `apollo_agriverse_digital_twin (1).tsx`,
  `apollo_agriverse_html_shell.tsx`, `apollo_agriverse_complete (6).html`, `main.backup.tsx`,
  `original_map.tsx` (empty), `replace_app.cjs`, `replace_map.cjs`. Safe to delete or move to an
  `/archive` folder.
- `src/App.css` is present but unused (never imported).
- **Build-breaking prop mismatch**: `DigitalTwinMap.tsx`'s exported `DigitalTwinMapProps`
  declares `zoomLevel`, `setZoomLevel`, `activeField`, `setActiveField` as required, but
  `App.tsx` currently renders `<DigitalTwinMap />` with no props. Vite's dev-mode transform
  doesn't type-check, so this only surfaces when running `npm run build` (`tsc -b`). An alternate
  version of this wiring (with optional/controlled props and internal fallback state) exists in
  `DigitalTwinMap_before_restore.tsx` / `App_before_restore.tsx`, suggesting the refactor was
  mid-flight when those were snapshotted.
- **No cross-view shared state**: `DigitalTwinMap`'s `timeOfDay`/weather state and
  `SimulationPanel`'s `simulationDay`/environment sliders are fully independent — advancing the
  365-day growth simulation has no visible effect on the Digital Twin tab, and vice versa.
- **Two disagreeing simulated clocks**: the active Digital Twin has no simulated-day driver at
  all in its current wiring (it only exposes a 0–24 time-of-day slider), while
  `apollo_agriverse_digital_twin (1).tsx`'s alternate twin runs a 0–150-day clock and
  `SimulationPanel` runs an independent 0–365-day clock with different stage-boundary day numbers
  for the same lifecycle labels (e.g. "Vegetative Growth" is day 15–45 in the 150-day model and
  day 30–120 in the 365-day model).
- **Static/random "live" data**: `MOCK_TELEMETRY` never updates; `HYDROGEL_DATA` re-randomizes on
  every mount; the top bar's 28 °C/65 % readouts and "20 May 2025" date are literal strings, not
  derived from any state.
- **Inconsistent farm-size figures**: `MainDashboard`'s Farm Summary card states "9.50 Acres" /
  "4,320" plants, while `MainDashboard`'s own inline overlay text elsewhere in the same file (and
  the alternate `apollo_agriverse_digital_twin (1).tsx` implementation) states "25.6 Acres" for
  what is nominally the same farm.
- **Non-projective field markers**: `DigitalTwinMap`'s 2D field-marker overlay uses a fixed
  linear scale from 3D field-center coordinates to CSS `left`/`top`, not an actual
  `camera`-based projection — the markers will misalign if the Farm-view camera framing ever
  changes.
- No automated tests, no CI configuration, and no accessibility audit have been performed.

## Suggested Next Steps

1. Fix the `DigitalTwinMap` prop-type mismatch so `npm run build` type-checks cleanly (the fix is
   already drafted in `DigitalTwinMap_before_restore.tsx`).
2. Remove or archive the dead files listed above to reduce confusion for new contributors.
3. Lift shared simulation state (day, weather, zoom/active field) into `App.tsx` or a small
   context/store so the Digital Twin, Simulation, and dashboard cards stay in sync, and reconcile
   the 150-day vs. 365-day lifecycle clocks into one shared timeline.
4. Replace `MOCK_TELEMETRY` with a typed data-fetching layer once a backend/API is available, and
   reconcile the conflicting farm-size figures (9.50 vs. 25.6 acres) with a single source of truth.
5. Extract a real `<Card>` primitive to de-duplicate the repeated
   `rounded-xl border border-[#1e2d40] bg-[#16202d]` pattern across every panel.
6. Replace the hand-rolled field-marker screen projection with `camera.project()` (or a
   dedicated `@react-three/drei` `<Html>` overlay) so markers stay accurate under any camera
   framing.
7. Build out the placeholder panels (Predictions, Recommendations, Analytics, Alerts, Reports,
   Settings).
8. Extract shared Three.js utilities (renderer/resize bootstrap, procedural leaf/root geometry
   builders) into reusable hooks so `DigitalTwinMap` and `SimulationPanel` stop duplicating the
   same boilerplate.
9. Add basic component/unit tests and a CI workflow that runs `tsc -b` and `oxlint` on every push.

## Glossary

| Term | Meaning in this app |
|---|---|
| NPK | Nitrogen, Phosphorus, Potassium — the three macronutrients tracked in the Soil panel. |
| EC | Electrical Conductivity — a proxy for soil salinity/nutrient concentration. |
| OM | Organic Matter — percentage of soil composed of decomposed organic material. |
| Hydrogel | A simulated water-absorbing polymer bead buried near plant roots; visualized as glowing blue spheres in the 3D soil view. |
| Saturation | The hydrogel's current stored-water percentage relative to capacity. |
| MBA / crosslinker | A polymer chemistry term (N,N'-methylenebisacrylamide) used in the "AI Formula Adjustment" copy to describe hypothetical hydrogel tuning. |
| Phenology | The study of plant lifecycle timing; the seven-stage grape model used throughout the app. |
| Digital twin | The 3D, zoomable visual representation of the (simulated) farm. |
| Zoom level | One of Farm / Field / Plant (Crop) / Soil — the four camera presets in `DigitalTwinMap`. |
| Evapotranspiration (ET) | Combined water loss from soil evaporation and plant transpiration, shown in the Weather panel. |
