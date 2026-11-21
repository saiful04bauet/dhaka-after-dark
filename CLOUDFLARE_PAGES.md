# Cloudflare Pages — Dhaka After Dark

1. Open [Cloudflare Workers & Pages](https://dash.cloudflare.com/).
2. Connect GitHub repository `saiful04bauet/dhaka-after-dark`.
3. Select `main` branch, framework `None`, build command `exit 0` (or blank if allowed) and build output directory `.`.
4. Deploy. `index.html` exists at repository root, with `src/main.js`, `src/human.js` and `src/style.css` in the `src/` directory.
5. Test in Chrome/Edge: click ENTER DHAKA, check `MAP STATUS` and `CHARACTER STATUS`. OSM and GLB example character are **external runtime services**, so a fallback is displayed if either is inaccessible.

This is a browser/WebGL prototype, not an Unreal Engine PC executable.