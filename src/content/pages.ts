/** ✏️ Copy for /for-vets and /about. */
export interface AboutContent {
  title: string;
  sub: string;
  paragraphs: readonly string[];
  values: readonly { title: string; body: string }[];
  /** "What you can do on Jotno": one card per service, linking to its page. */
  servicesTitle: string;
  services: readonly { title: string; body: string; route: AboutRoute }[];
  /** How a vet becomes "verified", in order. */
  verifyTitle: string;
  verifySteps: readonly string[];
}

/** Pages an About service card can link to (keys of ROUTES). */
export type AboutRoute = "vets" | "quick" | "questions" | "emergency" | "shop" | "join";

export const aboutContent: Record<string, AboutContent> = {
  en: {
    title: "About Jotno",
    sub: "Good care for every animal in Bangladesh, a tap away.",
    paragraphs: [
      "Finding a trusted vet in Bangladesh often means asking around, calling numbers that don't answer, or travelling far for advice. Jotno makes it simple: verified vets near you, a quick paid chat when you need an answer now, and reminders so vaccines aren't missed.",
      "Jotno is for pet owners and farmers alike: cats, dogs, birds and rabbits at home, and cows, goats and chickens on the farm, in Dhaka, Chattogram, Sylhet, Rajshahi, Khulna and every other district.",
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
    servicesTitle: "What you can do on Jotno",
    services: [
      {
        title: "Find a vet",
        body: "Verified vets by district, area or animal, with fees and clinic hours.",
        route: "vets",
      },
      {
        title: "Chat with a vet online",
        body: "Send photos and get advice from home, or ask a short question with quick help.",
        route: "quick",
      },
      {
        title: "Ask for free",
        body: "Post a question in the public Q&A and read vets' answers to others.",
        route: "questions",
      },
      {
        title: "Emergency first aid",
        body: "What to do right now for poisoning, bleeding, heatstroke and accidents.",
        route: "emergency",
      },
      {
        title: "Pet shop",
        body: "Cat and dog food, litter and supplies, delivered to every district with cash on delivery.",
        route: "shop",
      },
      {
        title: "Vaccine reminders",
        body: "Add your pets and get reminded before a vaccine or deworming is due.",
        route: "join",
      },
    ],
    verifyTitle: "How we verify every vet",
    verifySteps: [
      "The vet signs up with their Bangladesh Veterinary Council (BVC) registration number, certificate and national ID.",
      "A person on our team checks the details against the BVC register.",
      "Only then does the profile go live with a Verified badge, showing the registration number and the date we checked it.",
    ],
  },
  bn: {
    title: "যত্ন সম্পর্কে",
    sub: "বাংলাদেশের প্রতিটি প্রাণীর ভালো যত্ন, এক ট্যাপ দূরে।",
    paragraphs: [
      "বাংলাদেশে ভরসার ভেট খুঁজতে প্রায়ই মানুষকে জিজ্ঞেস করতে হয়, এমন নম্বরে কল করতে হয় যা ধরে না, বা পরামর্শের জন্য দূরে যেতে হয়। যত্ন এটা সহজ করে: কাছের যাচাইকৃত ভেট, এখনই উত্তর দরকার হলে দ্রুত পেইড চ্যাট, আর রিমাইন্ডার যাতে টিকা মিস না হয়।",
      "যত্ন পোষা প্রাণীর মালিক আর খামারি দুজনের জন্যই: ঘরের বিড়াল, কুকুর, পাখি, খরগোশ আর খামারের গরু, ছাগল, মুরগি, ঢাকা, চট্টগ্রাম, সিলেট, রাজশাহী, খুলনাসহ দেশের প্রতিটি জেলায়।",
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
    servicesTitle: "যত্নে যা যা করতে পারবেন",
    services: [
      {
        title: "পশু ডাক্তার খুঁজুন",
        body: "জেলা, এলাকা বা প্রাণী দিয়ে যাচাইকৃত ভেট, ফি আর চেম্বারের সময়সহ।",
        route: "vets",
      },
      {
        title: "অনলাইনে ভেটের সাথে চ্যাট",
        body: "ঘরে বসে ছবি পাঠিয়ে পরামর্শ নিন, বা কুইক হেল্পে ছোট প্রশ্ন করুন।",
        route: "quick",
      },
      {
        title: "ফ্রিতে প্রশ্ন করুন",
        body: "পাবলিক প্রশ্নোত্তরে প্রশ্ন করুন আর অন্যদের প্রশ্নে ভেটদের উত্তর পড়ুন।",
        route: "questions",
      },
      {
        title: "জরুরি প্রাথমিক চিকিৎসা",
        body: "বিষ খাওয়া, রক্ত পড়া, হিট স্ট্রোক আর দুর্ঘটনায় এখনই কী করবেন।",
        route: "emergency",
      },
      {
        title: "পেট শপ",
        body: "বিড়াল-কুকুরের খাবার, ক্যাট লিটার আর দরকারি জিনিস, সব জেলায় ক্যাশ অন ডেলিভারি।",
        route: "shop",
      },
      {
        title: "টিকার রিমাইন্ডার",
        body: "পোষা প্রাণী যোগ করুন, টিকা বা কৃমিনাশকের সময় হওয়ার আগে মনে করিয়ে দেব।",
        route: "join",
      },
    ],
    verifyTitle: "আমরা প্রত্যেক ভেটকে যেভাবে যাচাই করি",
    verifySteps: [
      "ভেট বাংলাদেশ ভেটেরিনারি কাউন্সিলের (BVC) রেজিস্ট্রেশন নম্বর, সার্টিফিকেট আর জাতীয় পরিচয়পত্র দিয়ে সাইন আপ করেন।",
      "আমাদের টিমের একজন মানুষ তথ্যগুলো BVC রেজিস্টারের সাথে মিলিয়ে দেখেন।",
      "তারপরই প্রোফাইল চালু হয় যাচাইকৃত ব্যাজসহ, যেখানে রেজিস্ট্রেশন নম্বর আর যাচাইয়ের তারিখ দেখা যায়।",
    ],
  },
};
