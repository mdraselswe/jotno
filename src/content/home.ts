/**
 * ✏️ Home page copy, one entry per language. Short UI labels live in
 * src/i18n; this is the marketing text. Icons are mapped in the page.
 */
export type StepIcon = "search" | "chat" | "heart";

/** Animals on the home orbit (photos in public/images/pets/<slug>-{400,800}.webp). */
export const ORBIT_PETS = ["cat", "dog", "bird", "rabbit", "cow", "goat", "chicken"] as const;
export type OrbitPet = (typeof ORBIT_PETS)[number];

export interface PricePlan {
  name: string;
  /** Shown big; "{fee}" etc. are filled from src/config/business.ts. */
  price: string;
  unit: string;
  body: string;
  points: readonly string[];
  cta: string;
  /** Which page the button opens. */
  href: "ask" | "vets" | "forVets";
  featured?: boolean;
}

export interface HomeContent {
  hero: { eyebrow: string; title: string; body: string };
  steps: readonly { icon: StepIcon; title: string; body: string }[];
  trust: readonly string[];
  vetCta: { title: string; body: string; button: string };
  emergency: { title: string; body: string; button: string };
  orbit: {
    label: string;
    prev: string;
    next: string;
    pause: string;
    play: string;
    /** One line per animal, under its name. */
    pets: Record<OrbitPet, string>;
    find: string;
    badges: readonly string[];
  };
  marquee: readonly string[];
  stepsTitle: string;
  pricing: {
    eyebrow: string;
    title: string;
    sub: string;
    popular: string;
    plans: readonly PricePlan[];
    note: string;
  };
  stickers: readonly string[];
  shopTeaser: { title: string; body: string; button: string };
}

