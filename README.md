# DHAKA / AFTER DARK — Gulshan • Banani • Mohakhali (v0.5)

**Playable pre-alpha**, not a finished GTA VI-quality game. This release shifts the first region from Shahbag to **Gulshan 2 / Gulshan 1, Banani Road 11 and Mohakhali Bus Stand**. It uses real OpenStreetMap street and building outlines **when the public Overpass service responds**. If the OSM service fails, the UI clearly indicates that the district streets are an approximate simulated fallback, **not a real map**.

## NEW in v0.5 — corrected controls and real-world map

- **Left / right corrected:** The screen-relative walking direction and behind-car steering now match the left/right arrow key or D-pad button. GPS compass and minimap player arrow orientation are fixed as well.
- **Interactive map:** Press **M** or click the minimap. The full map loads Leaflet with real OpenStreetMap street tiles (zoom and pan), actual player coordinates, checkpoint and nearby district markers. A **RECENTER** button returns to the player's GPS location.
- **Road-shaped GPS path:** When connected OpenStreetMap roads load successfully, a local A* graph follows *connected OSM road nodes*, showing a solid blue route and approximate road distance. Disconnected/unavailable street data produces a clearly labeled dashed amber **bearing only** line instead of an invented street route. The routing is not traffic-aware, legal turn-by-turn navigation; one-way rules and turn restrictions are not enforced.
- **Connectivity fallback:** If tile CDN/OSM data is unavailable, the browser falls back to the schematic view and labels simulated road geometry accurately. Interactive street-map tiles can work independently even when the Overpass building/road-data endpoint fails.
- **Regression tests:** Direction, steering, compass and connected/disconnected road routes are covered in `tests/navigation.mjs`. Run `node --test tests/navigation.mjs` using Node.js 20+.

## NEW in v0.3

- **Civilian player:** Prioritizes a textured, animated male civilian ("Casual Man" by vinish.dev, CC BY 4.0) with Idle / Walk / Run clips. If that host fails, the Three.js Soldier sample is a backup; a visibly labeled procedural character is the last resort.
- **Movement:** WASD *and four arrow keys* for walking and driving, plus functional hold-to-move on-screen arrows.
- **Any stopped/parked car:** Press **E** near the closest available vehicle to enter it. The car may be a sedan, CNG, or a bus. Moving traffic cannot be boarded; AI vehicles make periodic stops. Press E after slowing almost to a stop to get out. Enter/exit animations and physical door interactions are not implemented yet.
- **GPS destination direction:** Rotating compass arrow, meters to checkpoint, minimap, district navigation and dashed **straight-line bearing**; this is not actual turn-by-turn road routing.
- **More grounded 3D visuals:** Atmospheric sky, revised cinematic lighting, shadows following the player, weather-dependent wet-road materials, zebra crossings, commercial glass fronts, shop signs, street lighting and extra vehicle details.
- **Same North Dhaka gameplay zone:** Gulshan 1 and 2, Banani Road 11, Mohakhali Bus Stand (OSM source if available; otherwise clearly labeled approximate layout).

This remains a browser pre-alpha, **not a GTA VI-like photorealistic finished production**. Cars, buildings, vegetation, NPCs, animations and physics are still relatively simple geometry.

## NEW in v0.4 — higher-detail graphics (November 21, 2026)

**Buildings:** Instanced glass windows, night-lit office/residential facade panels, metallic trims and grounded architectural variation on nearby OSM-footprint buildings. These additional facade features are procedurally generated, **not measured/photogrammetry of real buildings**.

**Vehicles:** Real 3D GLB vehicle meshes are loaded at runtime in place of placeholder boxes: an executive sedan, touring SUV, single-deck city bus and green-style three-wheeled auto-rickshaw. Driving, speed, board/exit and traffic logic are unchanged. If any model CDN is unreachable, only that model keeps the procedural fallback. Existing traffic can continue moving.

**Environment:** Generated alpha-cutout broadleaf trees, rooftop/roadside details, shelter canopies, bus benches, utility poles and overhead wires, plus an optional HDR reflection/illumination environment for wet roads, car paint and glass. Real-world layout remains restricted to selected OpenStreetMap roads/building footprints; street props and original façades are approximations.

**Performance:** Nearby building details use GPU InstancedMesh batching, and GLB wheel animations are capped to 20 vehicles. It is still a **Three.js browser prototype**, not a fully realistic AAA game/Unreal Engine 5 build. External vehicle model & HDR downloads require an internet connection.

### External asset provenance (all verified pages are CC0)

