# DHAKA / AFTER DARK — playable 3D open-world pre-alpha

A playable desktop-browser **3D exploration / driving prototype** set around central **Dhaka, Bangladesh**, inspired by the *genre* of cinematic open-world action games. This is an original prototype, **not a GTA VI clone or a finished AAA title**.

## Quick start (Windows)

1. Extract the ZIP.
2. Install Python 3 if you do not already have it.
3. Double-click `START_WINDOWS.bat`.
4. Open http://localhost:8000 in Chrome or Edge (it may open automatically).
5. Wait for OpenStreetMap to load, then click **ENTER DHAKA**.

## Quick start (Mac/Linux)

Run `./start.sh` and visit http://localhost:8000.

You can alternatively serve the directory using VS Code Live Server or `npx serve`.

**Internet is required** to load the 3D Three.js engine and download up-to-date OpenStreetMap geography. Opening `index.html` directly from disk is not recommended. Public Overpass API services are rate-limited and may be unavailable at times.

## Controls

| Key | Action |
|---|---|
| W / A / S / D | Walk / move or accelerate, brake & steer while driving |
| Shift | Sprint on foot / faster vehicle speed |
| E | Enter / exit parked sedan (get within 12 m) |
| Space | Brake in vehicle |
| Mouse drag on game view | Rotate third-person camera |
| Q / F | Rotate camera with keyboard |
| V | Switch to wide camera |
| T | Switch dusk / night |
| R | Toggle monsoon rain |
| M | Show full city map |
| Esc | Pause / resume |

## What is implemented

- 3D scene with physically-based materials, shadows, atmospheric fog, facade textures, urban trees, road markings, lights, weather and time-of-day controls.
- Third-person original human player (placeholder geometric character) with walking/running motion.
- A drivable sedan with speed, steering, braking and entry/exit.
- Moving background traffic: cars, buses, CNG auto-rickshaws.
- GPS-based minimap, map overlay, district and coordinates HUD.
- Checkpoint exploration missions and simple taka rewards.
- **Real roads, park polygons, building footprints, water outlines** fetched from OpenStreetMap using Overpass (`out geom`). Geometry is projected using the game's local latitude/longitude center. Rendered 3D buildings use *estimated heights/materials*, so they are NOT accurate 3D reconstructions.
- If Overpass is unavailable, a playable **SIMULATED FALLBACK MAP** is generated. This fallback is deliberately marked as *not accurate Dhaka geography*.

## Map coverage / fidelity

- Current game zone: approximate **Shahbag, Ramna Park, University of Dhaka surroundings**, Dhaka.
- Geographic bbox: south 23.733, west 90.393, north 23.746, east 90.409.
- These are OSM-derived outlines where OSM data is returned; roads are not an official/navigation-grade model, and traffic, collision and landmarks are simplified.
- Browser graphics are **NOT photorealistic AAA**: no scanned landmarks, cinematic humans, texture atlases, global illumination, advanced traffic AI, vehicle interiors, sound design or full Dhaka coverage yet.

## For an actual high-fidelity PC game

Recommended next phase: Unreal Engine 5, World Partition, Nanite assets, Lumen lighting, MetaHuman-like *original licensed* character assets, dedicated vehicle physics, traffic/navmesh, recorded Bangladeshi street ambience, and photogrammetry of *legally obtained* authentic Dhaka landmarks. Import appropriately licensed OSM/other GIS data through an Unreal geospatial pipeline, check map topology and obtain permissions for source data and building imagery. Begin with one polished 1–2 km² vertical slice before expanding across the city.

## Files

- `index.html` — overlays, menu, HUD, map display
- `src/style.css` — UI and art direction
- `src/main.js` — renderer, map ingestion, 3D city, characters, traffic, missions, controls
- `START_WINDOWS.bat` — one-click development server on Windows
- `start.sh` — Mac/Linux server launcher

## Credits & license

Original source code provided for prototyping. Three.js: MIT license, loaded from jsDelivr at runtime. Map geometry provided by **© OpenStreetMap contributors**, distributed under the Open Database License (ODbL): https://www.openstreetmap.org/copyright. Respect attribution and relevant license conditions before publishing or distributing derived geographic datasets. Fictional shop names and placeholder vehicles/characters do not represent official assets from any existing game.