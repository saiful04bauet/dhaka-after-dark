# DHAKA / AFTER DARK — ভার্সন ০.৭

ঢাকার **গুলশান, বনানী ও মহাখালী** নিয়ে তৈরি প্রথম playable browser-based 3D game prototype। এটি GTA 6-এর মতো সম্পূর্ণ realistic commercial game নয়। প্রথম version-এর শাহবাগ ম্যাপ বদলে এখানে **Gulshan 2, Banani Road 11, Mohakhali Bus Stand এবং Gulshan 1** নেওয়া হয়েছে।

## ভার্সন ০.৭ — Car Snatching + Real Street Map

- **Car Snatching:** Traffic-এর গাড়ির ৯ মিটারের মধ্যে গিয়ে F চাপবে। ২.২ সেকেন্ড গাড়ির কাছে দাঁড়িয়ে থাকলে গাড়িটি নিতে পারবে। দূরে গেলে cancel। Driver NPC পালাবে এবং ২ wanted stars বাড়বে। E দিয়ে খালি parked গাড়িতে ওঠা যাবে।
- **Getaway mission:** Banani Vehicle Getaway mission-এ গাড়ি snatch করে wanted stars ০ করে সেই stolen car নিয়ে Gulshan 2-এ যেতে হবে। Reward ৳১,৯০০।
- **Real 2D map:** মিনিম্যাপে OpenStreetMap-এর genuine geographic street tiles, GPS, police এবং mission icons load হবে। Network না থাকলে পুরোনো schematic view fallback।
- **3D street labels:** Available OpenStreetMap data-র আসল রাস্তার নাম দিয়ে 3D sign তৈরি হবে। Placement approximate।
- **Touch button:** নতুন F Hijack, progress bar ও total snatched counter।

**নোট:** 2D রাস্তার map বাস্তব geographic তথ্যের ওপর ভিত্তি করে, কিন্তু 3D building façade, sign placement এবং scenery এখনও অনুমানভিত্তিক। এটি GTA 5-এর সম্পূর্ণ সংস্করণ নয়; live-browser end-to-end test এখনও নিশ্চিত হয়নি।

