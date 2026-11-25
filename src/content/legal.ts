/**
 * ✏️ Legal pages. DRAFTS written from Jotno's business rules
 * (src/config/business.ts); a Bangladeshi lawyer must review them before
 * launch. Each page: title, last update, sections of plain paragraphs.
 */
import { business } from "@/config";

/** A number in Bangla digits, for the Bangla text below. */
const bn = (n: number) => new Intl.NumberFormat("bn").format(n);

export type LegalDoc = "terms" | "privacy" | "refund" | "telemedicine";

export interface LegalPage {
  title: string;
  sub: string;
  sections: readonly { heading: string; body: readonly string[] }[];
}

export const LEGAL_UPDATED = "2026-11-22";

export const legalContent: Record<LegalDoc, Record<string, LegalPage>> = {
  terms: {
    en: {
      title: "Terms of use",
      sub: "The rules for using Jotno, in plain words.",
      sections: [
        {
          heading: "What Jotno is",
          body: [
            "Jotno is a platform that connects pet and livestock owners in Bangladesh with veterinarians. Vets on Jotno are independent professionals, not Jotno employees. Jotno checks each vet's Bangladesh Veterinary Council (BVC) registration before showing them as verified.",
          ],
        },
        {
          heading: "Your account",
          body: [
            "You sign in with your email (a one-time code) or Google. Keep access to your email safe. Give true information about yourself and your animals. You must be 18 or older, or use Jotno with a parent's permission.",
          ],
        },
        {
          heading: "Paid chats, bookings and the shop",
          body: [
            "Prices are shown before you pay. You pay by bKash or Nagad Send Money to the number shown on the payment page (plus any charge shown there), then enter your number and the transaction ID; we check it, usually within 30 minutes, and your chat or booking starts. Shop orders can also be paid in cash on delivery. Never share your wallet PIN or OTP with anyone, including us. A chat consult stays open for 24 hours after it starts. Refunds follow our Refund policy.",
          ],
        },
        {
          heading: "Good conduct",
          body: [
            "Be respectful. Don't post false, abusive or illegal content, other people's private information, or ads. Don't try to pay a vet outside Jotno for a chat that started on Jotno. We may hide content or close accounts that break these rules.",
          ],
        },
        {
          heading: "Medical advice",
          body: [
            "Advice from a vet on Jotno is based on what you tell them and the photos you share. It is not the same as a physical examination. In an emergency, go to a clinic. See the Telemedicine policy.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "Jotno provides the platform as is. Each vet is responsible for their own advice and treatment. To the extent the law allows, Jotno is not liable for indirect losses. Nothing here limits your rights under the Consumer Rights Protection Act, 2009.",
          ],
        },
        {
          heading: "Changes and contact",
          body: [
            "We may update these terms and will show the date of the last change on this page. Questions: hello@jotnocare.com.",
          ],
        },
      ],
    },
    bn: {
      title: "ব্যবহারের শর্তাবলি",
      sub: "যত্ন ব্যবহারের নিয়ম, সহজ ভাষায়।",
      sections: [
        {
          heading: "যত্ন কী",
          body: [
            "যত্ন একটি প্ল্যাটফর্ম যা বাংলাদেশের পোষা প্রাণী ও গবাদিপশুর মালিকদের ভেটেরিনারি চিকিৎসকদের সাথে যুক্ত করে। যত্নের ভেটরা স্বাধীন পেশাজীবী, যত্নের কর্মী নন। যাচাইকৃত দেখানোর আগে যত্ন প্রত্যেক ভেটের বাংলাদেশ ভেটেরিনারি কাউন্সিল (BVC) রেজিস্ট্রেশন মিলিয়ে দেখে।",
          ],
        },
        {
          heading: "আপনার অ্যাকাউন্ট",
          body: [
            "আপনি ইমেইল (এককালীন কোড) বা গুগল দিয়ে সাইন ইন করেন। আপনার ইমেইল নিরাপদ রাখুন। নিজের আর প্রাণীর সঠিক তথ্য দিন। বয়স ১৮ বা বেশি হতে হবে, নইলে অভিভাবকের অনুমতি নিয়ে ব্যবহার করুন।",
          ],
        },
        {
          heading: "পেইড চ্যাট, বুকিং আর শপ",
          body: [
            "পেমেন্টের আগে দাম দেখানো হয়। পেমেন্ট পেজে দেখানো নম্বরে বিকাশ বা নগদে সেন্ড মানি করুন (সেখানে কোনো চার্জ দেখালে সেটাসহ), তারপর আপনার নম্বর আর ট্রানজেকশন আইডি দিন; আমরা সাধারণত ৩০ মিনিটের মধ্যে যাচাই করি, তারপর চ্যাট বা বুকিং শুরু হয়। শপের অর্ডারে ক্যাশ অন ডেলিভারিও আছে। আপনার ওয়ালেটের পিন বা ওটিপি কাউকে দেবেন না, আমাদেরও না। চ্যাট শুরু হওয়ার পর ২৪ ঘণ্টা খোলা থাকে। রিফান্ড আমাদের রিফান্ড নীতি অনুযায়ী হয়।",
          ],
        },
        {
          heading: "ভালো আচরণ",
          body: [
            "সম্মান দেখান। মিথ্যা, অপমানজনক বা বেআইনি কিছু, অন্যের ব্যক্তিগত তথ্য বা বিজ্ঞাপন পোস্ট করবেন না। যত্নে শুরু হওয়া চ্যাটের টাকা যত্নের বাইরে ভেটকে দেওয়ার চেষ্টা করবেন না। নিয়ম ভাঙলে আমরা কনটেন্ট লুকাতে বা অ্যাকাউন্ট বন্ধ করতে পারি।",
          ],
        },
        {
          heading: "চিকিৎসা পরামর্শ",
          body: [
            "যত্নের ভেটের পরামর্শ আপনার দেওয়া তথ্য আর ছবির উপর ভিত্তি করে। এটা সরাসরি পরীক্ষার সমান নয়। জরুরি অবস্থায় ক্লিনিকে যান। টেলিমেডিসিন নীতি দেখুন।",
          ],
        },
        {
          heading: "দায়",
          body: [
            "যত্ন প্ল্যাটফর্মটি যেমন আছে তেমন দেয়। প্রত্যেক ভেট নিজের পরামর্শ ও চিকিৎসার জন্য দায়ী। আইন যতটা অনুমতি দেয়, পরোক্ষ ক্ষতির জন্য যত্ন দায়ী নয়। ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯-এর অধীনে আপনার অধিকার এতে কমে না।",
          ],
        },
        {
          heading: "পরিবর্তন ও যোগাযোগ",
          body: [
            "আমরা এই শর্ত বদলাতে পারি এবং শেষ পরিবর্তনের তারিখ এই পাতায় দেখাব। প্রশ্ন: hello@jotnocare.com।",
          ],
        },
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy policy",
      sub: "What we collect, why, and your choices.",
      sections: [
        {
          heading: "What we collect",
          body: [
            "Your name, email, optional phone number and home area; your pets' details and health records you add; chat messages, photos and prescriptions; when a call happened, how long it lasted and how it ended (never what was said); questions and reviews you post; payments (amount and status, not card details); and basic technical logs to keep the service safe.",
          ],
        },
        {
          heading: "Why",
          body: [
            "To run your account, connect you with vets, send reminders you asked for, process payments and refunds, prevent abuse, and improve Jotno. We don't sell your data and don't show third-party ads.",
          ],
        },
        {
          heading: "Who sees it",
          body: [
            "A vet sees your chat, your pet's details and photos only for chats you start with them. Audio and video calls go directly between you and the vet and are never recorded. Our team sees how each chat went (reply time, number of messages, calls, ratings) but not what was written; a team member reads a conversation only to resolve a complaint, a refund dispute or a safety concern, and each time the reason is logged. Questions and answers in the public Q&A are public (without your contact details). Our service providers (database and storage hosting, email delivery) process data only to provide their service. For payments we keep the number you paid from and the transaction ID, to match your payment and send any refund.",
          ],
        },
        {
          heading: "Storage and security",
          body: [
            "Data is stored with our hosting providers with encryption in transit. Vet verification documents and chat photos are private and shared only through short-lived links. Access by our team is logged.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            "You can edit your profile and pets at any time, turn notifications off, and ask us to export or delete your account by writing to hello@jotnocare.com. Payment records are kept as the law requires.",
          ],
        },
      ],
    },
    bn: {
      title: "গোপনীয়তা নীতি",
      sub: "আমরা কী সংগ্রহ করি, কেন, আর আপনার পছন্দ।",
      sections: [
        {
          heading: "কী সংগ্রহ করি",
          body: [
            "আপনার নাম, ইমেইল, ঐচ্ছিক ফোন নম্বর আর এলাকা; আপনার দেওয়া পোষা প্রাণীর তথ্য ও স্বাস্থ্য রেকর্ড; চ্যাটের মেসেজ, ছবি ও প্রেসক্রিপশন; কল কখন হলো, কতক্ষণ চলল আর কীভাবে শেষ হলো (কী কথা হলো তা কখনো নয়); আপনার প্রশ্ন ও রিভিউ; পেমেন্ট (পরিমাণ ও অবস্থা, কার্ডের তথ্য নয়); আর সেবা নিরাপদ রাখতে সাধারণ টেকনিক্যাল লগ।",
          ],
        },
        {
          heading: "কেন",
          body: [
            "আপনার অ্যাকাউন্ট চালাতে, ভেটের সাথে যুক্ত করতে, আপনার চাওয়া রিমাইন্ডার পাঠাতে, পেমেন্ট ও রিফান্ড করতে, অপব্যবহার ঠেকাতে আর যত্নকে আরও ভালো করতে। আমরা আপনার তথ্য বিক্রি করি না, অন্যের বিজ্ঞাপন দেখাই না।",
          ],
        },
        {
          heading: "কে দেখে",
          body: [
            "আপনি যে ভেটের সাথে চ্যাট শুরু করেন, শুধু তিনিই সেই চ্যাট, পোষা প্রাণীর তথ্য আর ছবি দেখেন। অডিও ও ভিডিও কল সরাসরি আপনার আর ভেটের মধ্যে হয়, কখনো রেকর্ড হয় না। চ্যাট কেমন হলো (উত্তরের সময়, মেসেজের সংখ্যা, কল, রেটিং) আমাদের টিম দেখে, কিন্তু কী লেখা হয়েছে তা নয়; শুধু অভিযোগ, রিফান্ড নিয়ে বিরোধ বা নিরাপত্তার কারণে টিমের কেউ কথোপকথন পড়েন, আর প্রতিবার কারণসহ তা লগে থাকে। পাবলিক প্রশ্নোত্তর সবাই দেখতে পারে (আপনার যোগাযোগের তথ্য ছাড়া)। আমাদের সেবাদাতারা (ডেটাবেস ও স্টোরেজ হোস্টিং, ইমেইল) শুধু তাদের সেবা দিতে তথ্য ব্যবহার করে। পেমেন্টের জন্য আমরা যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি আর ট্রানজেকশন আইডি রাখি, যাতে পেমেন্ট মেলানো আর রিফান্ড পাঠানো যায়।",
          ],
        },
        {
          heading: "সংরক্ষণ ও নিরাপত্তা",
          body: [
            "তথ্য আমাদের হোস্টিং সেবাদাতার কাছে থাকে, আদান-প্রদানে এনক্রিপ্টেড। ভেটের যাচাইয়ের ডকুমেন্ট আর চ্যাটের ছবি প্রাইভেট, শুধু অল্প সময়ের লিংকে দেখা যায়। আমাদের টিমের প্রতিটি অ্যাক্সেস লগ করা হয়।",
          ],
        },
        {
          heading: "আপনার পছন্দ",
          body: [
            "যেকোনো সময় প্রোফাইল আর পোষা প্রাণীর তথ্য বদলাতে, নোটিফিকেশন বন্ধ করতে, আর hello@jotnocare.com-এ লিখে অ্যাকাউন্টের তথ্য নিতে বা মুছতে বলতে পারেন। পেমেন্টের রেকর্ড আইন অনুযায়ী রাখা হয়।",
          ],
        },
      ],
    },
  },
  refund: {
    en: {
      title: "Refund policy",
      sub: "When you get your money back, and how.",
      sections: [
        {
          heading: "Chat consults",
          body: [
            `If the vet doesn't reply within ${business.consult.replyWindowMinutes} minutes of your payment, the chat is refunded in full automatically. If something else went wrong, write to us within 3 days and we'll review it.`,
          ],
        },
        {
          heading: "Clinic bookings",
          body: [
            "The booking fee holds the vet's time. If the vet cancels, we refund it. If you cancel or don't come, it isn't refunded. The visit fee is paid at the clinic, not on Jotno.",
          ],
        },
        {
          heading: "Shop orders",
          body: [
            `If an item arrives damaged or wrong, tell us within ${business.shop.returnDays} days with a photo and we'll replace it or refund it. Opened food and grooming products can't be returned for other reasons. A cancelled order is refunded in full.`,
          ],
        },
        {
          heading: "How refunds reach you",
          body: [
            "We send refunds by bKash or Nagad to the number you paid from (for cash on delivery, to a number you give us), usually within 2 working days. You get a notification with the refund's transaction ID.",
          ],
        },
      ],
    },
    bn: {
      title: "রিফান্ড নীতি",
      sub: "কখন টাকা ফেরত পাবেন, আর কীভাবে।",
      sections: [
        {
          heading: "চ্যাট কনসাল্ট",
          body: [
            `পেমেন্টের ${bn(business.consult.replyWindowMinutes)} মিনিটের মধ্যে ভেট উত্তর না দিলে চ্যাটের পুরো টাকা আপনাআপনি ফেরত যায়। অন্য কোনো সমস্যা হলে ৩ দিনের মধ্যে আমাদের লিখুন, আমরা দেখব।`,
          ],
        },
        {
          heading: "চেম্বার বুকিং",
          body: [
            "বুকিং ফি ভেটের সময় ধরে রাখে। ভেট বাতিল করলে আমরা ফেরত দিই। আপনি বাতিল করলে বা না এলে ফেরত হয় না। ভিজিট ফি চেম্বারে দেওয়া হয়, যত্নে নয়।",
          ],
        },
        {
          heading: "শপের অর্ডার",
          body: [
            `পণ্য ভাঙা বা ভুল এলে ছবিসহ ${bn(business.shop.returnDays)} দিনের মধ্যে জানান, আমরা বদলে দেব বা টাকা ফেরত দেব। খোলা খাবার ও গ্রুমিং পণ্য অন্য কারণে ফেরত নেওয়া হয় না। বাতিল অর্ডারের পুরো টাকা ফেরত দেওয়া হয়।`,
          ],
        },
        {
          heading: "টাকা কীভাবে ফেরত যায়",
          body: [
            "যে নম্বর থেকে পেমেন্ট করেছেন, সেই বিকাশ বা নগদ নম্বরে আমরা টাকা ফেরত পাঠাই (ক্যাশ অন ডেলিভারির ক্ষেত্রে আপনার দেওয়া নম্বরে), সাধারণত ২ কর্মদিবসের মধ্যে। রিফান্ডের ট্রানজেকশন আইডিসহ নোটিফিকেশন পাবেন।",
          ],
        },
      ],
    },
  },
  telemedicine: {
    en: {
      title: "Telemedicine policy",
      sub: "What an online vet chat can and can't do.",
      sections: [
        {
          heading: "Advice, not an examination",
          body: [
            "A chat or call lets a registered vet give advice from your description, photos and what they can see on video. The vet can't examine, test or treat the animal remotely, and may tell you to visit a clinic. Follow that advice.",
          ],
        },
        {
          heading: "Emergencies",
          body: [
            "For poisoning, heavy bleeding, breathing trouble, seizures or accidents, don't wait for a chat reply. Go to the nearest clinic. Our emergency page lists first aid and 24/7 vets.",
          ],
        },
        {
          heading: "Medicines",
          body: [
            "After a chat the vet may write a prescription you can open, print and show at a pharmacy; it is based only on the online consult. Vets won't prescribe controlled drugs or injections online. Follow the dose and days written, and see a vet in person if the animal gets worse. Never give human medicine to an animal unless a vet tells you to.",
          ],
        },
        {
          heading: "Who the vets are",
          body: [
            "Every vet shown as verified has a BVC registration checked by our team. Vets follow the professional rules of the Bangladesh Veterinary Council and are responsible for their own advice.",
          ],
        },
      ],
    },
    bn: {
      title: "টেলিমেডিসিন নীতি",
      sub: "অনলাইন ভেট চ্যাটে কী হয় আর কী হয় না।",
      sections: [
        {
          heading: "পরামর্শ, পরীক্ষা নয়",
          body: [
            "চ্যাট বা কলে রেজিস্টার্ড ভেট আপনার বর্ণনা, ছবি আর ভিডিওতে যা দেখেন তা থেকে পরামর্শ দেন। দূর থেকে ভেট প্রাণীকে পরীক্ষা, টেস্ট বা চিকিৎসা করতে পারেন না, আর ক্লিনিকে যেতে বলতে পারেন। সেই পরামর্শ মানুন।",
          ],
        },
        {
          heading: "জরুরি অবস্থা",
          body: [
            "বিষ খাওয়া, বেশি রক্তপাত, শ্বাসকষ্ট, খিঁচুনি বা দুর্ঘটনায় চ্যাটের উত্তরের অপেক্ষা করবেন না। কাছের ক্লিনিকে যান। আমাদের জরুরি পাতায় প্রাথমিক চিকিৎসা আর ২৪/৭ ভেট আছে।",
          ],
        },
        {
          heading: "ওষুধ",
          body: [
            "চ্যাটের পর ভেট প্রেসক্রিপশন লিখতে পারেন, যা আপনি খুলে প্রিন্ট করে ফার্মেসিতে দেখাতে পারবেন; এটা শুধু অনলাইন কনসাল্টের ভিত্তিতে লেখা। অনলাইনে ভেট নিয়ন্ত্রিত ওষুধ বা ইনজেকশন লিখবেন না। লেখা ডোজ আর দিন মেনে চলুন, আর অবস্থা খারাপ হলে সরাসরি ভেটের কাছে যান। ভেট না বললে মানুষের ওষুধ কখনো প্রাণীকে দেবেন না।",
          ],
        },
        {
          heading: "ভেটরা কারা",
          body: [
            "যাচাইকৃত দেখানো প্রত্যেক ভেটের BVC রেজিস্ট্রেশন আমাদের টিম মিলিয়ে দেখেছে। ভেটরা বাংলাদেশ ভেটেরিনারি কাউন্সিলের পেশাগত নিয়ম মানেন এবং নিজের পরামর্শের জন্য দায়ী।",
          ],
        },
      ],
    },
  },
};
