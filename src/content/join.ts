/**
 * The two shareable onboarding pages: /join (pet owners) and /for-vets (vets).
 * Text in [brackets] gets the brand highlight. {pct}, {fee}, {booking},
 * {window}, {minPayout} are filled from config/business.ts.
 */
import type { SpotName } from "@/components/illustrations/spots";

export interface JoinBenefit {
  spot: SpotName;
  title: string;
  body: string;
}

export interface JoinContent {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  secondary: string;
  trust: readonly string[];
  benefitsTitle: string;
  benefits: readonly JoinBenefit[];
  stepsTitle: string;
  steps: readonly { title: string; body: string }[];
  faqTitle: string;
  faq: readonly { q: string; a: string }[];
  share: { title: string; body: string; button: string; text: string; copied: string };
  final: { title: string; body: string };
}

export interface OwnerJoinContent extends JoinContent {
  prices: {
    title: string;
    free: string;
    paid: string;
    freeItems: readonly string[];
    paidItems: readonly string[];
  };
}

export interface VetJoinContent extends JoinContent {
  calc: {
    title: string;
    sub: string;
    chats: string;
    fee: string;
    perDay: string;
    monthly: string;
    keep: string;
    note: string;
  };
}

export const ownerJoinContent: Record<string, OwnerJoinContent> = {
  en: {
    eyebrow: "For pet owners",
    title: "Your pet's vet, [in your pocket]",
    body: "Find a BVC-verified vet near you, chat in minutes when something worries you, book a clinic visit and keep every vaccine on time. Free to join.",
    cta: "Create a free account",
    secondary: "Find a vet near me",
    trust: [
      "BVC-verified vets",
      "Money back if no reply in {window} minutes",
      "Bangla first, built for phones",
    ],
    benefitsTitle: "Everything your pet needs, in one place",
    benefits: [
      {
        spot: "search",
        title: "Vets near you",
        body: "Search by area and animal. Every vet is checked against the BVC register before they're shown as verified.",
      },
      {
        spot: "chat",
        title: "Chat in minutes",
        body: "Send photos and ask a vet from your phone. If they don't reply within {window} minutes, you get your money back.",
      },
      {
        spot: "vet",
        title: "Book a clinic visit",
        body: "Pick a time from the vet's own hours. A small booking fee holds your slot, no phone tag.",
      },
      {
        spot: "question",
        title: "Free questions",
        body: "Ask in public and verified vets answer. Read answers to questions like yours.",
      },
      {
        spot: "care",
        title: "Never miss a vaccine",
        body: "Add your pets once. We remind you before each vaccine and deworming is due.",
      },
      {
        spot: "shop",
        title: "Food and care, delivered",
        body: "Food, litter and everyday care checked by our team. Cash on delivery anywhere in Bangladesh.",
      },
    ],
    stepsTitle: "Start in under a minute",
    steps: [
      { title: "Sign in", body: "With Google or a 6-digit code to your email. No password to remember." },
      { title: "Add your pet", body: "Name, animal and age, so vets and reminders fit your pet." },
      { title: "Find or ask", body: "Search vets near you, start a chat, or ask a free question." },
      { title: "Care, on time", body: "Get answers, book visits and reminders before every due date." },
    ],
    prices: {
      title: "What's free, what's paid",
      free: "Always free",
      paid: "You pay only for",
      freeItems: [
        "Your account and pet records",
        "Public questions and vet answers",
        "Vaccine and deworming reminders",
        "Pet care guides",
      ],
      paidItems: [
        "A private chat with a vet (from {fee}, set by the vet)",
        "Booking a clinic visit ({booking} to hold the slot)",
        "Shop orders (cash on delivery available)",
      ],
    },
    faqTitle: "Questions owners ask",
    faq: [
      {
        q: "How do I know a vet is real?",
        a: "Every vet uploads their BVC certificate and our team checks the BVC register before the verified badge appears.",
      },
      {
        q: "What if the vet doesn't reply?",
        a: "If a vet doesn't reply within {window} minutes of your paid chat starting, your money is refunded automatically.",
      },
      { q: "How do I pay?", a: "By bKash or Nagad. Shop orders can also be paid in cash when they arrive." },
      {
        q: "Which animals can I get help for?",
        a: "Cats, dogs, birds, rabbits, cows, goats, chickens and more. Filter vets by the animal you need.",
      },
      {
        q: "Is a chat a replacement for a clinic visit?",
        a: "No. A chat is for advice and next steps. In an emergency, go to the nearest clinic; our emergency page lists 24/7 vets.",
      },
    ],
    share: {
      title: "Know someone with a pet?",
      body: "Send them this page. It's free for them to join.",
      button: "Share this page",
      text: "Jotno: find verified vets near you, chat in minutes, never miss a vaccine.",
      copied: "Link copied",
    },
    final: { title: "Ready when your pet needs you", body: "Join free today; it takes less than a minute." },
  },
  bn: {
    eyebrow: "পোষা প্রাণীর মালিকদের জন্য",
    title: "আপনার পোষা প্রাণীর ভেট, [হাতের মুঠোয়]",
    body: "কাছের BVC-যাচাই করা ভেট খুঁজুন, চিন্তা হলে মিনিটেই চ্যাট করুন, চেম্বারে সময় বুক করুন আর কোনো টিকা মিস করবেন না। যোগ দেওয়া ফ্রি।",
    cta: "ফ্রি অ্যাকাউন্ট খুলুন",
    secondary: "কাছের ভেট খুঁজুন",
    trust: ["BVC-যাচাই করা ভেট", "{window} মিনিটে উত্তর না পেলে টাকা ফেরত", "বাংলায়, ফোনের জন্য বানানো"],
    benefitsTitle: "পোষা প্রাণীর যা লাগে, এক জায়গায়",
    benefits: [
      {
        spot: "search",
        title: "কাছের ভেট",
        body: "এলাকা আর প্রাণী দিয়ে খুঁজুন। যাচাইকৃত দেখানোর আগে প্রত্যেক ভেটকে BVC রেজিস্টারে মিলিয়ে দেখা হয়।",
      },
      {
        spot: "chat",
        title: "মিনিটেই চ্যাট",
        body: "ফোন থেকে ছবি পাঠিয়ে ভেটকে জিজ্ঞেস করুন। {window} মিনিটে উত্তর না দিলে টাকা ফেরত।",
      },
      {
        spot: "vet",
        title: "চেম্বারে সময় বুক",
        body: "ভেটের নিজের সময় থেকে বেছে নিন। অল্প বুকিং ফি দিয়ে সময় ধরে রাখুন, ফোনাফুনি নেই।",
      },
      {
        spot: "question",
        title: "ফ্রি প্রশ্ন",
        body: "সবার সামনে প্রশ্ন করুন, যাচাই করা ভেটরা উত্তর দেন। আপনার মতো প্রশ্নের উত্তরও পড়ুন।",
      },
      {
        spot: "care",
        title: "টিকা মিস হবে না",
        body: "একবার প্রাণীর তথ্য দিন। প্রতিটি টিকা আর কৃমিনাশের আগে আমরা মনে করিয়ে দেব।",
      },
      {
        spot: "shop",
        title: "খাবার আর যত্নের জিনিস, ঘরে",
        body: "আমাদের টিমের যাচাই করা খাবার, লিটার আর দরকারি জিনিস। সারা দেশে ক্যাশ অন ডেলিভারি।",
      },
    ],
    stepsTitle: "এক মিনিটেরও কমে শুরু",
    steps: [
      { title: "সাইন ইন", body: "গুগল দিয়ে, বা ইমেইলে আসা ৬ সংখ্যার কোড দিয়ে। পাসওয়ার্ড মনে রাখতে হবে না।" },
      { title: "প্রাণী যোগ করুন", body: "নাম, প্রাণী আর বয়স, যাতে ভেট আর রিমাইন্ডার আপনার প্রাণীর মতো হয়।" },
      { title: "খুঁজুন বা জিজ্ঞেস করুন", body: "কাছের ভেট খুঁজুন, চ্যাট শুরু করুন, বা ফ্রি প্রশ্ন করুন।" },
      { title: "সময়মতো যত্ন", body: "উত্তর পান, ভিজিট বুক করুন, আর প্রতিটি তারিখের আগে রিমাইন্ডার।" },
    ],
    prices: {
      title: "কী ফ্রি, কী পেইড",
      free: "সবসময় ফ্রি",
      paid: "টাকা লাগে শুধু",
      freeItems: [
        "অ্যাকাউন্ট আর প্রাণীর রেকর্ড",
        "পাবলিক প্রশ্ন আর ভেটের উত্তর",
        "টিকা আর কৃমিনাশের রিমাইন্ডার",
        "যত্নের গাইড",
      ],
      paidItems: [
        "ভেটের সাথে প্রাইভেট চ্যাট ({fee} থেকে, ভেট ঠিক করেন)",
        "চেম্বারে ভিজিট বুক (সময় ধরে রাখতে {booking})",
        "শপের অর্ডার (ক্যাশ অন ডেলিভারি আছে)",
      ],
    },
    faqTitle: "মালিকরা যা জানতে চান",
    faq: [
      {
        q: "ভেট আসল কিনা কীভাবে বুঝব?",
        a: "প্রত্যেক ভেট BVC সার্টিফিকেট আপলোড করেন, আর যাচাই ব্যাজ দেখানোর আগে আমাদের টিম BVC রেজিস্টার মিলিয়ে দেখে।",
      },
      {
        q: "ভেট উত্তর না দিলে?",
        a: "পেইড চ্যাট শুরুর {window} মিনিটের মধ্যে ভেট উত্তর না দিলে টাকা নিজে থেকেই ফেরত যায়।",
      },
      { q: "পেমেন্ট কীভাবে?", a: "বিকাশ বা নগদে। শপের অর্ডার হাতে পেয়ে ক্যাশেও দিতে পারেন।" },
      {
        q: "কোন কোন প্রাণীর জন্য?",
        a: "বিড়াল, কুকুর, পাখি, খরগোশ, গরু, ছাগল, মুরগি আর আরও। যে প্রাণীর জন্য দরকার, সেভাবে ভেট ফিল্টার করুন।",
      },
      {
        q: "চ্যাট কি চেম্বারে যাওয়ার বিকল্প?",
        a: "না। চ্যাট পরামর্শ আর পরের করণীয়ের জন্য। জরুরি হলে কাছের ক্লিনিকে যান; জরুরি পেজে ২৪/৭ ভেটের তালিকা আছে।",
      },
    ],
    share: {
      title: "পোষা প্রাণী আছে এমন কাউকে চেনেন?",
      body: "এই পেজটা পাঠিয়ে দিন। তাদের জন্য যোগ দেওয়া ফ্রি।",
      button: "পেজটা শেয়ার করুন",
      text: "যত্ন: কাছের যাচাই করা ভেট খুঁজুন, মিনিটেই চ্যাট করুন, কোনো টিকা মিস করবেন না।",
      copied: "লিংক কপি হয়েছে",
    },
    final: { title: "আপনার প্রাণীর দরকারে, সবসময় পাশে", body: "আজই ফ্রি যোগ দিন; এক মিনিটও লাগে না।" },
  },
};

