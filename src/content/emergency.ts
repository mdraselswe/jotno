/**
 * ✏️ First-aid cards for the emergency page. General guidance only, written to
 * get the animal to a vet safely: never a replacement for one. Have a vet
 * review this text before launch (see the launch checklist).
 */
export interface FirstAidCard {
  id: string;
  title: string;
  steps: readonly string[];
  dont?: string;
}

export interface EmergencyContent {
  intro: string;
  cards: readonly FirstAidCard[];
  /** What to have ready when you call or chat with a vet. */
  tellTitle: string;
  tell: readonly string[];
}

export const emergencyContent: Record<string, EmergencyContent> = {
  en: {
    intro:
      "Stay calm, keep the animal still and warm, and call a vet on the way. These steps buy time; they don't replace a vet.",
    tellTitle: "What to tell the vet",
    tell: [
      "Which animal, its age and rough weight",
      "What happened, and when",
      "What it ate or touched (keep the packet)",
      "Is it breathing normally, bleeding, able to stand?",
    ],
    cards: [
      {
        id: "poison",
        title: "Poisoning (rat poison, medicine, chemicals)",
        steps: [
          "Move the animal away from the poison and keep the packet.",
          "Don't make it vomit unless a vet tells you to.",
          "Call a vet now and say what it ate, how much and when.",
        ],
        dont: "Don't give milk, oil or salt water.",
      },
      {
        id: "bleeding",
        title: "Heavy bleeding",
        steps: [
          "Press a clean cloth firmly on the wound for 5 minutes without lifting.",
          "If it soaks through, add more cloth on top.",
          "Keep pressing on the way to the vet.",
        ],
      },
      {
        id: "breathing",
        title: "Choking or trouble breathing",
        steps: [
          "Look in the mouth; remove an object only if you can see it and it comes out easily.",
          "Keep the animal calm and cool, with its neck straight.",
          "Go to a vet straight away.",
        ],
        dont: "Don't put your fingers deep into the throat.",
      },
      {
        id: "heat",
        title: "Heatstroke",
        steps: [
          "Move it to shade or a fan.",
          "Wet the body with cool (not ice-cold) water, especially belly and paws.",
          "Offer small sips of water and see a vet.",
        ],
      },
      {
        id: "accident",
        title: "Road accident or fall",
        steps: [
          "Approach slowly; a hurt animal may bite. Cover the head with a cloth.",
          "Slide it onto a board or blanket to carry it flat.",
          "Keep it warm and go to the vet, even if it seems fine.",
        ],
      },
      {
        id: "seizure",
        title: "Seizure (fits)",
        steps: [
          "Move things away so it can't get hurt; dim the lights.",
          "Don't hold it or put anything in its mouth.",
          "Time the seizure. Over 3 minutes, or more than one: go to a vet now.",
        ],
      },
    ],
  },
  bn: {
    intro:
      "শান্ত থাকুন, প্রাণীটাকে স্থির আর গরম রাখুন, আর যেতে যেতে ভেটকে কল করুন। এই ধাপগুলো সময় দেয়; ভেটের বিকল্প নয়।",
    tellTitle: "ভেটকে যা বলবেন",
    tell: [
      "কোন প্রাণী, বয়স আর আনুমানিক ওজন",
      "কী হয়েছে, আর কখন",
      "কী খেয়েছে বা ছুঁয়েছে (প্যাকেটটা রেখে দিন)",
      "স্বাভাবিকভাবে শ্বাস নিচ্ছে কি না, রক্ত পড়ছে কি না, দাঁড়াতে পারছে কি না",
    ],
    cards: [
      {
        id: "poison",
        title: "বিষ খাওয়া (ইঁদুরের বিষ, ওষুধ, কেমিক্যাল)",
        steps: [
          "প্রাণীটাকে বিষ থেকে সরিয়ে নিন আর প্যাকেটটা রেখে দিন।",
          "ভেট না বললে বমি করাবেন না।",
          "এখনই ভেটকে কল করে বলুন কী, কতটা আর কখন খেয়েছে।",
        ],
        dont: "দুধ, তেল বা লবণ পানি খাওয়াবেন না।",
      },
      {
        id: "bleeding",
        title: "বেশি রক্তপাত",
        steps: [
          "পরিষ্কার কাপড় দিয়ে ক্ষতে ৫ মিনিট শক্ত করে চেপে ধরুন, তুলবেন না।",
          "ভিজে গেলে উপরে আরও কাপড় দিন।",
          "ভেটের কাছে যাওয়ার পথেও চেপে রাখুন।",
        ],
      },
      {
        id: "breathing",
        title: "গলায় আটকানো বা শ্বাসকষ্ট",
        steps: [
          "মুখের ভেতর দেখুন; জিনিসটা দেখা গেলে আর সহজে বের হলে তবেই বের করুন।",
          "প্রাণীটাকে শান্ত আর ঠান্ডা রাখুন, ঘাড় সোজা রাখুন।",
          "সাথে সাথে ভেটের কাছে যান।",
        ],
        dont: "গলার গভীরে আঙুল দেবেন না।",
      },
      {
        id: "heat",
        title: "হিটস্ট্রোক",
        steps: [
          "ছায়ায় বা ফ্যানের নিচে নিন।",
          "ঠান্ডা (বরফ নয়) পানিতে শরীর ভেজান, বিশেষ করে পেট আর পা।",
          "অল্প অল্প পানি দিন আর ভেট দেখান।",
        ],
      },
      {
        id: "accident",
        title: "সড়ক দুর্ঘটনা বা পড়ে যাওয়া",
        steps: [
          "ধীরে কাছে যান; ব্যথা পেলে কামড়াতে পারে। মাথা কাপড়ে ঢেকে দিন।",
          "বোর্ড বা কম্বলে শুইয়ে সমান করে বহন করুন।",
          "গরম রাখুন আর ভেটের কাছে যান, ঠিক মনে হলেও।",
        ],
      },
      {
        id: "seizure",
        title: "খিঁচুনি",
        steps: [
          "আশপাশের জিনিস সরিয়ে দিন যাতে ব্যথা না পায়; আলো কমিয়ে দিন।",
          "ধরে রাখবেন না বা মুখে কিছু দেবেন না।",
          "সময় গুনুন। ৩ মিনিটের বেশি বা একাধিকবার হলে এখনই ভেটের কাছে যান।",
        ],
      },
    ],
  },
};
