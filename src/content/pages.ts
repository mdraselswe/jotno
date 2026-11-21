/** ✏️ Copy for /for-vets and /about. */
export interface ForVetsContent {
  title: string;
  sub: string;
  benefits: readonly { title: string; body: string }[];
  steps: readonly string[];
  faq: readonly { q: string; a: string }[];
  cta: string;
}

export interface AboutContent {
  title: string;
  sub: string;
  paragraphs: readonly string[];
  values: readonly { title: string; body: string }[];
}

export const forVetsContent: Record<string, ForVetsContent> = {
  en: {
    title: "Grow your practice with [Jotno]",
    sub: "A free profile that pet owners near you can find, paid chat consults, and simple bookings.",
    benefits: [
      {
        title: "Get found nearby",
        body: "Owners search by area and animal. Verified vets with complete profiles rank higher.",
      },
      {
        title: "Earn from chats",
        body: "Set your own chat fee. Jotno keeps a small commission ({pct}%), and pays you weekly by bKash, Nagad or bank.",
      },
      {
        title: "Bookings without phone tag",
        body: "Set clinic hours once; owners pay a small booking fee to hold the time, so fewer no-shows.",
      },
      {
        title: "Build trust",
        body: "Answer free questions and write short guides. Each one links back to your profile.",
      },
    ],
    steps: [
      'Sign in and choose "I\'m a vet".',
      "Fill in your profile, fees and clinic hours.",
      "Upload your BVC certificate and submit for verification.",
      "We check the BVC register, usually within 2 working days, and your profile goes live.",
    ],
    faq: [
      {
        q: "Does it cost anything to join?",
        a: "No. You pay only the commission on paid chats. Featured placement is optional.",
      },
      {
        q: "When do I get paid?",
        a: "Chat money becomes available when the chat closes, and we pay out weekly once your balance reaches the minimum.",
      },
      {
        q: "What if I can't reply in time?",
        a: "Switch off \"available now\" when you're busy. If you don't reply within 30 minutes of a paid chat, the owner is refunded.",
      },
    ],
    cta: "Join as a vet",
  },
  bn: {
    title: "[যত্ন] দিয়ে আপনার প্র্যাকটিস বাড়ান",
    sub: "কাছের পোষা প্রাণীর মালিকরা খুঁজে পাবে এমন ফ্রি প্রোফাইল, পেইড চ্যাট কনসাল্ট আর সহজ বুকিং।",
    benefits: [
      {
        title: "কাছের মানুষ খুঁজে পাবে",
        body: "মালিকরা এলাকা আর প্রাণী দিয়ে খোঁজেন। যাচাইকৃত আর পূর্ণ প্রোফাইলের ভেটরা উপরে থাকেন।",
      },
      {
        title: "চ্যাটে আয়",
        body: "নিজের চ্যাট ফি ঠিক করুন। যত্ন অল্প কমিশন ({pct}%) রাখে, আর প্রতি সপ্তাহে বিকাশ, নগদ বা ব্যাংকে টাকা দেয়।",
      },
      {
        title: "ফোনাফুনি ছাড়া বুকিং",
        body: "একবার চেম্বারের সময় দিন; মালিকরা অল্প বুকিং ফি দিয়ে সময় ধরে রাখেন, তাই না আসা কমে।",
      },
      {
        title: "আস্থা তৈরি করুন",
        body: "ফ্রি প্রশ্নের উত্তর দিন আর ছোট গাইড লিখুন। প্রতিটি আপনার প্রোফাইলে নিয়ে আসে।",
      },
    ],
    steps: [
      'সাইন ইন করে "আমি ভেট" বেছে নিন।',
      "প্রোফাইল, ফি আর চেম্বারের সময় দিন।",
      "BVC সার্টিফিকেট আপলোড করে যাচাইয়ের জন্য জমা দিন।",
      "আমরা BVC রেজিস্টার মিলিয়ে দেখি, সাধারণত ২ কর্মদিবসে, তারপর প্রোফাইল চালু হয়।",
    ],
    faq: [
      { q: "যোগ দিতে কি টাকা লাগে?", a: "না। শুধু পেইড চ্যাটে কমিশন। ফিচার্ড হওয়া ঐচ্ছিক।" },
      {
        q: "টাকা কবে পাব?",
        a: "চ্যাট বন্ধ হলে টাকা তোলার যোগ্য হয়, আর ব্যালান্স ন্যূনতম পরিমাণে পৌঁছালে প্রতি সপ্তাহে পেআউট হয়।",
      },
      {
        q: "সময়মতো উত্তর দিতে না পারলে?",
        a: 'ব্যস্ত থাকলে "এখন অ্যাভেইলেবল" বন্ধ রাখুন। পেইড চ্যাটে ৩০ মিনিটে উত্তর না দিলে মালিক টাকা ফেরত পান।',
      },
    ],
    cta: "ভেট হিসেবে যোগ দিন",
  },
};

export const aboutContent: Record<string, AboutContent> = {
  en: {
    title: "About Jotno",
    sub: "Good care for every animal in Bangladesh, a tap away.",
    paragraphs: [
      "Finding a trusted vet in Bangladesh often means asking around, calling numbers that don't answer, or travelling far for advice. Jotno makes it simple: verified vets near you, a quick paid chat when you need an answer now, and reminders so vaccines aren't missed.",
      "Jotno is Bangla first and built for phones, because that's how most of the country uses the internet.",
    ],
    values: [
      {
        title: "Verified, always",
        body: "Every vet's BVC registration is checked by a person before they're shown as verified.",
      },
      { title: "Fair to owners", body: "Clear prices, and your money back if a vet doesn't reply in time." },
      { title: "Fair to vets", body: "A small commission, weekly payouts, and tools that save time." },
    ],
  },
  bn: {
    title: "যত্ন সম্পর্কে",
    sub: "বাংলাদেশের প্রতিটি প্রাণীর ভালো যত্ন, এক ট্যাপ দূরে।",
    paragraphs: [
      "বাংলাদেশে ভরসার ভেট খুঁজতে প্রায়ই মানুষকে জিজ্ঞেস করতে হয়, এমন নম্বরে কল করতে হয় যা ধরে না, বা পরামর্শের জন্য দূরে যেতে হয়। যত্ন এটা সহজ করে: কাছের যাচাইকৃত ভেট, এখনই উত্তর দরকার হলে দ্রুত পেইড চ্যাট, আর রিমাইন্ডার যাতে টিকা মিস না হয়।",
      "যত্ন বাংলা-প্রথম আর মোবাইলের জন্য বানানো, কারণ দেশের বেশিরভাগ মানুষ এভাবেই ইন্টারনেট ব্যবহার করেন।",
    ],
    values: [
      {
        title: "সবসময় যাচাইকৃত",
        body: "যাচাইকৃত দেখানোর আগে প্রত্যেক ভেটের BVC রেজিস্ট্রেশন একজন মানুষ মিলিয়ে দেখেন।",
      },
      { title: "মালিকদের প্রতি ন্যায্য", body: "পরিষ্কার দাম, আর ভেট সময়মতো উত্তর না দিলে টাকা ফেরত।" },
      { title: "ভেটদের প্রতি ন্যায্য", body: "অল্প কমিশন, সাপ্তাহিক পেআউট, আর সময় বাঁচানোর টুল।" },
    ],
  },
};
