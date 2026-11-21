"""Reference data: Bangladesh areas, species, breeds.

Sources: scripts/seed/data/*.json from github.com/nuhil/bangladesh-geocode (MIT),
plus Dhaka and Chattogram city thanas the dataset does not have (approximate
centre coordinates). Writes:
  - supabase/seeds/01_reference.sql  (database rows)
  - src/content/geo.ts               (districts, species, breeds for the UI)
  - src/content/geo-areas.ts         (areas, loaded on demand by the area picker)

Run: python -I scripts/seed/gen_reference_seed.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
src = ROOT / "scripts" / "seed" / "data"
out = ROOT / "supabase" / "seeds" / "01_reference.sql"

def load(name):
    j = json.load(open(src / f"{name}.json", encoding="utf-8"))
    return [x for x in j if x.get("type") == "table"][0]["data"]

divisions, districts, upazilas = load("divisions"), load("districts"), load("upazilas")

def q(s):
    return "'" + str(s).replace("'", "''") + "'"

lines = [
    "-- Reference data: Bangladesh areas (nuhil/bangladesh-geocode, MIT) + city thanas, species, breeds.",
    "-- Generated; edit the generator, not this file.",
    "",
]
lines.append("insert into public.divisions (id, name_en, name_bn) values")
lines.append(",\n".join(f"({int(d['id'])}, {q(d['name'])}, {q(d['bn_name'])})" for d in divisions) + "\non conflict (id) do nothing;\n")

lines.append("insert into public.districts (id, division_id, name_en, name_bn, lat, lon) values")
lines.append(",\n".join(
    f"({int(d['id'])}, {int(d['division_id'])}, {q(d['name'])}, {q(d['bn_name'])}, {float(d['lat'])}, {float(d['lon'])})"
    for d in districts) + "\non conflict (id) do nothing;\n")

dist_by_name = {d["name"]: int(d["id"]) for d in districts}
rows = []
for u in upazilas:
    lat = float(u["lat"]) if u.get("lat") else "null"
    lon = float(u["lon"]) if u.get("lon") else "null"
    rows.append(f"({int(u['id'])}, {int(u['district_id'])}, {q(u['name'])}, {q(u['bn_name'])}, 'upazila', {lat}, {lon})")

CITY = {
    "Dhaka": [
        ("Mirpur", "মিরপুর", 23.8223, 90.3654), ("Pallabi", "পল্লবী", 23.8310, 90.3620),
        ("Kafrul", "কাফরুল", 23.7915, 90.3870), ("Dhanmondi", "ধানমন্ডি", 23.7461, 90.3742),
        ("Mohammadpur", "মোহাম্মদপুর", 23.7662, 90.3589), ("Adabor", "আদাবর", 23.7740, 90.3550),
        ("Gulshan", "গুলশান", 23.7925, 90.4078), ("Banani", "বনানী", 23.7940, 90.4043),
        ("Badda", "বাড্ডা", 23.7800, 90.4260), ("Rampura", "রামপুরা", 23.7612, 90.4198),
        ("Khilgaon", "খিলগাঁও", 23.7516, 90.4255), ("Uttara", "উত্তরা", 23.8759, 90.3795),
        ("Tejgaon", "তেজগাঁও", 23.7639, 90.3925), ("Ramna", "রমনা", 23.7380, 90.3990),
        ("Shahbag", "শাহবাগ", 23.7380, 90.3950), ("Motijheel", "মতিঝিল", 23.7330, 90.4172),
        ("Paltan", "পল্টন", 23.7340, 90.4110), ("Lalbagh", "লালবাগ", 23.7190, 90.3880),
        ("Hazaribagh", "হাজারীবাগ", 23.7330, 90.3640), ("Kotwali (Dhaka)", "কোতোয়ালী (ঢাকা)", 23.7106, 90.4090),
        ("Sutrapur", "সূত্রাপুর", 23.7090, 90.4170), ("Wari", "ওয়ারী", 23.7180, 90.4220),
        ("Jatrabari", "যাত্রাবাড়ী", 23.7104, 90.4349), ("Demra", "ডেমরা", 23.7230, 90.4890),
        ("Shyampur", "শ্যামপুর", 23.6930, 90.4300), ("Kamrangirchar", "কামরাঙ্গীরচর", 23.7180, 90.3710),
        ("Cantonment", "ক্যান্টনমেন্ট", 23.8220, 90.4020), ("Khilkhet", "খিলক্ষেত", 23.8300, 90.4250),
        ("Vatara", "ভাটারা", 23.8040, 90.4300), ("Bashundhara R/A", "বসুন্ধরা আ/এ", 23.8193, 90.4526),
        ("Turag", "তুরাগ", 23.8800, 90.3600), ("Dakshinkhan", "দক্ষিণখান", 23.8580, 90.4250),
        ("Uttarkhan", "উত্তরখান", 23.8800, 90.4300), ("Sabujbagh", "সবুজবাগ", 23.7380, 90.4320),
        ("Mugda", "মুগদা", 23.7290, 90.4300), ("Shah Ali", "শাহ আলী", 23.8040, 90.3530),
        ("Darus Salam", "দারুস সালাম", 23.7880, 90.3520), ("Sher-e-Bangla Nagar", "শেরেবাংলা নগর", 23.7720, 90.3750),
        ("Kalabagan", "কলাবাগান", 23.7480, 90.3830), ("New Market", "নিউ মার্কেট", 23.7330, 90.3850),
        ("Bimanbandar", "বিমানবন্দর", 23.8500, 90.4080), ("Hatirjheel", "হাতিরঝিল", 23.7590, 90.4060),
    ],
    "Chattogram": [
        ("Panchlaish", "পাঁচলাইশ", 22.3640, 91.8240), ("Kotwali (Chattogram)", "কোতোয়ালী (চট্টগ্রাম)", 22.3370, 91.8350),
        ("Khulshi", "খুলশী", 22.3600, 91.8000), ("Halishahar", "হালিশহর", 22.3300, 91.7800),
        ("Double Mooring", "ডবলমুরিং", 22.3250, 91.8050), ("Chandgaon", "চান্দগাঁও", 22.3800, 91.8500),
        ("Bayezid Bostami", "বায়েজিদ বোস্তামী", 22.3900, 91.8200), ("Pahartali", "পাহাড়তলী", 22.3600, 91.7800),
    ],
}
area_objs = [
    {"id": int(u["id"]), "d": int(u["district_id"]), "en": u["name"], "bn": u["bn_name"], "lat": float(u["lat"]) if u.get("lat") else None, "lon": float(u["lon"]) if u.get("lon") else None}
    for u in upazilas
]
next_id = 10000
for district, areas in CITY.items():
    did = dist_by_name.get(district)
    if did is None:
        raise SystemExit(f"district {district} missing")
    for en, bn, lat, lon in areas:
        rows.append(f"({next_id}, {did}, {q(en)}, {q(bn)}, 'thana', {lat}, {lon})")
        area_objs.append({"id": next_id, "d": did, "en": en, "bn": bn, "lat": lat, "lon": lon, "city": True})
        next_id += 1

lines.append("insert into public.areas (id, district_id, name_en, name_bn, kind, lat, lon) values")
lines.append(",\n".join(rows) + "\non conflict (id) do nothing;\n")

SPECIES = [
    ("cat", "Cat", "বিড়াল", ["Deshi|দেশি", "Persian|পারসিয়ান", "Siamese|সিয়ামিজ", "Bengal|বেঙ্গল", "Mixed|মিশ্র"]),
    ("dog", "Dog", "কুকুর", ["Deshi|দেশি", "German Shepherd|জার্মান শেফার্ড", "Labrador|ল্যাব্রাডর", "Golden Retriever|গোল্ডেন রিট্রিভার", "Pomeranian|পমেরানিয়ান", "Spitz|স্পিৎজ", "Rottweiler|রটওয়াইলার", "Mixed|মিশ্র"]),
    ("bird", "Bird", "পাখি", ["Budgerigar|বাজরিগার", "Cockatiel|ককাটিয়েল", "Lovebird|লাভবার্ড", "Pigeon|কবুতর", "Other|অন্যান্য"]),
    ("rabbit", "Rabbit", "খরগোশ", ["Deshi|দেশি", "Dutch|ডাচ", "Angora|অ্যাঙ্গোরা", "Mixed|মিশ্র"]),
    ("cow", "Cow", "গরু", ["Deshi|দেশি", "Holstein Friesian|হলস্টেইন ফ্রিজিয়ান", "Sahiwal|শাহীওয়াল", "Red Chittagong|রেড চিটাগাং"]),
    ("goat", "Goat", "ছাগল", ["Black Bengal|ব্ল্যাক বেঙ্গল", "Jamunapari|যমুনাপাড়ি", "Mixed|মিশ্র"]),
    ("chicken", "Chicken", "মুরগি", ["Deshi|দেশি", "Sonali|সোনালী", "Broiler|ব্রয়লার", "Layer|লেয়ার"]),
    ("other", "Other", "অন্যান্য", []),
]
lines.append("insert into public.species (id, slug, name_en, name_bn, sort) values")
lines.append(",\n".join(f"({i+1}, {q(s)}, {q(en)}, {q(bn)}, {i})" for i, (s, en, bn, _) in enumerate(SPECIES)) + "\non conflict (id) do nothing;\n")
brows, bid = [], 1
for i, (_, _, _, breeds) in enumerate(SPECIES):
    for b in breeds:
        en, bn = b.split("|")
        brows.append(f"({bid}, {i+1}, {q(en)}, {q(bn)})")
        bid += 1
lines.append("insert into public.breeds (id, species_id, name_en, name_bn) values")
lines.append(",\n".join(brows) + "\non conflict (id) do nothing;\n")
for t in ("divisions", "districts", "areas", "species", "breeds"):
    lines.append(f"select setval(pg_get_serial_sequence('public.{t}', 'id'), (select max(id) from public.{t}));")

open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print("rows:", len(divisions), len(districts), len(rows), len(SPECIES), bid - 1)


def js(v):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


district_objs = [
    {"id": int(d["id"]), "div": int(d["division_id"]), "en": d["name"], "bn": d["bn_name"], "lat": float(d["lat"]), "lon": float(d["lon"])}
    for d in districts
]
district_objs.sort(key=lambda d: (d["id"] != 47, d["id"] != 8, d["en"]))  # Dhaka, Chattogram first
species_objs = [{"id": i + 1, "slug": s_, "en": en, "bn": bn} for i, (s_, en, bn, _) in enumerate(SPECIES)]
breed_objs, next_breed = [], 1
for i, (_, _, _, breeds) in enumerate(SPECIES):
    for b in breeds:
        en, bn = b.split("|")
        breed_objs.append({"id": next_breed, "sp": i + 1, "en": en, "bn": bn})
        next_breed += 1
# City thanas first within a district, then upazilas by name.
area_objs.sort(key=lambda a: (a["d"], not a.get("city", False), a["en"]))
for a in area_objs:
    a.pop("city", None)

(ROOT / "src" / "content" / "geo.ts").write_text(
    "// Generated by scripts/seed/gen_reference_seed.py from the same data as the database seed. Do not edit.\n"
    "export interface District {\n  id: number;\n  div: number;\n  en: string;\n  bn: string;\n  lat: number;\n  lon: number;\n}\n"
    "export interface Species {\n  id: number;\n  slug: string;\n  en: string;\n  bn: string;\n}\n"
    "export interface Breed {\n  id: number;\n  sp: number;\n  en: string;\n  bn: string;\n}\n\n"
    f"export const DISTRICTS: readonly District[] = {js(district_objs)};\n\n"
    f"export const SPECIES: readonly Species[] = {js(species_objs)};\n\n"
    f"export const BREEDS: readonly Breed[] = {js(breed_objs)};\n",
    encoding="utf-8",
    newline="\n",
)
(ROOT / "src" / "content" / "geo-areas.ts").write_text(
    "// Generated by scripts/seed/gen_reference_seed.py. Do not edit. Loaded on demand (dynamic import).\n"
    "export interface Area {\n  id: number;\n  d: number;\n  en: string;\n  bn: string;\n  lat: number | null;\n  lon: number | null;\n}\n\n"
    f"export const AREAS: readonly Area[] = {js(area_objs)};\n",
    encoding="utf-8",
    newline="\n",
)
