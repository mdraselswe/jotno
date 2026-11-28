import type { FaqItem } from "./faq";

/**
 * ✏️ Questions under the vet search, shown with FAQPage structured data and
 * listed in /llms.txt, so "পশু ডাক্তার", "অনলাইনে পশু ডাক্তার", "২৪ ঘণ্টা পশু
 * ডাক্তার" and "BVC registered vet" searches find a real answer. Placeholders
 * come from business.ts: {chat} lowest chat fee, {hours} hours a chat stays
 * open, {reply} minutes a vet has to answer, {booking} visit booking fee,
 * {days} how many days ahead a visit can be booked.
 */
export interface VetsFaq {
  title: string;
  items: readonly FaqItem[];
}

export const vetsFaq: Record<string, VetsFaq> = {
  en: {
    title: "Finding a vet in Bangladesh",
    items: [
      {
        q: "How do I find a vet near me?",
        a: "Search by district and area (Dhaka, Chattogram, Sylhet, Rajshahi, Khulna or any other district), by animal, or share your location to see the nearest vets first. Each profile shows the clinic, hours, fees and which animals the vet treats.",
      },
      {
        q: "How do I know a vet is BVC registered?",
        a: "Every vet on Jotno is checked against the Bangladesh Veterinary Council (BVC) register before their profile goes live. Verified vets carry a Verified badge, and the profile shows their registration number and the date we checked it.",
      },
      {
        q: "How much does it cost to talk to a vet online?",
        a: "Each vet sets their own chat fee, starting from {chat}. The chat stays open for {hours} hours and you can send photos. If the vet does not reply within {reply} minutes, you get your money back.",
      },
      {
        q: "Can I find a vet at night or on a holiday?",
        a: "Turn on “Available now” to see vets who are online at this moment. For poisoning, heavy bleeding, breathing trouble or a cat that can't pee, open the emergency page for first aid and vets who take emergencies.",
      },
      {
        q: "Do vets visit at home?",
        a: "Some do. Vets who visit homes show a “Home visit” mark on their card and profile; ask them about the area and the fee in a chat first.",
      },
      {
        q: "How do I book a clinic visit?",
        a: "Pick a time on the vet's profile, up to {days} days ahead, and pay a {booking} booking fee with bKash or Nagad. You pay the visit fee at the clinic. If the vet cancels, the booking fee is refunded.",
      },
    ],
  },
  bn: {
    title: "বাংলাদেশে পশু ডাক্তার খোঁজা নিয়ে প্রশ্ন",
    items: [
      {
        q: "আমার কাছের পশু ডাক্তার কীভাবে খুঁজব?",
        a: "জেলা আর এলাকা দিয়ে খুঁজুন (ঢাকা, চট্টগ্রাম, সিলেট, রাজশাহী, খুলনা বা যেকোনো জেলা), প্রাণী দিয়ে খুঁজুন, অথবা লোকেশন দিলে সবচেয়ে কাছের ভেট আগে দেখবেন। প্রতিটি প্রোফাইলে চেম্বার, সময়, ফি আর কোন প্রাণীর চিকিৎসা করেন তা লেখা থাকে।",
      },
      {
        q: "ভেট BVC নিবন্ধিত কি না কীভাবে বুঝব?",
        a: "প্রোফাইল চালু হওয়ার আগে যত্নে প্রত্যেক ভেটকে বাংলাদেশ ভেটেরিনারি কাউন্সিলের (BVC) রেজিস্টারের সাথে মিলিয়ে যাচাই করা হয়। যাচাইকৃত ভেটের নামের পাশে যাচাইকৃত ব্যাজ থাকে, আর প্রোফাইলে রেজিস্ট্রেশন নম্বর ও যাচাইয়ের তারিখ দেখা যায়।",
      },
      {
        q: "অনলাইনে পশু ডাক্তারের সাথে কথা বলতে কত টাকা লাগে?",
        a: "প্রত্যেক ভেট নিজের চ্যাট ফি ঠিক করেন, শুরু {chat} থেকে। চ্যাট {hours} ঘণ্টা খোলা থাকে আর ছবি পাঠাতে পারবেন। ভেট {reply} মিনিটের মধ্যে উত্তর না দিলে পুরো টাকা ফেরত পাবেন।",
      },
      {
        q: "রাতে বা ছুটির দিনে পশু ডাক্তার পাব কোথায়?",
        a: "“এখন অ্যাভেইলেবল” চালু করলে এই মুহূর্তে অনলাইনে থাকা ভেটদের দেখবেন। বিষ খাওয়া, অনেক রক্ত পড়া, শ্বাসকষ্ট বা বিড়ালের প্রস্রাব বন্ধ হলে জরুরি পেজে প্রাথমিক চিকিৎসা আর জরুরি রোগী দেখেন এমন ভেট পাবেন।",
      },
      {
        q: "পশু ডাক্তার কি বাসায় এসে দেখেন?",
        a: "কেউ কেউ দেখেন। যাঁরা বাসায় যান তাঁদের কার্ড আর প্রোফাইলে “বাসায় দেখেন” লেখা থাকে; এলাকা আর ফি আগে চ্যাটে জেনে নিন।",
      },
      {
        q: "চেম্বারে ভিজিট কীভাবে বুক করব?",
        a: "ভেটের প্রোফাইল থেকে {days} দিনের মধ্যে একটা সময় বেছে নিন, আর বিকাশ বা নগদে {booking} বুকিং ফি দিন। ভিজিট ফি চেম্বারে দেবেন। ভেট বাতিল করলে বুকিং ফি ফেরত পাবেন।",
      },
    ],
  },
};
