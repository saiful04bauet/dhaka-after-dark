# Deploy Dhaka / After Dark to Cloudflare Pages

This is a static browser game; no compilation or server-side backend is required.

1. Create a new GitHub repository, e.g. `dhaka-after-dark`, and commit the files at the repository root.
2. In Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git, select the GitHub repository.
3. Use framework preset **None**, branch **main**, root directory `/`, leave build command **empty**, and set output directory to `.` (the repository root containing index.html).
4. Deploy and visit the assigned `*.pages.dev` URL. Test on a desktop with WebGL enabled.

Three.js is imported from jsDelivr at runtime. Detailed Dhaka map outlines are fetched from public OpenStreetMap Overpass endpoints at runtime, which may rate-limit or occasionally fail. The game falls back to its clearly labeled simulated city layout when data cannot be loaded.

The graphics and gameplay are prototype quality; this is **not** a GTA 6-quality finished game.