| Scene asset | Runtime URL | Original CC0 asset page |
|---|---|---|
| Executive sedan | https://cdn.3dassets.dev/assets/18684/v1/model.glb | https://3dassets.dev/assets/transport-collection-hd-executive-sedan-cfa7dfcf |
| Touring SUV | https://cdn.3dassets.dev/assets/18686/v1/model.glb | https://3dassets.dev/assets/transport-collection-hd-touring-suv-f8566c14 |
| Single-decker city bus | https://cdn.3dassets.dev/assets/34194/v1/model.glb | https://3dassets.dev/assets/bus-station-and-city-transit-city-bus-single-decker-ddf9a355 |
| Auto-rickshaw | https://cdn.3dassets.dev/assets/36560/v1/model.glb | https://3dassets.dev/assets/indian-bazaar-street-and-temple-auto-rickshaw-51b91c47 |
| Urban HDR reflections | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/urban_street_01_1k.hdr | https://polyhaven.com/a/urban_street_01 |

Models are streamed from provider CDNs and **not stored as GLB binaries in this repository**. The source pages identify these vehicles and Poly Haven HDRI as CC0 1.0; retain their original licensing information if redistributing binaries. Character model licensing remains separately credited (vinish.dev CC BY 4.0).

## Run locally

Launch a local static server from the repository root:

```bash
python -m http.server 8000
```

Open <http://localhost:8000> in a recent Chrome/Edge browser and click **ENTER DHAKA** when the city has loaded. This site is also deployable to Cloudflare Pages without a build step.

Internet access and WebGL are required for the Three.js engine, OpenStreetMap data and downloaded animated character. The Overpass/3D asset hosts may sometimes be rate limited or unavailable. **HTML files must be served over HTTP(S), not opened directly by double click.**

### Controls

| Input | Action |
|---|---|
| WASD or arrow keys (↑ ↓ ← →) | Walk / drive / reverse / steer |
| On-screen directional arrows | Hold to walk or steer (desktop/touch) |
| Shift | Sprint / accelerate |
| E or ENTER / EXIT on screen | Board a parked or stopped car, or exit once stopped |
| Space | Brake |
| Mouse drag / Q / F | Rotate camera |
| V | Wide camera |
| 1 / 2 / 3 / 4 | Jump to Gulshan 2 / Banani / Mohakhali / Gulshan 1 |
| M | Full map |
| T | Night mode |
| R | Monsoon rain |
| Esc | Pause |

## Project structure

- `index.html`: Main overlay, mission HUD and district selection
- `src/main.js`: Three.js scene, geometry, OSM ingestion, vehicle/character controller, mission loop
- `src/map_navigation.js`: Connected street-route graph and live Leaflet map overlay
- `src/control_math.js`: Tested camera-relative walking, steering and compass orientation
- `tests/navigation.mjs`: Control and GPS navigation regression cases
- `src/human.js`: Runtime GLB rigged character loader and animation blending
- `src/style.css`: HUD and screen styling
- `README_BN.md`: Bangla setup overview

## Cloudflare Pages

Connect the GitHub repository `saiful04bauet/dhaka-after-dark` and deploy `main` with **Framework preset: None** and **Build output directory: `.`**. Leave build command blank or use `exit 0` if it is required. This is a static client-side WebGL prototype.

## Accuracy, credits and limitations

- Anchors: Gulshan 2 Circle `23.7948921,90.4138705`, Banani Rd 11 ~`23.79075,90.40503`, Mohakhali Bus Stand `23.77794,90.39848`, Gulshan 1 Circle `23.78032,90.4168`.
- The road/building shapes from live OSM are © OpenStreetMap contributors, licensed under the **ODbL**. See [OpenStreetMap copyright](https://www.openstreetmap.org/copyright). Other details (individual tower designs, façades, cars, shop signs, furniture) are generated game approximations; do not assume they exactly represent the street.
- Primary character: **"Casual Man" by vinish.dev**, <https://vinish.dev/free-3d-models/people>, **CC BY 4.0**. A second business civilian from the same site is a fallback. The older [Three.js Soldier.glb sample](https://threejs.org/examples/models/gltf/Soldier.glb) remains a secondary compatibility fallback. Character model downloads are external, not bundled with the repo. The civilian is an openly licensed generic 3D model, not a unique high-resolution MetaHuman.
- The full Gulshan/Banani/Mohakhali districts are **not fully modeled**. This release provides a mechanically playable, geographically targeted browser prototype, not AAA graphics, voice acting, missions, combat, large-world streaming or production-ready physics.