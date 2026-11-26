/**
 * The two shareable onboarding pages: /join (pet owners) and /for-vets (vets).
 * Short on purpose: what you get, what it costs, how to start. Text in
 * [brackets] gets the brand highlight. Every {placeholder} is filled from
 * config/business.ts on the page, so prices and windows never drift.
 */

/** Lucide icon for a line (mapped in components/marketing/join-page.tsx). */
export type JoinIcon =
  | "search"
  | "question"
  | "chat"
  | "quick"
  | "clinic"
  | "records"
  | "emergency"
  | "shop"
  | "points"
  | "fee"
  | "badge"
  | "clients"
  | "payout";

export interface JoinItem {
  icon: JoinIcon;
  title: string;
  body: string;
  /** Price or perk chip ("Free", "From ৳100"). */
  tag?: string;
}

export interface JoinContent {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  secondary: string;
  trust: readonly string[];
  itemsTitle: string;
  items: readonly JoinItem[];
  stepsTitle: string;
  steps: readonly string[];
  share: { title: string; body: string; button: string; text: string; copied: string };
  /** One line under the call to action. */
  final: { body: string };
}

export type OwnerJoinContent = JoinContent;

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
    body: "Verified vets near you, help from home, reminders on time. Free to join.",
    cta: "Join free",
    secondary: "Find a vet near me",
    trust: ["BVC-verified vets", "No reply in {window} min? Money back", "Pay by bKash or Nagad"],
    itemsTitle: "What you get",
    items: [
      {
        icon: "search",
        title: "Vets near you",
        body: "Search by area and animal. Every vet is checked on the BVC register.",
        tag: "Free",
      },
      {
        icon: "question",
        title: "Free questions",
        body: "Ask in public; verified vets answer.",
        tag: "Free",
      },
      {
        icon: "chat",
        title: "Private chat with a vet",
        body: "Photos, follow-ups and a call, open {hours} hours. No reply in {window} minutes, money back.",
        tag: "From {fee}",
      },
      {
        icon: "quick",
        title: "Quick help",
        body: "One urgent question, answered by a vet on duty within {quickMin} minutes.",
        tag: "{quickFee}",
      },
      {
        icon: "clinic",
        title: "Book a clinic visit",
        body: "Pick a time from the vet's own hours. No phone calls.",
        tag: "{booking} to book",
      },
      {
        icon: "records",
        title: "Records and reminders",
        body: "Each pet's health record, and a reminder before every vaccine and deworming.",
        tag: "Free",
      },
      {
        icon: "emergency",
        title: "Emergency help",
        body: "24/7 vets near you and first-aid steps.",
        tag: "Free",
      },
      {
        icon: "shop",
        title: "Food and care shop",
        body: "Checked products, cash on delivery across Bangladesh.",
      },
      {
        icon: "points",
        title: "Invite friends, earn points",
        body: "Friends you invite get {welcome} in points, and you earn too. Spend them on chats and orders.",
        tag: "Free",
      },
    ],
    stepsTitle: "Start in a minute",
    steps: ["Sign in with Google or a code to your email", "Add your pet", "Find a vet, ask, or book"],
    share: {
      title: "Know someone with a pet?",
      body: "Send them this page. Joining is free.",
      button: "Share this page",
      text: "Jotno: verified vets near you, help from home, vaccine reminders. Free to join.",
      copied: "Link copied",
    },
    final: { body: "Free to join. Takes under a minute." },
  },
  bn: {
    eyebrow: "পোষা প্রাণীর মালিকদের জন্য",
    title: "আপনার পোষা প্রাণীর ভেট, [হাতের মুঠোয়]",
    body: "কাছের যাচাই করা ভেট, ঘরে বসে পরামর্শ, সময়মতো রিমাইন্ডার। যোগ দেওয়া ফ্রি।",
    cta: "ফ্রিতে যোগ দিন",
    secondary: "কাছের ভেট খুঁজুন",
    trust: ["BVC-যাচাই করা ভেট", "{window} মিনিটে উত্তর না পেলে টাকা ফেরত", "বিকাশ বা নগদে পেমেন্ট"],
    itemsTitle: "যা যা পাবেন",
    items: [
      {
        icon: "search",
        title: "কাছের ভেট",
        body: "এলাকা আর প্রাণী দিয়ে খুঁজুন। প্রত্যেক ভেট BVC রেজিস্টারে যাচাই করা।",
        tag: "ফ্রি",
      },
      {
        icon: "question",
        title: "ফ্রি প্রশ্ন",
        body: "সবার সামনে প্রশ্ন করুন, যাচাই করা ভেটরা উত্তর দেন।",
        tag: "ফ্রি",
      },
      {
        icon: "chat",
        title: "ভেটের সাথে প্রাইভেট চ্যাট",
        body: "ছবি, ফলো-আপ প্রশ্ন আর কল, {hours} ঘণ্টা খোলা। {window} মিনিটে উত্তর না পেলে টাকা ফেরত।",
        tag: "{fee} থেকে",
      },
      {
        icon: "quick",
        title: "কুইক হেল্প",
        body: "একটা জরুরি প্রশ্ন, ডিউটিতে থাকা ভেট {quickMin} মিনিটের মধ্যে উত্তর দেন।",
        tag: "{quickFee}",
      },
      {
        icon: "clinic",
        title: "চেম্বারে ভিজিট বুক",
        body: "ভেটের নিজের সময় থেকে বেছে নিন, ফোন করতে হবে না।",
        tag: "বুকিং {booking}",
      },
      {
        icon: "records",
        title: "রেকর্ড আর রিমাইন্ডার",
        body: "প্রতিটি প্রাণীর স্বাস্থ্য রেকর্ড, আর প্রতিটি টিকা ও কৃমিনাশের আগে রিমাইন্ডার।",
        tag: "ফ্রি",
      },
      {
        icon: "emergency",
        title: "জরুরি সাহায্য",
        body: "কাছের ২৪/৭ ভেট আর প্রাথমিক চিকিৎসার ধাপ।",
        tag: "ফ্রি",
      },
      {
        icon: "shop",
        title: "খাবার আর যত্নের শপ",
        body: "যাচাই করা পণ্য, সারা দেশে ক্যাশ অন ডেলিভারি।",
      },
      {
        icon: "points",
        title: "বন্ধুকে ডাকুন, পয়েন্ট পান",
        body: "আপনার ডাকা বন্ধু পাবেন {welcome}-এর পয়েন্ট, আপনিও পাবেন। চ্যাট আর অর্ডারে খরচ করুন।",
        tag: "ফ্রি",
      },
    ],
    stepsTitle: "এক মিনিটে শুরু",
    steps: ["গুগল বা ইমেইলে আসা কোড দিয়ে সাইন ইন", "প্রাণীর তথ্য দিন", "ভেট খুঁজুন, প্রশ্ন করুন বা বুক করুন"],
    share: {
      title: "পোষা প্রাণী আছে এমন কাউকে চেনেন?",
      body: "এই পেজটা পাঠিয়ে দিন। যোগ দেওয়া ফ্রি।",
      button: "পেজটা শেয়ার করুন",
      text: "যত্ন: কাছের যাচাই করা ভেট, ঘরে বসে পরামর্শ, টিকার রিমাইন্ডার। যোগ দেওয়া ফ্রি।",
      copied: "লিংক কপি হয়েছে",
    },
    final: { body: "যোগ দেওয়া ফ্রি, এক মিনিটও লাগে না।" },
  },
};