export const homeContent: Record<string, HomeContent> = {
  en: {
    hero: {
      eyebrow: "Verified vets across Bangladesh",
      title: "Care for your pet, [any time]",
      body: "Find a BVC-verified vet near you, chat with one in minutes, book a clinic visit, and never miss a vaccine.",
    },
    steps: [
      {
        icon: "search",
        title: "Find a vet",
        body: "Search by area and animal. Every vet is checked against the BVC register.",
      },
      {
        icon: "chat",
        title: "Chat or book",
        body: "Pay a small fee for a 24-hour chat, or book a clinic visit. No reply in 30 minutes? Full refund.",
      },
      {
        icon: "heart",
        title: "Keep them healthy",
        body: "Add your pet's vaccines and deworming. We remind you before each one is due.",
      },
    ],
    trust: [
      "BVC-verified vets only",
      "Refund if the vet doesn't reply",
      "Pay with bKash or Nagad",
      "Free questions answered by vets",
    ],
    vetCta: {
      title: "Are you a vet?",
      body: "Get found by pet owners near you, earn from chat consults, and manage bookings in one place. Free to join.",
      button: "Join as a vet",
    },
    emergency: {
      title: "Emergency?",
      body: "Poisoning, heavy bleeding, breathing trouble or a road accident: see first aid and 24/7 vets now.",
      button: "Emergency help",
    },
    orbit: {
      label: "Animals we care for",
      prev: "Previous animal",
      next: "Next animal",
      pause: "Pause the slideshow",
      play: "Play the slideshow",
      pets: {
        cat: "Vaccines, worms, skin and tummy trouble",
        dog: "Puppy shots, rabies, ticks and limps",
        bird: "Budgies, pigeons and every feathered friend",
        rabbit: "Teeth, fur and gentle handling",
        cow: "Farm visits, fever, milk and calving",
        goat: "Black Bengal care, PPR and kids",
        chicken: "Flock health, Newcastle and feed",
      },
      find: "Find a {pet} vet",
      badges: ["BVC verified", "Reply in 30 min", "Money-back promise"],
    },
    marquee: [
      "Verified vets",
      "24-hour chat",
      "Clinic visits",
      "Vaccine reminders",
      "Free vet answers",
      "Pet shop",
      "bKash · Nagad",
      "Emergency help",
    ],
    stepsTitle: "Care in three small steps",
    pricing: {
      eyebrow: "Honest prices",
      title: "Pay only when a vet helps",
      sub: "No subscription. Questions and reminders are free; a chat or a visit costs what the vet sets.",
      popular: "Most used",
      plans: [
        {
          name: "Free",
          price: "{free}",
          unit: "always",
          body: "Everything to keep a pet healthy day to day.",
          points: [
            "Ask vets in public Q&A",
            "Vaccine & deworming reminders",
            "Care guides by vets",
            "Emergency first aid",
          ],
          cta: "Ask a question",
          href: "ask",
        },
        {
          name: "Vet chat",
          price: "from {chat}",
          unit: "per chat",
          body: "Private 24-hour chat with a verified vet, photos included.",
          points: [
            "Vet replies within 30 minutes",
            "Full refund if they don't",
            "Prescription notes in the chat",
            "Pay by bKash or Nagad",
          ],
          cta: "Find a vet",
          href: "vets",
          featured: true,
        },
        {
          name: "Clinic visit",
          price: "{booking}",
          unit: "booking fee",
          body: "Book a time at the vet's chamber; pay the visit fee there.",
          points: [
            "Pick a time that suits you",
            "Reminder 3 hours before",
            "Refund if the vet cancels",
            "Directions on the map",
          ],
          cta: "Book a visit",
          href: "vets",
        },
      ],
      note: "Vets join free and keep {keep}% of every chat.",
    },
    stickers: ["BVC verified ✓", "Get paid weekly", "Free to join", "Your own page", "Bookings in one place"],
    shopTeaser: {
      title: "Food, litter and care, delivered",
      body: "Checked by our team. Pay by bKash, Nagad or cash on delivery, anywhere in Bangladesh.",
      button: "Visit the shop",
    },
  },
  bn: {
    hero: {
      eyebrow: "সারা বাংলাদেশের যাচাইকৃত ভেট",
      title: "আপনার পোষা প্রাণীর যত্ন, [যেকোনো সময়]",
      body: "কাছের BVC-যাচাইকৃত ভেট খুঁজুন, কয়েক মিনিটে চ্যাট করুন, চেম্বারে ভিজিট বুক করুন, আর কোনো টিকা মিস করবেন না।",
    },
    steps: [
      {
        icon: "search",
        title: "ভেট খুঁজুন",
        body: "এলাকা আর প্রাণী দিয়ে খুঁজুন। প্রতিটি ভেট BVC রেজিস্টারের সাথে মিলিয়ে যাচাই করা।",
      },
      {
        icon: "chat",
        title: "চ্যাট বা বুক করুন",
        body: "অল্প ফি দিয়ে ২৪ ঘণ্টার চ্যাট, বা চেম্বারে ভিজিট বুক করুন। ৩০ মিনিটে উত্তর না পেলে পুরো টাকা ফেরত।",
      },
      {
        icon: "heart",
        title: "সুস্থ রাখুন",
        body: "টিকা আর কৃমিনাশকের তথ্য রাখুন। সময় আসার আগেই আমরা মনে করিয়ে দেব।",
      },
    ],
    trust: [
      "শুধু BVC-যাচাইকৃত ভেট",
      "ভেট উত্তর না দিলে টাকা ফেরত",
      "বিকাশ বা নগদে পেমেন্ট",
      "ভেটদের দেওয়া ফ্রি উত্তর",
    ],
    vetCta: {
      title: "আপনি কি ভেট?",
      body: "কাছের পোষা প্রাণীর মালিকরা আপনাকে খুঁজে পাবেন, চ্যাট কনসাল্টে আয় করবেন, বুকিং এক জায়গায় সামলাবেন। যোগ দেওয়া ফ্রি।",
      button: "ভেট হিসেবে যোগ দিন",
    },
    emergency: {
      title: "জরুরি অবস্থা?",
      body: "বিষ খাওয়া, বেশি রক্তপাত, শ্বাসকষ্ট বা দুর্ঘটনা: এখনই প্রাথমিক চিকিৎসা আর ২৪/৭ ভেট দেখুন।",
      button: "জরুরি সাহায্য",
    },
    orbit: {
      label: "যাদের যত্ন নিই",
      prev: "আগের প্রাণী",
      next: "পরের প্রাণী",
      pause: "স্লাইড থামান",
      play: "স্লাইড চালু করুন",
      pets: {
        cat: "টিকা, কৃমি, চামড়া আর পেটের সমস্যা",
        dog: "ছানার টিকা, জলাতঙ্ক, আঁটালি আর খোঁড়ানো",
        bird: "বাজরিগার, কবুতর আর সব পাখি",
        rabbit: "দাঁত, লোম আর আদরে সামলানো",
        cow: "খামারে ভিজিট, জ্বর, দুধ আর বাছুর",
        goat: "ব্ল্যাক বেঙ্গলের যত্ন, পিপিআর আর ছানা",
        chicken: "খামারের স্বাস্থ্য, রানীক্ষেত আর খাবার",
      },
      find: "{pet}র ভেট খুঁজুন",
      badges: ["BVC যাচাইকৃত", "৩০ মিনিটে উত্তর", "না হলে টাকা ফেরত"],
    },
    marquee: [
      "যাচাইকৃত ভেট",
      "২৪ ঘণ্টার চ্যাট",
      "চেম্বারে ভিজিট",
      "টিকার রিমাইন্ডার",
      "ভেটদের ফ্রি উত্তর",
      "পেট শপ",
      "বিকাশ · নগদ",
      "জরুরি সাহায্য",
    ],
    stepsTitle: "তিনটি ছোট ধাপে যত্ন",
    pricing: {
      eyebrow: "সৎ দাম",
      title: "ভেট সাহায্য করলে তবেই পেমেন্ট",
      sub: "কোনো সাবস্ক্রিপশন নেই। প্রশ্ন আর রিমাইন্ডার ফ্রি; চ্যাট বা ভিজিটের ফি ভেট নিজে ঠিক করেন।",
      popular: "সবচেয়ে জনপ্রিয়",
      plans: [
        {
          name: "ফ্রি",
          price: "{free}",
          unit: "সবসময়",
          body: "রোজকার যত্নে যা যা লাগে।",
          points: [
            "পাবলিক প্রশ্নোত্তরে ভেটদের জিজ্ঞেস করুন",
            "টিকা ও কৃমিনাশকের রিমাইন্ডার",
            "ভেটদের লেখা গাইড",
            "জরুরি প্রাথমিক চিকিৎসা",
          ],
          cta: "প্রশ্ন করুন",
          href: "ask",
        },
        {
          name: "ভেট চ্যাট",
          price: "{chat} থেকে",
          unit: "প্রতি চ্যাট",
          body: "যাচাইকৃত ভেটের সাথে ২৪ ঘণ্টার প্রাইভেট চ্যাট, ছবিসহ।",
          points: [
            "৩০ মিনিটের মধ্যে ভেটের উত্তর",
            "না দিলে পুরো টাকা ফেরত",
            "চ্যাটেই প্রেসক্রিপশন নোট",
            "বিকাশ বা নগদে পেমেন্ট",
          ],
          cta: "ভেট খুঁজুন",
          href: "vets",
          featured: true,
        },
        {
          name: "চেম্বারে ভিজিট",
          price: "{booking}",
          unit: "বুকিং ফি",
          body: "ভেটের চেম্বারে সময় বুক করুন; ভিজিট ফি সেখানে দিন।",
          points: [
            "সুবিধামতো সময় বেছে নিন",
            "৩ ঘণ্টা আগে রিমাইন্ডার",
            "ভেট বাতিল করলে টাকা ফেরত",
            "ম্যাপে ঠিকানা",
          ],
          cta: "ভিজিট বুক করুন",
          href: "vets",
        },
      ],
      note: "ভেটরা ফ্রিতে যোগ দেন আর প্রতিটি চ্যাটের {keep}% নিজের কাছে রাখেন।",
    },
    stickers: [
      "BVC যাচাইকৃত ✓",
      "প্রতি সপ্তাহে পেমেন্ট",
      "যোগ দেওয়া ফ্রি",
      "নিজের প্রোফাইল পাতা",
      "সব বুকিং এক জায়গায়",
    ],
    shopTeaser: {
      title: "খাবার, লিটার আর যত্নের জিনিস, ঘরে পৌঁছে",
      body: "আমাদের টিমের যাচাই করা। বিকাশ, নগদ বা ক্যাশ অন ডেলিভারিতে পেমেন্ট, সারা বাংলাদেশে।",
      button: "শপে যান",
    },
  },
};
