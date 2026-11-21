/**
 * ✏️ Home page copy, one entry per language. Short UI labels live in
 * src/i18n; this is the marketing text. Icons are mapped in the page.
 */
export type StepIcon = "search" | "chat" | "heart";

export interface HomeContent {
  hero: { eyebrow: string; title: string; body: string };
  steps: readonly { icon: StepIcon; title: string; body: string }[];
  trust: readonly string[];
  vetCta: { title: string; body: string; button: string };
  emergency: { title: string; body: string; button: string };
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
      "Pay with bKash, Nagad or card",
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
      "বিকাশ, নগদ বা কার্ডে পেমেন্ট",
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
  },
};