export const vetJoinContent: Record<string, VetJoinContent> = {
  en: {
    eyebrow: "For veterinarians",
    title: "Grow your practice with [Jotno]",
    body: "Get found by pet owners nearby, earn from chats on your phone, fill your clinic hours. Free to join.",
    cta: "Join as a vet, it's free",
    secondary: "See what you could earn",
    trust: ["You keep {keep}% of every chat", "No monthly fee", "Paid weekly"],
    itemsTitle: "What you get",
    items: [
      {
        icon: "fee",
        title: "Paid chats at your fee",
        body: 'Set your fee ({minFee} to {maxFee}). Answer from your phone; turn "available" off when busy.',
        tag: "Keep {keep}%",
      },
      {
        icon: "quick",
        title: "Quick help on duty",
        body: "Short questions from owners during your duty hours. Answer within {quickMin} minutes.",
        tag: "{quickVet} each",
      },
      {
        icon: "clinic",
        title: "Clinic bookings",
        body: "Set your hours once; owners book a time. The visit fee is paid to you at the clinic.",
      },
      {
        icon: "badge",
        title: "Verified profile",
        body: "A BVC-checked badge, reviews, and a profile owners near you can find.",
        tag: "Free",
      },
      {
        icon: "clients",
        title: "Bring your own clients",
        body: "Share your link and QR poster. At Star level, Jotno keeps only {ownPct}% on their chats.",
        tag: "{ownPct}%",
      },
      {
        icon: "question",
        title: "Get known",
        body: "Answer free questions; each answer links to your profile.",
        tag: "Free",
      },
      {
        icon: "payout",
        title: "Weekly payouts",
        body: "Chat money is yours when the chat closes. Paid every week by bKash, Nagad or bank from {minPayout}.",
      },
    ],
    stepsTitle: "Start in three steps",
    steps: [
      'Sign in with Google or email and choose "I\'m a vet"',
      "Add your profile, fee and BVC certificate",
      "We verify in about 2 working days, then you're live",
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
    share: {
      title: "Know a vet who should be here?",
      body: "Send them this page. Joining is free and verification takes about two days.",
      button: "Share with a vet",
      text: "Jotno for vets: get found by pet owners nearby, earn from chats, weekly payouts. Free to join.",
      copied: "Link copied",
    },
    final: { body: "Set up your free profile today." },
  },
  bn: {
    eyebrow: "ভেটেরিনারিয়ানদের জন্য",
    title: "আপনার প্র্যাকটিস বাড়ান [যত্ন দিয়ে]",
    body: "কাছের মালিকরা আপনাকে খুঁজে পাবে, ফোনে চ্যাট করে আয়, চেম্বারের সময় ভরবে। যোগ দেওয়া ফ্রি।",
    cta: "ভেট হিসেবে যোগ দিন, ফ্রি",
    secondary: "কত আয় হতে পারে দেখুন",
    trust: ["প্রতিটি চ্যাটের {keep}% আপনার", "কোনো মাসিক ফি নেই", "প্রতি সপ্তাহে পেমেন্ট"],
    itemsTitle: "যা যা পাবেন",
    items: [
      {
        icon: "fee",
        title: "নিজের ফি-তে পেইড চ্যাট",
        body: 'ফি ঠিক করুন ({minFee} থেকে {maxFee})। ফোন থেকে উত্তর দিন; ব্যস্ত থাকলে "অ্যাভেইলেবল" বন্ধ রাখুন।',
        tag: "{keep}% আপনার",
      },
      {
        icon: "quick",
        title: "ডিউটিতে কুইক হেল্প",
        body: "ডিউটির সময় মালিকদের ছোট প্রশ্ন। {quickMin} মিনিটের মধ্যে উত্তর দিন।",
        tag: "প্রতিটিতে {quickVet}",
      },
      {
        icon: "clinic",
        title: "চেম্বার বুকিং",
        body: "একবার সময় দিন, মালিকরা সময় বুক করবেন। ভিজিট ফি চেম্বারে আপনাকেই দেবেন।",
      },
      {
        icon: "badge",
        title: "যাচাই করা প্রোফাইল",
        body: "BVC যাচাই ব্যাজ, রিভিউ, আর কাছের মালিকরা খুঁজে পাবে এমন প্রোফাইল।",
        tag: "ফ্রি",
      },
      {
        icon: "clients",
        title: "নিজের ক্লায়েন্ট আনুন",
        body: "আপনার লিংক আর QR পোস্টার শেয়ার করুন। স্টার লেভেলে তাদের চ্যাটে যত্ন রাখে মাত্র {ownPct}%।",
        tag: "{ownPct}%",
      },
      {
        icon: "question",
        title: "পরিচিতি বাড়ান",
        body: "ফ্রি প্রশ্নের উত্তর দিন; প্রতিটি উত্তরে আপনার প্রোফাইলের লিংক থাকে।",
        tag: "ফ্রি",
      },
      {
        icon: "payout",
        title: "সাপ্তাহিক পেমেন্ট",
        body: "চ্যাট শেষ হলেই টাকা আপনার। {minPayout} হলে প্রতি সপ্তাহে বিকাশ, নগদ বা ব্যাংকে পাঠাই।",
      },
    ],
    stepsTitle: "তিন ধাপে শুরু",
    steps: [
      'গুগল বা ইমেইল দিয়ে সাইন ইন করে "আমি ভেট" বেছে নিন',
      "প্রোফাইল, ফি আর BVC সার্টিফিকেট দিন",
      "প্রায় ২ কর্মদিবসে যাচাই, তারপর আপনার প্রোফাইল লাইভ",
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
    share: {
      title: "এখানে থাকা উচিত এমন ভেটকে চেনেন?",
      body: "এই পেজটা পাঠিয়ে দিন। যোগ দেওয়া ফ্রি, যাচাইয়ে প্রায় দুই দিন লাগে।",
      button: "ভেটের সাথে শেয়ার করুন",
      text: "ভেটদের জন্য যত্ন: কাছের মালিকরা খুঁজে পাবে, চ্যাটে আয়, সাপ্তাহিক পেমেন্ট। যোগ দেওয়া ফ্রি।",
      copied: "লিংক কপি হয়েছে",
    },
    final: { body: "আজই আপনার ফ্রি প্রোফাইল বানান।" },
  },
};
