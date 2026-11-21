# DHAKA / AFTER DARK — Gulshan • Banani • Mohakhali (v0.2)

**Playable pre-alpha**, not a finished GTA VI-quality game. This release shifts the first region from Shahbag to **Gulshan 2 / Gulshan 1, Banani Road 11 and Mohakhali Bus Stand**. It uses real OpenStreetMap street and building outlines **when the public Overpass service responds**. If the OSM service fails, the UI clearly indicates that the district streets are an approximate simulated fallback, **not a real map**.

## NEW in v0.2

- **Rigged textured adult male 3D character** with *Idle, Walk and Run* clips sourced from the public three.js Soldier.glb example, loaded by `src/human.js`. This is a more human-looking placeholder model, **not a photorealistic custom Metahuman**. Its source must be reachable at runtime; if unavailable, the earlier procedural figure is substituted and the HUD shows that fact.
- **Three northern Dhaka areas**, one continuous road network (OSM service when available), larger 3D world and building density with tall office/residential towers.
- **District markers and quick travel** between Gulshan 2, Banani Road 11, Mohakhali Bus Stand and Gulshan 1 to make testing convenient.
- **Location-specific missions**, traffic (sedans, buses, CNGs), driving, GPS minimap, map overlay, rain/night mode, collisions and third-person camera.

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
| WASD | Move / drive |
| Shift | Sprint / accelerate |
| E | Enter or exit nearby sedan |
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
- `src/human.js`: Runtime GLB rigged character loader and animation blending
- `src/style.css`: HUD and screen styling
- `README_BN.md`: Bangla setup overview

## Cloudflare Pages

Connect the GitHub repository `saiful04bauet/dhaka-after-dark` and deploy `main` with **Framework preset: None** and **Build output directory: `.`**. Leave build command blank or use `exit 0` if it is required. This is a static client-side WebGL prototype.

## Accuracy, credits and limitations

- Anchors: Gulshan 2 Circle `23.7948921,90.4138705`, Banani Rd 11 ~`23.79075,90.40503`, Mohakhali Bus Stand `23.77794,90.39848`, Gulshan 1 Circle `23.78032,90.4168`.
- The road/building shapes from live OSM are © OpenStreetMap contributors, licensed under the **ODbL**. See [OpenStreetMap copyright](https://www.openstreetmap.org/copyright). Other details (individual tower designs, façades, cars, shop signs, furniture) are generated game approximations; do not assume they exactly represent the street.
- GLB example model: [three.js example models / Soldier.glb](https://threejs.org/examples/models/gltf/Soldier.glb), loaded from an external host with fallback. The GLB figure is an animated example soldier, not a customized Dhaka civilian model. Check upstream asset terms before commercial reuse.
- The full Gulshan/Banani/Mohakhali districts are **not fully modeled**. This release provides a mechanically playable, geographically targeted browser prototype, not AAA graphics, voice acting, missions, combat, large-world streaming or production-ready physics.