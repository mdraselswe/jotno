/**
 * ✏️ Frequently asked questions, shown on the home page with FAQPage
 * structured data and listed in /llms.txt (scripts/generate-assets.ts), so
 * search engines and AI assistants can quote them. Plain data: scripts import it.
 *
 * Placeholders are filled from src/config/business.ts, so prices and time
 * windows never drift from the real rules: {chat} lowest chat fee, {reply}
 * minutes a vet has to answer, {quick} quick-help fee, {booking} visit booking
 * fee, {keep} % of a chat fee the vet keeps. `when: "quick"` items show only
 * while quick help is switched on.
 */
export interface FaqItem {
  q: string;
  a: string;
  when?: "quick";
}

export interface FaqContent {
  eyebrow: string;
  title: string;
  sub: string;
  items: readonly FaqItem[];
}

export const faqContent: Record<string, FaqContent> = {
  en: {
    eyebrow: "Questions",
    title: "Frequently asked questions",
    sub: "Short answers about Jotno, vets, prices and payments.",
    items: [
      {
        q: "What is Jotno?",
        a: "Jotno (যত্ন) is a Bangla-first veterinary platform for Bangladesh. You can find BVC-verified vets near you, chat online with a vet about your pet or livestock, book a clinic visit, ask questions for free in a public Q&A and get vaccine and deworming reminders.",
      },
      {
        q: "Are the vets on Jotno real, verified vets?",
        a: "Yes. Every vet is checked against the Bangladesh Veterinary Council (BVC) register, with their BVC registration certificate and national ID, before their profile goes live. Verified vets carry a Verified badge.",
      },
      {
        q: "How much does an online vet chat cost?",
        a: "Each vet sets their own chat fee, starting from {chat}. A chat stays open for 24 hours and you can send photos. Asking in the public Q&A, reminders and first-aid guides are free.",
      },
      {
        q: "What if the vet does not reply?",
        a: "If the vet does not reply within {reply} minutes, you get your full money back.",
      },
      {
        q: "What is quick help?",
        a: "Quick help is a short question for {quick} that any on-duty vet answers within {reply} minutes. If nobody answers in time, you get a free retry or your money back.",
        when: "quick",
      },
      {
        q: "Which animals can Jotno vets help with?",
        a: "Cats, dogs, birds, rabbits and other pets, and farm animals such as cows, goats and chickens. Search by animal to see vets who treat it.",
      },
      {
        q: "How do I pay?",
        a: "Pay with bKash or Nagad. To book a clinic visit you pay a {booking} booking fee online and the visit fee at the clinic; if the vet cancels, the booking fee is refunded.",
      },
      {
        q: "Where in Bangladesh does Jotno work?",
        a: "Online chat works anywhere in Bangladesh. For clinic visits, search vets by district and area (Dhaka, Chattogram, Sylhet, Rajshahi, Khulna and every other district) or by your location.",
      },
      {
        q: "What should I do in a pet emergency?",
        a: "Open the Jotno emergency page for first aid for poisoning, heavy bleeding, breathing trouble, heatstroke and accidents, and to find vets who take emergencies 24/7.",
      },
      {
        q: "I am a vet. How do I join Jotno?",
        a: "Joining is free. Sign up, add your BVC registration and clinic details and get verified. You keep {keep}% of every chat fee, get bookings in one place and are paid every week.",
      },
    ],
  },
  bn: {
    eyebrow: "প্রশ্নোত্তর",
    title: "সাধারণ প্রশ্ন ও উত্তর",
    sub: "যত্ন, ভেট, খরচ আর পেমেন্ট নিয়ে ছোট উত্তর।",
    items: [
      {
        q: "যত্ন (Jotno) কী?",
        a: "যত্ন বাংলাদেশের একটি বাংলা ভেট প্ল্যাটফর্ম। এখানে কাছের BVC-যাচাইকৃত পশু ডাক্তার (ভেট) খুঁজতে পারেন, পোষা প্রাণী বা গবাদিপশু নিয়ে অনলাইনে ভেটের সাথে চ্যাট করতে পারেন, চেম্বারে ভিজিট বুক করতে পারেন, পাবলিক প্রশ্নোত্তরে বিনা খরচে প্রশ্ন করতে পারেন আর টিকা ও কৃমিনাশকের রিমাইন্ডার পান।",
      },
      {
        q: "যত্নের ভেটরা কি সত্যিকারের যাচাইকৃত ভেট?",
        a: 'হ্যাঁ। প্রোফাইল চালু হওয়ার আগে প্রতিটি ভেটকে বাংলাদেশ ভেটেরিনারি কাউন্সিলের (BVC) রেজিস্টারের সাথে, BVC সার্টিফিকেট আর জাতীয় পরিচয়পত্র দিয়ে মিলিয়ে দেখা হয়। যাচাইকৃত ভেটের প্রোফাইলে "যাচাইকৃত" ব্যাজ থাকে।',
      },
      {
        q: "অনলাইনে ভেটের সাথে চ্যাট করতে কত খরচ?",
        a: "প্রতিটি ভেট নিজের চ্যাট ফি ঠিক করেন, শুরু {chat} থেকে। একটি চ্যাট ২৪ ঘণ্টা খোলা থাকে, ছবিও পাঠাতে পারেন। পাবলিক প্রশ্নোত্তরে প্রশ্ন করা, রিমাইন্ডার আর প্রাথমিক চিকিৎসার গাইড ফ্রি।",
      },
      {
        q: "ভেট উত্তর না দিলে কী হবে?",
        a: "ভেট {reply} মিনিটের মধ্যে উত্তর না দিলে পুরো টাকা ফেরত পাবেন।",
      },
      {
        q: "কুইক হেল্প কী?",
        a: "কুইক হেল্প হলো {quick}-এ একটি ছোট প্রশ্ন, যার উত্তর ডিউটিতে থাকা যেকোনো ভেট {reply} মিনিটের মধ্যে দেন। সময়ে উত্তর না এলে আবার ফ্রিতে চেষ্টা করতে পারেন, বা টাকা ফেরত পাবেন।",
        when: "quick",
      },
      {
        q: "কোন কোন প্রাণীর জন্য ভেট পাওয়া যায়?",
        a: "বিড়াল, কুকুর, পাখি, খরগোশসহ পোষা প্রাণী, আর গরু, ছাগল, মুরগির মতো খামারের প্রাণী। প্রাণী বেছে খুঁজলে যে ভেটরা সেই প্রাণীর চিকিৎসা করেন তাদের দেখবেন।",
      },
      {
        q: "কিভাবে পেমেন্ট করব?",
        a: "বিকাশ বা নগদে পেমেন্ট করুন। চেম্বারে ভিজিট বুক করতে অনলাইনে {booking} বুকিং ফি দিন, ভিজিট ফি চেম্বারে দেবেন; ভেট বাতিল করলে বুকিং ফি ফেরত।",
      },
      {
        q: "বাংলাদেশের কোথায় কোথায় যত্ন পাওয়া যায়?",
        a: "অনলাইন চ্যাট সারা বাংলাদেশ থেকে করা যায়। চেম্বারে ভিজিটের জন্য জেলা আর এলাকা (ঢাকা, চট্টগ্রাম, সিলেট, রাজশাহী, খুলনাসহ সব জেলা) বা আপনার লোকেশন দিয়ে ভেট খুঁজুন।",
      },
      {
        q: "পোষা প্রাণীর জরুরি অবস্থায় কী করব?",
        a: "যত্নের জরুরি পাতায় বিষ খাওয়া, বেশি রক্তপাত, শ্বাসকষ্ট, হিটস্ট্রোক আর দুর্ঘটনার প্রাথমিক চিকিৎসা দেখুন, আর ২৪/৭ জরুরি সেবা দেন এমন ভেট খুঁজুন।",
      },
      {
        q: "আমি ভেট। কিভাবে যত্নে যোগ দেব?",
        a: "যোগ দেওয়া ফ্রি। সাইন আপ করে BVC রেজিস্ট্রেশন আর চেম্বারের তথ্য দিন, যাচাই হয়ে গেলে প্রোফাইল চালু। প্রতিটি চ্যাট ফির {keep}% আপনার, সব বুকিং এক জায়গায়, আর প্রতি সপ্তাহে পেমেন্ট।",
      },
    ],
  },
};
