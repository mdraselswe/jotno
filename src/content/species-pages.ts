/**
 * ✏️ One landing page per animal (`/vets/for/<slug>/`): what owners and
 * farmers in Bangladesh search for ("বিড়ালের ডাক্তার", "গরুর ডাক্তার", "vet
 * for cats Dhaka"). Each page has its own text, so none is a thin copy of
 * another. General guidance only, written to get the animal to a vet: have a
 * vet review it (see the launch checklist). Plain data: scripts import it.
 *
 * `title` is the search result title, `h1` the page heading ([accent] markup),
 * `intro` the opening paragraph, `issues` what vets on Jotno commonly help
 * with, `faq` short questions shown on the page with FAQPage structured data.
 */
export interface SpeciesPage {
  title: string;
  description: string;
  h1: string;
  intro: string;
  issuesTitle: string;
  issues: readonly string[];
  faq: readonly { q: string; a: string }[];
}

export type SpeciesSlug = "cat" | "dog" | "bird" | "rabbit" | "cow" | "goat" | "chicken";
export const SPECIES_PAGE_SLUGS: readonly SpeciesSlug[] = [
  "cat",
  "dog",
  "bird",
  "rabbit",
  "cow",
  "goat",
  "chicken",
];

export const speciesPages: Record<string, Record<SpeciesSlug, SpeciesPage>> = {
  bn: {
    cat: {
      title: "বিড়ালের ডাক্তার: যাচাইকৃত ক্যাট ভেট, অনলাইন ও চেম্বারে",
      description:
        "বিড়ালের টিকা, কৃমি, চর্মরোগ, বমি-ডায়রিয়া বা খাওয়া বন্ধ? ঢাকাসহ সারা বাংলাদেশে যাচাইকৃত বিড়ালের ডাক্তারের সাথে অনলাইনে চ্যাট করুন বা চেম্বারে ভিজিট বুক করুন।",
      h1: "[বিড়ালের] ডাক্তার",
      intro:
        "বিড়াল অসুস্থ হলে অনেক সময় লুকিয়ে থাকে, তাই ছোট লক্ষণও গুরুত্ব দিন। যত্নে BVC-যাচাইকৃত ভেটরা বিড়ালের টিকা, কৃমিনাশক, চর্মরোগ, পেটের সমস্যা আর বাচ্চা বিড়ালের যত্নে সাহায্য করেন: অনলাইনে ছবি পাঠিয়ে চ্যাট, বা কাছের চেম্বারে ভিজিট।",
      issuesTitle: "বিড়ালের যেসব সমস্যায় ভেটরা সাহায্য করেন",
      issues: [
        "টিকা আর কৃমিনাশকের সময়সূচি",
        "লোম পড়া, চুলকানি, ছত্রাক (রিংওয়ার্ম) আর মাইট",
        "বমি, ডায়রিয়া, খাওয়া বন্ধ",
        "প্রস্রাবে কষ্ট বা প্রস্রাব না হওয়া (জরুরি)",
        "খাসি/বন্ধ্যাকরণ (স্পে-নিউটার) পরামর্শ",
      ],
      faq: [
        {
          q: "বিড়ালের প্রথম টিকা কখন দিতে হয়?",
          a: "সাধারণত বাচ্চা বিড়ালের ৮–৯ সপ্তাহ বয়সে প্রথম টিকা, তারপর কয়েক সপ্তাহ পর বুস্টার, আর বয়স অনুযায়ী জলাতঙ্কের টিকা। আপনার বিড়ালের বয়স আর স্বাস্থ্য দেখে ভেট ঠিক সময়সূচি দেবেন।",
        },
        {
          q: "পুরুষ বিড়াল প্রস্রাব করতে না পারলে কী করব?",
          a: "এটা জরুরি অবস্থা। দেরি না করে আজই ভেটের কাছে নিন বা যত্নে এখনই একজন ভেটের সাথে কথা বলুন।",
        },
      ],
    },
    dog: {
      title: "কুকুরের ডাক্তার: যাচাইকৃত ডগ ভেট, টিকা ও চিকিৎসা",
      description:
        "কুকুরের জলাতঙ্ক টিকা, পারভো, আঁটালি, চর্মরোগ বা খোঁড়ানো? বাংলাদেশের যাচাইকৃত কুকুরের ডাক্তারের সাথে অনলাইনে চ্যাট করুন বা চেম্বারে ভিজিট বুক করুন।",
      h1: "[কুকুরের] ডাক্তার",
      intro:
        "ছানা থেকে বয়স্ক কুকুর, সব বয়সেই নিয়মিত টিকা আর কৃমিনাশক জরুরি। যত্নে যাচাইকৃত ভেটরা কুকুরের টিকা, আঁটালি-মাছি, চর্মরোগ, পেটের সমস্যা আর আঘাতে সাহায্য করেন, অনলাইনে বা চেম্বারে।",
      issuesTitle: "কুকুরের যেসব সমস্যায় ভেটরা সাহায্য করেন",
      issues: [
        "জলাতঙ্ক আর ছানার টিকার সময়সূচি",
        "আঁটালি, মাছি আর চর্মরোগ",
        "বমি, রক্তমিশ্রিত ডায়রিয়া (পারভোর লক্ষণ হতে পারে)",
        "খোঁড়ানো, আঘাত আর ক্ষত",
        "খাবার আর ওজন",
      ],
      faq: [
        {
          q: "কুকুরের জলাতঙ্ক টিকা কতদিন পর পর দিতে হয়?",
          a: "প্রথম টিকার পর সাধারণত নিয়মিত বুস্টার দিতে হয়; টিকার ধরন অনুযায়ী সময় আলাদা হয়। যত্নে টিকার তারিখ রাখলে আগে থেকে মনে করিয়ে দেওয়া হয়।",
        },
        {
          q: "কুকুরকে কামড়ালে বা কুকুর কাউকে কামড়ালে কী করব?",
          a: "ক্ষত সাবান-পানি দিয়ে ভালো করে ধুয়ে মানুষের জন্য দ্রুত ডাক্তারের কাছে যান, আর কুকুরের টিকার তথ্য নিয়ে ভেটের সাথে কথা বলুন।",
        },
      ],
    },
    bird: {
      title: "পাখির ডাক্তার: বাজরিগার, কবুতর ও খাঁচার পাখির ভেট",
      description:
        "বাজরিগার, কবুতর, ককাটিয়েল বা লাভবার্ডের ঝিমানো, পালক পড়া, শ্বাসকষ্ট বা খাওয়া বন্ধ? যাচাইকৃত পাখির ডাক্তারের সাথে অনলাইনে কথা বলুন।",
      h1: "[পাখির] ডাক্তার",
      intro:
        "পাখি অসুখ লুকিয়ে রাখে, তাই ঝিমানো বা পালক ফুলিয়ে বসে থাকা মানেই দ্রুত পরামর্শ দরকার। যত্নে যাচাইকৃত ভেটরা বাজরিগার, কবুতর, ককাটিয়েল আর অন্য খাঁচার পাখির যত্নে সাহায্য করেন।",
      issuesTitle: "পাখির যেসব সমস্যায় ভেটরা সাহায্য করেন",
      issues: [
        "ঝিমানো, খাওয়া বন্ধ, পালক ফুলিয়ে বসে থাকা",
        "পালক পড়া আর ঠোঁট-নখের সমস্যা",
        "শ্বাসকষ্ট আর হাঁচি",
        "পাতলা পায়খানা",
        "খাবার আর খাঁচার যত্ন",
      ],
      faq: [
        {
          q: "পাখি ঝিমাচ্ছে আর খাচ্ছে না, কী করব?",
          a: "পাখিকে উষ্ণ আর শান্ত জায়গায় রাখুন, আর দেরি না করে ভেটের পরামর্শ নিন। পাখির অবস্থা খুব দ্রুত খারাপ হতে পারে।",
        },
        {
          q: "কবুতরের চিকিৎসাও কি পাওয়া যায়?",
          a: 'হ্যাঁ। প্রাণী হিসেবে "পাখি" বেছে খুঁজলে যে ভেটরা পাখির চিকিৎসা করেন তাদের দেখবেন।',
        },
      ],
    },
    rabbit: {
      title: "খরগোশের ডাক্তার: যাচাইকৃত ভেট, অনলাইন পরামর্শ",
      description:
        "খরগোশের দাঁত বড় হওয়া, খাওয়া বন্ধ, ডায়রিয়া বা গরমে কষ্ট? বাংলাদেশের যাচাইকৃত খরগোশের ডাক্তারের সাথে অনলাইনে চ্যাট করুন।",
      h1: "[খরগোশের] ডাক্তার",
      intro:
        "খরগোশ একদিন না খেলেও তা গুরুতর হতে পারে। যত্নে যাচাইকৃত ভেটরা খরগোশের দাঁত, পেট, লোম আর গরমে যত্ন নিয়ে পরামর্শ দেন।",
      issuesTitle: "খরগোশের যেসব সমস্যায় ভেটরা সাহায্য করেন",
      issues: ["দাঁত বড় হয়ে যাওয়া", "খাওয়া বা পায়খানা বন্ধ", "ডায়রিয়া", "গরমে হিটস্ট্রোক", "লোম পড়া আর চর্মরোগ"],
      faq: [
        {
          q: "খরগোশ খাচ্ছে না, কী করব?",
          a: "খরগোশের খাওয়া বা পায়খানা বন্ধ হওয়া জরুরি লক্ষণ। আজই ভেটের পরামর্শ নিন।",
        },
        {
          q: "গরমে খরগোশকে কীভাবে ভালো রাখব?",
          a: "ছায়া আর বাতাস চলাচলের জায়গায় রাখুন, সবসময় পরিষ্কার পানি দিন। হাঁপানো বা নিস্তেজ হলে দ্রুত ভেট দেখান।",
        },
      ],
    },
    cow: {
      title: "গরুর ডাক্তার: লাম্পি স্কিন, ক্ষুরারোগ ও খামারের ভেট",
      description:
        "গরুর লাম্পি স্কিন, ক্ষুরারোগ, জ্বর, ওলান ফোলা (ম্যাস্টাইটিস), দুধ কমে যাওয়া বা বাছুরের সমস্যা? যাচাইকৃত গরুর ডাক্তারের সাথে অনলাইনে কথা বলুন বা খামারে ভিজিটের ভেট খুঁজুন।",
      h1: "[গরুর] ডাক্তার",
      intro:
        "খামারে একটা গরু অসুস্থ হলে বাকিগুলোর ঝুঁকিও বাড়ে। যত্নে যাচাইকৃত ভেটরা গরুর রোগ চেনা, টিকা, কৃমিনাশক, দুধ আর বাছুরের যত্নে সাহায্য করেন; কেউ কেউ খামারেও যান।",
      issuesTitle: "গরুর যেসব সমস্যায় ভেটরা সাহায্য করেন",
      issues: [
        "লাম্পি স্কিন রোগ (চামড়ায় গুটি, জ্বর)",
        "ক্ষুরারোগ (মুখ ও খুরে ঘা)",
        "ওলান ফোলা আর দুধ কমে যাওয়া",
        "জ্বর, পেট ফাঁপা আর খাওয়া বন্ধ",
        "বাছুরের যত্ন আর টিকার সময়সূচি",
      ],
      faq: [
        {
          q: "গরুর লাম্পি স্কিন রোগ হলে কী করব?",
          a: "আক্রান্ত গরুকে আলাদা রাখুন, মশা-মাছি কমান, আর দ্রুত ভেট বা উপজেলা প্রাণিসম্পদ দপ্তরের পরামর্শ নিন। নিজে থেকে ওষুধ দেবেন না।",
        },
        {
          q: "খামারে এসে গরু দেখবেন এমন ভেট পাব?",
          a: 'যে ভেটরা খামারে বা বাড়িতে যান, তাদের প্রোফাইলে "বাসায় দেখেন" লেখা থাকে। জেলা দিয়ে খুঁজে দেখুন।',
        },
      ],
    },
    goat: {
      title: "ছাগলের ডাক্তার: পিপিআর, কৃমি ও ব্ল্যাক বেঙ্গলের যত্ন",
      description:
        "ছাগলের পিপিআর, কৃমি, নিউমোনিয়া, ডায়রিয়া বা ছানার সমস্যা? ব্ল্যাক বেঙ্গল ছাগলসহ সব ছাগলের জন্য যাচাইকৃত ভেটের সাথে অনলাইনে কথা বলুন।",
      h1: "[ছাগলের] ডাক্তার",
      intro:
        "পিপিআরের মতো রোগ ছাগলের খামারে দ্রুত ছড়ায়, তাই টিকা আর শুরুতেই চিকিৎসা জরুরি। যত্নে যাচাইকৃত ভেটরা ব্ল্যাক বেঙ্গলসহ সব ছাগলের রোগ, কৃমিনাশক আর ছানার যত্নে সাহায্য করেন।",
      issuesTitle: "ছাগলের যেসব সমস্যায় ভেটরা সাহায্য করেন",
      issues: [
        "পিপিআর (জ্বর, নাক-চোখ দিয়ে পানি, ডায়রিয়া)",
        "কৃমি আর রক্তশূন্যতা",
        "নিউমোনিয়া আর শ্বাসকষ্ট",
        "ছানার যত্ন",
        "টিকার সময়সূচি",
      ],
      faq: [
        {
          q: "ছাগলের পিপিআর রোগের লক্ষণ কী?",
          a: "জ্বর, নাক-চোখ দিয়ে পানি পড়া, মুখে ঘা আর ডায়রিয়া দেখা দিতে পারে। আক্রান্ত ছাগলকে আলাদা রাখুন আর দ্রুত ভেটের পরামর্শ নিন।",
        },
        {
          q: "ছাগলকে কতদিন পর পর কৃমির ওষুধ দিতে হয়?",
          a: "এলাকা, বয়স আর খামারের অবস্থা অনুযায়ী আলাদা হয়। ভেট আপনার খামারের জন্য সময়সূচি ঠিক করে দেবেন, আর যত্নে তারিখ রাখলে মনে করিয়ে দেওয়া হয়।",
        },
      ],
    },
    chicken: {
      title: "মুরগির ডাক্তার: রানীক্ষেত, গামবোরো ও খামারের ভেট",
      description:
        "মুরগির রানীক্ষেত, গামবোরো, ককসিডিওসিস, হঠাৎ মারা যাওয়া বা ডিম কমে যাওয়া? লেয়ার, ব্রয়লার আর দেশি মুরগির খামারের জন্য যাচাইকৃত ভেটের সাথে অনলাইনে কথা বলুন।",
      h1: "[মুরগির] ডাক্তার",
      intro:
        "মুরগির খামারে রোগ একদিনেই ছড়িয়ে পড়তে পারে। যত্নে যাচাইকৃত ভেটরা লেয়ার, ব্রয়লার আর দেশি মুরগির রোগ চেনা, টিকার সময়সূচি আর খাবার নিয়ে পরামর্শ দেন।",
      issuesTitle: "মুরগির যেসব সমস্যায় ভেটরা সাহায্য করেন",
      issues: [
        "রানীক্ষেত আর গামবোরো রোগ",
        "রক্ত আমাশয় (ককসিডিওসিস)",
        "হঠাৎ অনেক মুরগি মারা যাওয়া",
        "ডিম কমে যাওয়া",
        "টিকার সময়সূচি আর খাবার",
      ],
      faq: [
        {
          q: "খামারে হঠাৎ অনেক মুরগি মারা গেলে কী করব?",
          a: "অসুস্থ মুরগি আলাদা করুন, মৃত মুরগি নিরাপদে সরান, আর দ্রুত ভেট বা উপজেলা প্রাণিসম্পদ দপ্তরে জানান। কয়েকটা ছবি তুলে রাখলে ভেটের বুঝতে সুবিধা হয়।",
        },
        {
          q: "মুরগির টিকার সময়সূচি কোথায় পাব?",
          a: "মুরগির ধরন আর বয়স অনুযায়ী সময়সূচি আলাদা। যত্নে একজন ভেটকে আপনার খামারের তথ্য দিলে তিনি সময়সূচি বলে দেবেন।",
        },
      ],
    },
  },
  en: {
    cat: {
      title: "Cat vet in Bangladesh: verified vets online and at clinics",
      description:
        "Cat vaccines, worms, skin problems, vomiting or not eating? Chat online with a verified cat vet or book a clinic visit in Dhaka, Chattogram or anywhere in Bangladesh.",
      h1: "Vets for [cats]",
      intro:
        "Cats often hide when they are ill, so small signs matter. BVC-verified vets on Jotno help with cat vaccines, deworming, skin problems, stomach upsets and kitten care: chat online with photos, or visit a clinic near you.",
      issuesTitle: "What vets on Jotno help cats with",
      issues: [
        "Vaccine and deworming schedules",
        "Hair loss, itching, ringworm and mites",
        "Vomiting, diarrhoea, not eating",
        "Straining to pee or not peeing (an emergency)",
        "Spay and neuter advice",
      ],
      faq: [
        {
          q: "When should a kitten get its first vaccine?",
          a: "Usually at about 8–9 weeks, with a booster a few weeks later and a rabies vaccine by age. A vet sets the exact schedule for your cat's age and health.",
        },
        {
          q: "My male cat can't pee. What should I do?",
          a: "This is an emergency. See a vet today, or talk to a vet on Jotno right now.",
        },
      ],
    },
    dog: {
      title: "Dog vet in Bangladesh: verified vets, vaccines and treatment",
      description:
        "Dog rabies vaccine, parvo, ticks, skin problems or limping? Chat online with a verified dog vet in Bangladesh or book a clinic visit.",
      h1: "Vets for [dogs]",
      intro:
        "From puppies to old dogs, regular vaccines and deworming matter at every age. Verified vets on Jotno help with dog vaccines, ticks and fleas, skin problems, stomach upsets and injuries, online or at their clinic.",
      issuesTitle: "What vets on Jotno help dogs with",
      issues: [
        "Rabies and puppy vaccine schedules",
        "Ticks, fleas and skin problems",
        "Vomiting and bloody diarrhoea (can be parvo)",
        "Limping, injuries and wounds",
        "Food and weight",
      ],
      faq: [
        {
          q: "How often does a dog need a rabies vaccine?",
          a: "After the first dose, regular boosters are needed; the interval depends on the vaccine. Add the date in Jotno and you get a reminder before it is due.",
        },
        {
          q: "What should I do after a dog bite?",
          a: "Wash the wound well with soap and water and see a doctor quickly, then talk to a vet about the dog's vaccine record.",
        },
      ],
    },
    bird: {
      title: "Bird vet in Bangladesh: budgies, pigeons and cage birds",
      description:
        "Budgie, pigeon, cockatiel or lovebird fluffed up, losing feathers, breathing hard or not eating? Talk to a verified bird vet online.",
      h1: "Vets for [birds]",
      intro:
        "Birds hide illness, so a bird sitting fluffed up needs advice quickly. Verified vets on Jotno help with budgies, pigeons, cockatiels and other cage birds.",
      issuesTitle: "What vets on Jotno help birds with",
      issues: [
        "Fluffed up, sleepy, not eating",
        "Feather loss, beak and nail problems",
        "Breathing trouble and sneezing",
        "Watery droppings",
        "Food and cage care",
      ],
      faq: [
        {
          q: "My bird is sleepy and not eating. What should I do?",
          a: "Keep it warm and quiet and get a vet's advice without waiting. Birds can get worse very fast.",
        },
        {
          q: "Can I get help for pigeons?",
          a: 'Yes. Search with "Bird" as the animal to see vets who treat birds.',
        },
      ],
    },
    rabbit: {
      title: "Rabbit vet in Bangladesh: verified vets, online advice",
      description:
        "Rabbit with overgrown teeth, not eating, diarrhoea or struggling in the heat? Chat online with a verified rabbit vet in Bangladesh.",
      h1: "Vets for [rabbits]",
      intro:
        "A rabbit that stops eating for even a day can be seriously ill. Verified vets on Jotno advise on rabbit teeth, digestion, fur and care in hot weather.",
      issuesTitle: "What vets on Jotno help rabbits with",
      issues: [
        "Overgrown teeth",
        "Not eating or no droppings",
        "Diarrhoea",
        "Heatstroke",
        "Fur loss and skin problems",
      ],
      faq: [
        {
          q: "My rabbit is not eating. What should I do?",
          a: "A rabbit that stops eating or passing droppings needs a vet today.",
        },
        {
          q: "How do I keep a rabbit well in the heat?",
          a: "Keep it in shade with good airflow and fresh water at all times. If it pants or goes limp, see a vet quickly.",
        },
      ],
    },
    cow: {
      title: "Cattle vet in Bangladesh: lumpy skin, foot-and-mouth, farm visits",
      description:
        "Cow with lumpy skin disease, foot-and-mouth, fever, mastitis, less milk or calf problems? Talk to a verified cattle vet online or find a vet who visits farms.",
      h1: "Vets for [cows]",
      intro:
        "When one cow on a farm falls ill, the rest are at risk too. Verified vets on Jotno help with cattle diseases, vaccines, deworming, milk and calf care; some visit farms.",
      issuesTitle: "What vets on Jotno help cattle with",
      issues: [
        "Lumpy skin disease (skin lumps, fever)",
        "Foot-and-mouth disease",
        "Mastitis and falling milk yield",
        "Fever, bloat and not eating",
        "Calf care and vaccine schedules",
      ],
      faq: [
        {
          q: "What should I do if my cow has lumpy skin disease?",
          a: "Keep it apart from the herd, reduce flies and mosquitoes and get a vet's or the upazila livestock office's advice quickly. Don't give medicine on your own.",
        },
        {
          q: "Can I find a vet who comes to my farm?",
          a: 'Vets who visit farms or homes show "Home visit" on their profile. Search by your district.',
        },
      ],
    },
    goat: {
      title: "Goat vet in Bangladesh: PPR, worms and Black Bengal care",
      description:
        "Goat with PPR, worms, pneumonia, diarrhoea or kid problems? Talk online with a verified vet for Black Bengal and other goats.",
      h1: "Vets for [goats]",
      intro:
        "Diseases like PPR spread fast through a goat farm, so vaccines and early treatment matter. Verified vets on Jotno help with goat diseases, deworming and kid care, Black Bengal included.",
      issuesTitle: "What vets on Jotno help goats with",
      issues: [
        "PPR (fever, runny nose and eyes, diarrhoea)",
        "Worms and anaemia",
        "Pneumonia and breathing trouble",
        "Kid care",
        "Vaccine schedules",
      ],
      faq: [
        {
          q: "What are the signs of PPR in goats?",
          a: "Fever, runny nose and eyes, mouth sores and diarrhoea. Keep the goat apart and get a vet's advice quickly.",
        },
        {
          q: "How often should goats be dewormed?",
          a: "It depends on the area, age and farm. A vet sets a schedule for your farm, and Jotno reminds you when it is due.",
        },
      ],
    },
    chicken: {
      title: "Poultry vet in Bangladesh: Newcastle, Gumboro and farm advice",
      description:
        "Chickens with Newcastle (Ranikhet), Gumboro, coccidiosis, sudden deaths or fewer eggs? Talk online with a verified vet for layer, broiler and local chicken farms.",
      h1: "Vets for [chickens]",
      intro:
        "Disease can spread through a poultry farm in a day. Verified vets on Jotno help layer, broiler and local chicken farmers spot diseases and plan vaccines and feed.",
      issuesTitle: "What vets on Jotno help poultry with",
      issues: [
        "Newcastle (Ranikhet) and Gumboro",
        "Coccidiosis (bloody droppings)",
        "Sudden deaths in the flock",
        "Fewer eggs",
        "Vaccine schedules and feed",
      ],
      faq: [
        {
          q: "Many chickens died suddenly. What should I do?",
          a: "Separate sick birds, remove dead ones safely and tell a vet or the upazila livestock office quickly. A few photos help the vet.",
        },
        {
          q: "Where can I get a poultry vaccine schedule?",
          a: "It depends on the type and age of the birds. Give a vet on Jotno your farm's details and they will set one.",
        },
      ],
    },
  },
};
