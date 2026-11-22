-- Extra demo data (hand-written). Remove with `pnpm db:clear-demo` (is_demo rows).

-- Demo accounts: copy each profile's role into the sign-in token (app_metadata),
-- as setRole() does for real users, so the header shows Admin / Dashboard links.
update auth.users u
set raw_app_meta_data = u.raw_app_meta_data || jsonb_build_object('role', p.role)
from public.profiles p
where p.id = u.id and u.email like '%@demo.jotno.test';

-- More shop products, so the filters, sorting and search have something to show.
-- Prices are poisha (৳1 = 100). species_id: 1 cat, 2 dog, 3 bird, 4 rabbit, 6 goat, 7 chicken.
insert into public.products (slug, name_en, name_bn, description_en, description_bn, category, species_id, price, compare_at, stock, unit, active, is_demo) values
  ('kitten-starter-food-400g', 'Kitten starter food', 'বিড়ালছানার স্টার্টার খাবার', 'Small, soft kibble for kittens from 4 weeks.', '৪ সপ্তাহ থেকে বিড়ালছানার জন্য ছোট, নরম দানা।', 'food', 1, 42000, 48000, 30, '400 g', true, true),
  ('tuna-wet-food-pouch', 'Tuna wet food pouch', 'টুনা ভেজা খাবার পাউচ', 'Chunks in gravy. A treat or a full meal.', 'গ্রেভিতে টুকরো। ট্রিট বা পুরো খাবার।', 'food', 1, 9000, null, 120, '85 g', true, true),
  ('puppy-chicken-rice-1kg', 'Puppy chicken & rice', 'পাপির চিকেন ও রাইস', 'Balanced food for growing puppies.', 'বাড়ন্ত পাপির জন্য সুষম খাবার।', 'food', 2, 98000, null, 18, '1 kg', true, true),
  ('dog-dental-chews', 'Dental chews for dogs', 'কুকুরের ডেন্টাল চিউ', 'Daily chew that helps keep teeth clean.', 'দাঁত পরিষ্কার রাখতে প্রতিদিনের চিউ।', 'food', 2, 35000, 40000, 25, '7 pcs', true, true),
  ('rabbit-timothy-hay', 'Timothy hay for rabbits', 'খরগোশের টিমোথি ঘাস', 'High-fibre hay for healthy digestion.', 'হজমের জন্য উচ্চ আঁশের ঘাস।', 'food', 4, 52000, null, 12, '1 kg', true, true),
  ('layer-feed-5kg', 'Layer feed for hens', 'ডিম পাড়া মুরগির খাবার', 'Complete feed for laying hens.', 'ডিম পাড়া মুরগির পূর্ণ খাবার।', 'food', 7, 68000, null, 40, '5 kg', true, true),
  ('goat-mineral-lick', 'Mineral lick for goats', 'ছাগলের মিনারেল লিক', 'Salt and minerals block to lick.', 'চাটার জন্য লবণ ও খনিজ ব্লক।', 'food', 6, 22000, null, 0, '2 kg', true, true),
  ('pet-shampoo-oatmeal', 'Oatmeal pet shampoo', 'ওটমিল পেট শ্যাম্পু', 'Gentle shampoo for itchy, dry skin. Cats and dogs.', 'চুলকানি ও শুষ্ক ত্বকের জন্য মৃদু শ্যাম্পু। বিড়াল ও কুকুর।', 'grooming', null, 48000, 55000, 20, '250 ml', true, true),
  ('slicker-brush', 'Slicker brush', 'স্লিকার ব্রাশ', 'Removes loose fur and small tangles.', 'ঝরা লোম ও ছোট জট ছাড়ায়।', 'grooming', null, 32000, null, 15, null, true, true),
  ('tofu-cat-litter-6l', 'Tofu cat litter', 'টোফু ক্যাট লিটার', 'Plant-based, flushable, low dust.', 'উদ্ভিজ্জ, ফ্লাশ করা যায়, কম ধুলা।', 'grooming', 1, 85000, 95000, 22, '6 L', true, true),
  ('nail-clipper', 'Pet nail clipper', 'পেট নেইল ক্লিপার', 'Safe clipper with a guard.', 'গার্ডসহ নিরাপদ ক্লিপার।', 'grooming', null, 26000, null, 9, null, true, true),
  ('steel-bowl-set', 'Steel bowl set', 'স্টিল বাটি সেট', 'Two rust-free bowls on a non-slip stand.', 'পিছলায় না এমন স্ট্যান্ডে দুটি মরিচাহীন বাটি।', 'accessories', null, 55000, null, 14, '2 bowls', true, true),
  ('cat-carrier-bag', 'Cat carrier bag', 'বিড়ালের ক্যারিয়ার ব্যাগ', 'Airy carrier for vet visits and travel.', 'ভেটের কাছে যাওয়া ও ভ্রমণের জন্য বাতাস চলাচলের ক্যারিয়ার।', 'accessories', 1, 165000, 190000, 6, null, true, true),
  ('dog-harness-m', 'Padded dog harness', 'প্যাডেড কুকুরের হারনেস', 'Comfortable harness, medium size.', 'আরামদায়ক হারনেস, মাঝারি সাইজ।', 'accessories', 2, 72000, null, 10, 'M', true, true),
  ('bird-cage-small', 'Small bird cage', 'ছোট পাখির খাঁচা', 'For budgies and finches, with two perches.', 'বাজরিগার ও ফিঞ্চের জন্য, দুটি দাঁড়সহ।', 'accessories', 3, 210000, null, 3, null, true, true),
  ('catnip-mouse-toy', 'Catnip mouse', 'ক্যাটনিপ ইঁদুর খেলনা', 'Soft mouse filled with catnip.', 'ক্যাটনিপ ভরা নরম ইঁদুর।', 'toys', 1, 12000, 15000, 50, null, true, true),
  ('rope-tug-toy', 'Rope tug toy', 'দড়ির টাগ খেলনা', 'Strong cotton rope for tug and fetch.', 'টানাটানি ও ছোড়াছুড়ির জন্য মজবুত সুতির দড়ি।', 'toys', 2, 25000, null, 35, null, true, true),
  ('squeaky-ball', 'Squeaky ball', 'চিঁচিঁ বল', 'Bouncy rubber ball that squeaks.', 'লাফানো রাবারের বল, চিঁচিঁ শব্দ করে।', 'toys', 2, 15000, null, 0, null, true, true),
  ('bird-swing', 'Bird swing with bells', 'ঘণ্টাসহ পাখির দোলনা', 'Wooden swing to hang in the cage.', 'খাঁচায় ঝোলানোর কাঠের দোলনা।', 'toys', 3, 14000, null, 18, null, true, true),
  ('winter-dog-sweater', 'Winter dog sweater', 'কুকুরের শীতের সোয়েটার', 'Warm knit sweater for cold mornings.', 'ঠান্ডা সকালের জন্য গরম বোনা সোয়েটার।', 'dress', 2, 62000, 75000, 8, 'M', true, true),
  ('cat-bow-collar', 'Bow collar for cats', 'বিড়ালের বো কলার', 'Breakaway collar with a bell and a bow.', 'ঘণ্টা আর বো-সহ সহজে খোলে এমন কলার।', 'dress', 1, 18000, null, 26, null, true, true)
on conflict (slug) do nothing;

-- Demo wallet numbers, so paid chats and bookings can be tried locally (manual
-- bKash/Nagad payments need a number to send to). Not real accounts; set the
-- real ones in /admin/settings. Keeps anything an admin already saved.
insert into public.settings (key, value)
values ('business', '{"bkash": {"number": "01700000000"}, "nagad": {"number": "01800000000"}}')
on conflict (key) do nothing;
