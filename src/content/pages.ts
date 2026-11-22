/** ✏️ Copy for /for-vets and /about. */
export interface AboutContent {
  title: string;
  sub: string;
  paragraphs: readonly string[];
  values: readonly { title: string; body: string }[];
}

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
