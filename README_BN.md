# DHAKA / AFTER DARK — ভার্সন ০.২

ঢাকার **গুলশান, বনানী ও মহাখালী** নিয়ে তৈরি প্রথম playable browser-based 3D game prototype। এটি GTA 6-এর মতো সম্পূর্ণ realistic commercial game নয়। প্রথম version-এর শাহবাগ ম্যাপ বদলে এখানে **Gulshan 2, Banani Road 11, Mohakhali Bus Stand এবং Gulshan 1** নেওয়া হয়েছে।

## নতুন যা যোগ হয়েছে

- আগের block-character-এর বদলে **animated, textured, human-proportioned rigged 3D male model** (Three.js example Soldier model)। Idle, Walk, Run animation আছে। **এটি এখনো professional photorealistic civilian model নয়।** অনলাইনে model না পেলে আগের placeholder দেখা যাবে এবং ডান পাশে সেই status দেখাবে।
- OpenStreetMap service কাজ করলে এই এলাকার **আসল road geometry ও কিছু building outlines** load হয়। Service ব্যর্থ হলে **APPROXIMATE** লেখা simulated fallback চালু হয়। Fallback-কে বাস্তব ম্যাপ হিসেবে উপস্থাপন করা হয়নি।
- আরও বড় 3D world, traffic, গাড়ি চালানো, checkpoint missions, lighting, rain/night এবং minimap।
- **1 = Gulshan 2, 2 = Banani, 3 = Mohakhali, 4 = Gulshan 1**: district quick travel।

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

Map data © OpenStreetMap contributors (ODbL)। 3D example soldier asset is retrieved from the three.js examples; commercial use requires reviewing upstream license/rights.