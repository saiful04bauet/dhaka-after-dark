# DHAKA / AFTER DARK — কীভাবে খেলবেন

এটি ঢাকাভিত্তিক একটি **playable 3D game prototype**। এটা সম্পূর্ণ GTA 6 নয়। বাস্তবসম্মত 3D game-এর ভিত্তি তৈরি হয়েছে; সম্পূর্ণ photorealistic model, বাস্তব ল্যান্ডমার্কের photogrammetry, advanced AI, combat, storyline, full city map ইত্যাদি এখনো তৈরি হয়নি।

## Windows-এ চালানোর নিয়ম

1. ZIP ফাইলটি Extract করুন।
2. কম্পিউটারে Python 3 থাকলে `START_WINDOWS.bat`-এ ডাবল-ক্লিক করুন।
3. Chrome বা Edge ব্রাউজারে `http://localhost:8000` খুলুন।
4. OpenStreetMap data load হলে **ENTER DHAKA** চাপুন।

> ইন্টারনেট লাগবে, কারণ Three.js graphics engine এবং OpenStreetMap map data অনলাইন থেকে লোড হয়। Overpass সার্ভার কাজ না করলে গেমে একটি **SIMULATED FALLBACK MAP** দেখা যাবে—সেটি আসল ঢাকার রাস্তার ম্যাপ নয়। সার্ভার সচল হলে পুনরায় লোড করুন।

## কন্ট্রোল

- `W A S D` — চলাফেরা / গাড়ি চালানো ও স্টিয়ারিং
- `Shift` — দৌড় / গাড়ির বেশি স্পিড
- `E` — গাড়ির কাছে গিয়ে গাড়িতে ওঠা / নামা
- `Space` — গাড়ির ব্রেক
- মাউস দিয়ে drag — ক্যামেরা ঘোরানো
- `V` — ক্যামেরা জুম আউট/ইন
- `T` — সন্ধ্যা ও রাত পরিবর্তন
- `R` — বৃষ্টি অন/অফ
- `M` — বড় ম্যাপ
- `Esc` — pause

## কোন জায়গা

প্রথম এলাকার কেন্দ্র **Shahbag–Ramna–Dhaka University**, ঢাকা। OpenStreetMap থেকে ঐ এলাকার আসল রাস্তা ও building footprints নেওয়া হয়। তবে বাড়ির রং, 3D উচ্চতা, গাড়ি, মানুষ, রাস্তার দোকান ইত্যাদি আনুমানিক/placeholder।

## পরের বড় আপগ্রেড

**Unreal Engine 5** দিয়ে photorealistic version তৈরি করলে Lumen, Nanite, scanned original Dhaka landmarks, realistic Bangladeshi characters, licensed vehicle models, improved traffic AI, physics, sounds এবং missions যোগ করতে হবে। পুরো ঢাকা এবং GTA 6-এর মতো production quality একটি বড় team-scale project।

Map data: © OpenStreetMap contributors — https://www.openstreetmap.org/copyright