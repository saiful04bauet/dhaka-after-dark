# DHAKA / AFTER DARK — ভার্সন ০.৩

ঢাকার **গুলশান, বনানী ও মহাখালী** নিয়ে তৈরি প্রথম playable browser-based 3D game prototype। এটি GTA 6-এর মতো সম্পূর্ণ realistic commercial game নয়। প্রথম version-এর শাহবাগ ম্যাপ বদলে এখানে **Gulshan 2, Banani Road 11, Mohakhali Bus Stand এবং Gulshan 1** নেওয়া হয়েছে।

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