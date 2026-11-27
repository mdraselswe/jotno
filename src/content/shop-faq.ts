import type { FaqItem } from "./faq";

/**
 * ✏️ Shop questions, shown under the catalogue with FAQPage structured data,
 * so "cat food home delivery" / "পেট শপ ক্যাশ অন ডেলিভারি" searches find a
 * real answer. Placeholders come from business.shop: {inside} / {outside}
 * delivery fee, {free} free-delivery threshold, {inMin}–{inMax} and
 * {outMin}–{outMax} delivery days, {returns} days to report a problem.
 */
export interface ShopFaq {
  title: string;
  items: readonly FaqItem[];
}

export const shopFaq: Record<string, ShopFaq> = {
  en: {
    title: "Pet shop questions",
    items: [
      {
        q: "Do you deliver cat food and pet supplies across Bangladesh?",
        a: "Yes. We deliver to Dhaka and every district. Delivery is {inside} inside Dhaka and {outside} outside Dhaka, and free on orders of {free} or more.",
      },
      {
        q: "How long does delivery take?",
        a: "Usually {inMin} to {inMax} days inside Dhaka and {outMin} to {outMax} days outside Dhaka. You can follow the order from your account.",
      },
      {
        q: "Can I pay cash on delivery?",
        a: "Yes. Pay the rider when the parcel arrives, or pay from your phone with bKash or Nagad.",
      },
      {
        q: "Are the products genuine?",
        a: "Every product is checked by our team and picked with vets: cat and dog food, cat litter, toys, beds and grooming supplies.",
      },
      {
        q: "What if an item arrives damaged or wrong?",
        a: "Tell us within {returns} days with a photo and we replace it or refund it. Opened food and grooming products can't be returned for other reasons.",
      },
      {
        q: "Which food is right for my cat or dog?",
        a: "It depends on age, weight and health. Ask a verified vet on Jotno for free before you switch food, especially for kittens, puppies and pets with a sensitive stomach.",
      },
    ],
  },
  bn: {
    title: "পেট শপ নিয়ে প্রশ্ন",
    items: [
      {
        q: "সারা বাংলাদেশে ক্যাট ফুড আর পোষা প্রাণীর জিনিস ডেলিভারি দেন?",
        a: "হ্যাঁ। ঢাকা আর প্রতিটি জেলায় ডেলিভারি দিই। ঢাকার ভেতরে ডেলিভারি চার্জ {inside}, ঢাকার বাইরে {outside}, আর {free} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি।",
      },
      {
        q: "ডেলিভারি পেতে কত দিন লাগে?",
        a: "সাধারণত ঢাকার ভেতরে {inMin} থেকে {inMax} দিন আর ঢাকার বাইরে {outMin} থেকে {outMax} দিন। অ্যাকাউন্ট থেকে অর্ডার কোথায় আছে দেখতে পারবেন।",
      },
      {
        q: "ক্যাশ অন ডেলিভারি আছে?",
        a: "হ্যাঁ। পার্সেল হাতে পেয়ে রাইডারকে টাকা দিন, অথবা ফোন থেকে বিকাশ বা নগদে পেমেন্ট করুন।",
      },
      {
        q: "পণ্যগুলো কি আসল?",
        a: "প্রতিটি পণ্য আমাদের টিম যাচাই করে আর ভেটদের সাথে মিলে বাছাই করে: বিড়াল ও কুকুরের খাবার, ক্যাট লিটার, খেলনা, বেড আর গ্রুমিংয়ের জিনিস।",
      },
      {
        q: "পণ্য ভাঙা বা ভুল এলে কী করব?",
        a: "ছবিসহ {returns} দিনের মধ্যে জানান, আমরা বদলে দেব বা টাকা ফেরত দেব। খোলা খাবার ও গ্রুমিং পণ্য অন্য কারণে ফেরত নেওয়া হয় না।",
      },
      {
        q: "আমার বিড়াল বা কুকুরের জন্য কোন খাবার ভালো?",
        a: "বয়স, ওজন আর শরীরের অবস্থার ওপর নির্ভর করে। খাবার বদলানোর আগে যত্ন-এ যাচাইকৃত ভেটকে ফ্রিতে প্রশ্ন করুন, বিশেষ করে বাচ্চা বিড়াল-কুকুর বা যাদের পেট সহজে খারাপ হয়।",
      },
    ],
  },
};