export const vetJoinContent: Record<string, VetJoinContent> = {
  en: {
    eyebrow: "For veterinarians",
    title: "Grow your practice with [Jotno]",
    body: "A free profile that pet owners near you can find, paid chat consults from your phone, and clinic bookings without phone tag. You keep {keep}% of every chat.",
    cta: "Join as a vet, it's free",
    secondary: "See what you could earn",
    trust: ["Free to join", "Only {pct}% commission", "Weekly payouts"],
    benefitsTitle: "Built for how vets in Bangladesh work",
    benefits: [
      {
        spot: "search",
        title: "Get found nearby",
        body: "Owners search by area and animal. Verified vets with complete profiles rank higher.",
      },
      {
        spot: "chat",
        title: "Earn from chats",
        body: 'Set your own fee. Answer from your phone between patients; switch "available" off when you\'re busy.',
      },
      {
        spot: "vet",
        title: "Bookings without phone tag",
        body: "Set your clinic hours once. Owners pay {booking} to hold the time, so fewer no-shows.",
      },
      {
        spot: "question",
        title: "Build trust",
        body: "Answer free questions and write short guides. Each one links back to your profile.",
      },
      {
        spot: "care",
        title: "Weekly payouts",
        body: "Chat money is yours when the chat closes. We pay weekly by bKash, Nagad or bank once you reach {minPayout}.",
      },
      {
        spot: "welcome",
        title: "A verified badge",
        body: "We check your BVC registration, so owners know they're talking to a real vet.",
      },
    ],
    stepsTitle: "Live in about two working days",
    steps: [
      { title: "Sign in", body: 'With Google or your email, and choose "I\'m a vet".' },
      { title: "Build your profile", body: "Photo, qualifications, clinic, chat fee and hours." },
      { title: "Upload your BVC certificate", body: "Submit it for verification from your dashboard." },
      { title: "We verify", body: "We check the BVC register, usually within 2 working days." },
      { title: "Start earning", body: "Your profile goes live; owners nearby can chat and book." },
    ],
    calc: {
      title: "What could you earn?",
      sub: "Move the sliders. Jotno keeps {pct}%, the rest is yours.",
      chats: "Chats a day",
      fee: "Your chat fee",
      perDay: "{n} a day",
      monthly: "You'd earn about, per month",
      keep: "after the {pct}% commission, over {days} working days",
      note: "An example, not a promise: it depends on your fee, your hours and how many owners near you need help.",
    },
    faqTitle: "Questions vets ask",
    faq: [
      {
        q: "Does it cost anything to join?",
        a: "No. You pay only the {pct}% commission on paid chats. Featured placement is optional.",
      },
      {
        q: "When do I get paid?",
        a: "Chat money becomes available when the chat closes, and we pay out weekly once your balance reaches {minPayout}.",
      },
      {
        q: "What if I can't reply in time?",
        a: "Switch off \"available now\" when you're busy. If you don't reply within {window} minutes of a paid chat, the owner is refunded.",
      },
      {
        q: "Can I keep my clinic phone private?",
        a: "Yes. Owners reach you through chats and bookings; showing a phone number is up to you.",
      },
      {
        q: "Which documents do I need?",
        a: "Your BVC registration certificate. A clear photo or PDF is enough.",
      },
    ],
    share: {
      title: "Know a vet who should be here?",
      body: "Send them this page. Joining is free and verification takes about two days.",
      button: "Share with a vet",
      text: "Jotno for vets: get found by pet owners nearby, earn from chats, weekly payouts. Free to join.",
      copied: "Link copied",
    },
    final: { title: "Owners near you are already searching", body: "Set up your free profile today." },
  },
  bn: {
    eyebrow: "ভেটেরিনারিয়ানদের জন্য",
    title: "আপনার প্র্যাকটিস বাড়ান [যত্ন দিয়ে]",
    body: "কাছের পোষা প্রাণীর মালিকরা খুঁজে পাবে এমন ফ্রি প্রোফাইল, ফোন থেকেই পেইড চ্যাট কনসাল্ট, আর ফোনাফুনি ছাড়া চেম্বার বুকিং। প্রতিটি চ্যাটের {keep}% আপনার।",
    cta: "ভেট হিসেবে যোগ দিন, ফ্রি",
    secondary: "কত আয় হতে পারে দেখুন",
    trust: ["যোগ দেওয়া ফ্রি", "কমিশন মাত্র {pct}%", "প্রতি সপ্তাহে পেআউট"],
    benefitsTitle: "বাংলাদেশের ভেটদের কাজের ধরন মাথায় রেখে",
    benefits: [
      {
        spot: "search",
        title: "কাছের মানুষ খুঁজে পাবে",
        body: "মালিকরা এলাকা আর প্রাণী দিয়ে খোঁজেন। যাচাইকৃত আর পূর্ণ প্রোফাইলের ভেটরা উপরে থাকেন।",
      },
      {
        spot: "chat",
        title: "চ্যাটে আয়",
        body: 'নিজের ফি ঠিক করুন। রোগী দেখার ফাঁকে ফোন থেকে উত্তর দিন; ব্যস্ত থাকলে "অ্যাভেইলেবল" বন্ধ রাখুন।',
      },
      {
        spot: "vet",
        title: "ফোনাফুনি ছাড়া বুকিং",
        body: "একবার চেম্বারের সময় দিন। মালিকরা {booking} দিয়ে সময় ধরে রাখেন, তাই না আসা কমে।",
      },
      {
        spot: "question",
        title: "আস্থা তৈরি করুন",
        body: "ফ্রি প্রশ্নের উত্তর দিন আর ছোট গাইড লিখুন। প্রতিটি আপনার প্রোফাইলে নিয়ে আসে।",
      },
      {
        spot: "care",
        title: "সাপ্তাহিক পেআউট",
        body: "চ্যাট বন্ধ হলেই টাকা আপনার। {minPayout} হলে প্রতি সপ্তাহে বিকাশ, নগদ বা ব্যাংকে দিই।",
      },
      {
        spot: "welcome",
        title: "যাচাই ব্যাজ",
        body: "আমরা আপনার BVC রেজিস্ট্রেশন মিলিয়ে দেখি, তাই মালিকরা জানেন তারা আসল ভেটের সাথে কথা বলছেন।",
      },
    ],
    stepsTitle: "প্রায় দুই কর্মদিবসে চালু",
    steps: [
      { title: "সাইন ইন", body: 'গুগল বা ইমেইল দিয়ে, তারপর "আমি ভেট" বেছে নিন।' },
      { title: "প্রোফাইল বানান", body: "ছবি, যোগ্যতা, চেম্বার, চ্যাট ফি আর সময়।" },
      { title: "BVC সার্টিফিকেট আপলোড", body: "ড্যাশবোর্ড থেকে যাচাইয়ের জন্য জমা দিন।" },
      { title: "আমরা যাচাই করি", body: "BVC রেজিস্টার মিলিয়ে দেখি, সাধারণত ২ কর্মদিবসে।" },
      { title: "আয় শুরু", body: "প্রোফাইল চালু হয়; কাছের মালিকরা চ্যাট আর বুক করতে পারেন।" },
    ],
    calc: {
      title: "কত আয় হতে পারে?",
      sub: "স্লাইডার সরান। যত্ন রাখে {pct}%, বাকিটা আপনার।",
      chats: "দিনে চ্যাট",
      fee: "আপনার চ্যাট ফি",
      perDay: "দিনে {n}টি",
      monthly: "মাসে আনুমানিক আয়",
      keep: "{pct}% কমিশনের পরে, {days} কর্মদিবসে",
      note: "শুধু উদাহরণ, প্রতিশ্রুতি নয়: আপনার ফি, সময় আর কাছের কতজন মালিকের দরকার, তার উপর নির্ভর করে।",
    },
    faqTitle: "ভেটরা যা জানতে চান",
    faq: [
      { q: "যোগ দিতে কি টাকা লাগে?", a: "না। শুধু পেইড চ্যাটে {pct}% কমিশন। ফিচার্ড হওয়া ঐচ্ছিক।" },
      {
        q: "টাকা কবে পাব?",
        a: "চ্যাট বন্ধ হলে টাকা তোলার যোগ্য হয়, আর ব্যালান্স {minPayout} হলে প্রতি সপ্তাহে পেআউট হয়।",
      },
      {
        q: "সময়মতো উত্তর দিতে না পারলে?",
        a: 'ব্যস্ত থাকলে "এখন অ্যাভেইলেবল" বন্ধ রাখুন। পেইড চ্যাটে {window} মিনিটে উত্তর না দিলে মালিক টাকা ফেরত পান।',
      },
      {
        q: "চেম্বারের ফোন নম্বর গোপন রাখা যাবে?",
        a: "হ্যাঁ। মালিকরা চ্যাট আর বুকিং দিয়ে যোগাযোগ করেন; নম্বর দেখানো আপনার ইচ্ছা।",
      },
      { q: "কোন কাগজ লাগবে?", a: "আপনার BVC রেজিস্ট্রেশন সার্টিফিকেট। পরিষ্কার ছবি বা PDF হলেই চলবে।" },
    ],
    share: {
      title: "এখানে থাকা উচিত এমন ভেটকে চেনেন?",
      body: "এই পেজটা পাঠিয়ে দিন। যোগ দেওয়া ফ্রি, যাচাইয়ে প্রায় দুই দিন লাগে।",
      button: "ভেটের সাথে শেয়ার করুন",
      text: "ভেটদের জন্য যত্ন: কাছের মালিকরা খুঁজে পাবে, চ্যাটে আয়, সাপ্তাহিক পেআউট। যোগ দেওয়া ফ্রি।",
      copied: "লিংক কপি হয়েছে",
    },
    final: { title: "কাছের মালিকরা এখনই খুঁজছেন", body: "আজই আপনার ফ্রি প্রোফাইল বানান।" },
  },
};