Tests: node --test tests/*.mjs
## ভার্সন ০.৬ — GTA 5-স্টাইল Gameplay

এটি একটি মৌলিক বাংলাদেশভিত্তিক browser open-world game prototype। GTA 5-এর সম্পূর্ণ গেম নয়; কয়েকটি গুরুত্বপূর্ণ interactive gameplay feature যোগ হয়েছে।

- **Mission:** `J` চেপে mission board দেখো। `N` চেপে mission start/retry। Banani courier, Gulshan driving, পুলিশ এড়িয়ে পালানোর mission, express delivery ও Mohakhali exploration আছে। Mission-এ সময়সীমা এবং টাকার reward রয়েছে।
- **Police chase:** থেমে থাকা traffic car নিয়ে গেলে বা গাড়ি দিয়ে অন্য গাড়িতে ধাক্কা দিলে wanted stars বাড়ে। Police patrol গাড়ি chase করে। দূরে পালাতে পারলে ধীরে ধীরে stars কমে। ধরা পড়লে অর্থদণ্ড ও mission fail।
- **Player HUD:** Health, Armor, Stamina, Car Condition, Cash এবং ★ Wanted Level।
- **Garage:** বেগুনি BANANI GARAGE marker-এর কাছে গাড়ি দাঁড় করিয়ে `G` চাপলে ৳300 দিয়ে repair, `U` দিলে engine upgrade (৳1,200 থেকে)। এটি gameplay-এর তৈরি fictional garage, বাস্তব service shop নয়।
- **Clinic:** সবুজ MOHAKHALI CLINIC marker-এর কাছে গাড়ি থেকে নেমে `H` চাপলে ৳150 দিয়ে health/armor restore। এটিও game marker, প্রকৃত clinic নয়।
- **On-foot:** `Space` = Jump, `C` = crouch, `X` = কাছে থাকা NPC-এর সাথে ছোট scripted কথোপকথন। গাড়িতে `Space` = brake, `B` = horn।
- **Save:** `K` = manual save; প্রায় 15 সেকেন্ড পর পর autosave। টাকা, mission, upgrade ও position একই browser-এর localStorage-এ থাকে; account/cloud sync নেই।
- **Mobile buttons:** Jump/Brake এবং Talk/Use touch buttons যোগ হয়েছে।

**সীমাবদ্ধতা:** পুরো GTA 5-মানের content/graphics, professional combat, cinematic story, multiplayer বা advanced vehicle physics এখনো নেই। Police ও NPC AI সহজ model। Browser-এ সম্পূর্ণ end-to-end test করা হয়নি।

`node --test tests/*.mjs` দিয়ে Node 20+ এ control, mission ও gameplay tests চালানো যাবে।

## ভার্সন ০.৫ — Arrow ও Map Fix

- **Left/Right ঠিক:** Keyboard ও স্ক্রিনের arrow-এ এখন যেদিকে চাপবে চরিত্র ও গাড়ি সেদিকেই ঘুরবে। Minimap-এর player-facing arrow ও GPS compass-ও সংশোধন করা হয়েছে।
- **সত্যিকারের map tiles:** **M** চাপলে Leaflet-এ OpenStreetMap-এর interactive map দেখা যাবে; zoom, pan, live player coordinate marker, mission checkpoint ও district marker থাকবে। **RECENTER** দিয়ে প্লেয়ারের অবস্থানে map ফিরবে।
- **রাস্তার ওপর GPS path:** Real OSM connected road data পাওয়া গেলে নীল route line রাস্তা ধরে যাবে ও আনুমানিক road distance দেখাবে। Service unavailable বা রাস্তা disconnected হলে amber dashed line-কে স্পষ্টভাবে **straight-line bearing** হিসেবে দেখানো হবে।
- **বিকল্প map:** Leaflet বা external map server কাজ না করলে পুরোনো schematic fallback থাকবে, ভুল করে সেটাকে বাস্তব রাস্তার map বলা হবে না।
- **Testing:** `node --test tests/navigation.mjs` দিয়ে control এবং road-routing regression check করা যাবে।

## নতুন যা যোগ হয়েছে

- আগের block-character-এর বদলে **animated, textured civilian male 3D model** (CC BY 4.0 Casual Man; Soldier backup)। Idle, Walk, Run animation আছে। **এটি এখনো professional photorealistic MetaHuman নয়।** অনলাইনে model না পেলে আগের placeholder দেখা যাবে এবং ডান পাশে সেই status দেখাবে।
- OpenStreetMap service কাজ করলে এই এলাকার **আসল road geometry ও কিছু building outlines** load হয়। Service ব্যর্থ হলে **APPROXIMATE** লেখা simulated fallback চালু হয়। Fallback-কে বাস্তব ম্যাপ হিসেবে উপস্থাপন করা হয়নি।
- আরও বড় 3D world, traffic, গাড়ি চালানো, checkpoint missions, lighting, rain/night এবং minimap।
- **1 = Gulshan 2, 2 = Banani, 3 = Mohakhali, 4 = Gulshan 1**: district quick travel।

## ভার্সন ০.৩: আরও উন্নত controls ও environment

- **Animated civilian 3D character:** "Casual Man" by vinish.dev — CC BY 4.0। আগের Soldier model শুধু backup। মান এখনো photorealistic নয়।
- **Arrow দিয়ে চলাফেরা:** Keyboard-এর ↑ ↓ ← → বা WASD, এবং স্ক্রিনের চারটি arrow button ধরে হাঁটা ও গাড়ি চালানো যায়।
- **থেমে থাকা গাড়িতে ওঠা:** কাছের parked sedan/CNG বা traffic-এ থেমে থাকা vehicle-এর কাছে গিয়ে **E** বা **ENTER/EXIT** চাপবে। চলন্ত গাড়িতে ওঠা যাবে না। গাড়ির গতি কমিয়ে দাঁড় করিয়ে E চাপলে নামবে।
- **GPS indicator:** Checkpoint-এর দিকে ঘুরতে থাকা arrow ও দূরত্ব, minimap, বড় map এবং destination line। লাইনটি সরাসরি direction, actual road-navigation route নয়।
- **Scene:** 3D sky, improved lighting/shadow, wet road, zebra crossing, storefront glass, road lights ও গাড়ির extra details।

## ভার্সন ০.৪ — Buildings, Vehicles ও Environment

- **Buildings:** OSM building footprints-এর ওপর অতিরিক্ত glass panels, floor-wise windows, metal trim এবং city detail। এগুলো বাস্তব ভবনের exact ডিজাইন নয়।
- **Vehicles:** CC0 licensed real GLB 3D models — sedan, SUV, city bus এবং CNG/auto-rickshaw। Download হয়ে গেলে game-এ procedural গাড়ির বদলে বিস্তারিত mesh দেখা যায়। Model unavailable হলে game-এর basic গাড়ি চালানো যাবে।
- **Environment:** ঢাকার রাস্তার পরিবেশের জন্য bus shelter, bench, বৈদ্যুতিক খুঁটি ও তার, নতুন leafy trees এবং improved materials।
- **Lighting:** Poly Haven-এর CC0 Urban Street HDRI থেকে optional reflection lighting; network unavailable হলে আগের lighting চলবে।
- সবকিছু **Gulshan–Banani–Mohakhali** zone-এর ওপর। AAA GTA 6 photorealistic graphics দাবি করা হচ্ছে না।

Asset credits ও direct source URLs ইংরেজি README-তে আছে। এই build-এ external 3D models browser-এর মাধ্যমে load হয়, ZIP/repo-তে মডেল binary রাখা হয়নি।

## কীভাবে চালাবে

ZIP extract করে folder-এর ভিতরে terminal থেকে:

```bash
python -m http.server 8000
```

তারপর Chrome/Edge-এ `http://localhost:8000` খুলে **ENTER DHAKA** চাপবে। Windows-এ আগের `START_WINDOWS.bat`-ও ব্যবহার করা যাবে। WebGL ও ইন্টারনেট দরকার।

## GitHub/Cloudflare

GitHub: https://github.com/saiful04bauet/dhaka-after-dark

Cloudflare Pages-এ repo connect করে branch `main`, Framework `None`, build command `exit 0` এবং output directory `.` দেবে। Already connected হলে main branch update হলেই Cloudflare নতুন deployment trigger করতে পারে।

**নোট:** GTA 6-মানের graphics-এর জন্য custom 3D scanned/rigged human, accurate Dhaka building assets, realistic car models, and Unreal Engine 5-style content pipeline লাগবে। এই browser prototype-এ সেই AAA assets নেই।

Map data © OpenStreetMap contributors (ODbL)। Character credit: "Casual Man" by vinish.dev (https://vinish.dev/free-3d-models/people), CC BY 4.0। Backup soldier from Three.js examples.