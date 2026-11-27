import { describe, expect, it } from "vitest";
import { bijoyToUnicode } from "./bijoy";

// Lines from the BVC voter list (2026), as the PDF stores them.
describe("bijoyToUnicode", () => {
  it.each([
    ["evsjv‡`k †f‡Uwibvwi KvDwÝj", "বাংলাদেশ ভেটেরিনারি কাউন্সিল"],
    ["Wvt wmivR DwÏb Avng`", "ডাঃ সিরাজ উদ্দিন আহমদ"],
    ["P~ovšÍ †fvUvi ZvwjKv", "চূড়ান্ত ভোটার তালিকা"],
    ["wbe©vPb KZ…©c‡ÿi Kvh©vjq", "নির্বাচন কর্তৃপক্ষের কার্যালয়"],
    ["Wvt †gvnv¤§` dviæK †nv‡mb", "ডাঃ মোহাম্মদ ফারুক হোসেন"],
    ["Wvt cÖ`xc P›`ª gÛj", "ডাঃ প্রদীপ চন্দ্র মন্ডল"],
    ["Wvt †gvt Avmv`y¾vgvb", "ডাঃ মোঃ আসাদুজ্জামান"],
    ["MÖvg I WvKNi: KvÂbcyi cwðgcvov", "গ্রাম ও ডাকঘর: কাঞ্চনপুর পশ্চিমপাড়া"],
    ["¯’vbvšÍi Kiv n‡jv", "স্থানান্তর করা হলো"],
    ["Wvt Zzwnb Avj †di‡`․m", "ডাঃ তুহিন আল ফেরদৌস"],
    ["PÆMÖvg wefvM", "চট্টগ্রাম বিভাগ"],
    ["3047", "৩০৪৭"],
  ])("%s", (bijoy, unicode) => {
    expect(bijoyToUnicode(bijoy)).toBe(unicode.normalize("NFC"));
  });

  it("reads the look-alikes some PDF exports use", () => {
    expect(bijoyToUnicode("Wvt cÖvY †Mvcvj P\u03BCeZ©x")).toBe("ডাঃ প্রাণ গোপাল চক্রবর্তী".normalize("NFC"));
    expect(bijoyToUnicode("myeªZ Kzgvi ev\u2023o")).toBe("সুব্রত কুমার বাড়ৈ".normalize("NFC"));
    expect(bijoyToUnicode("fv¯\u2025i")).toBe("ভাস্কর");
    expect(bijoyToUnicode("GwjP g\u00D0j")).toBe("এলিচ মণ্ডল".normalize("NFC"));
  });

  it("moves a reph typed after a letter and its vowel signs, and only a reph", () => {
    expect(bijoyToUnicode("Wv: SY©v Av³vi")).toBe(bijoyToUnicode("Wv: SYv© Av³vi"));
    expect(bijoyToUnicode("SYv©")).toBe("ঝর্ণা".normalize("NFC"));
    expect(bijoyToUnicode("KvwZ©K")).toBe("কার্তিক".normalize("NFC"));
  });

  it("reads • at the start of a word as ৈ, and as ক্স inside one", () => {
    expect(bijoyToUnicode("Avkxl Kzgvi \u2022eivMx")).toBe("আশীষ কুমার বৈরাগী".normalize("NFC"));
    expect(bijoyToUnicode("\u2022mq`")).toBe(bijoyToUnicode("ˆmq`"));
    expect(bijoyToUnicode("ev\u2022")).toBe("বাক্স");
  });

  it("puts u-kar after ya-phala and drops doubled aa-kar", () => {
    expect(bijoyToUnicode("we`y¨r")).toBe("বিদ্যুৎ".normalize("NFC"));
    expect(bijoyToUnicode("Avvn")).toBe("আহ");
    expect(bijoyToUnicode("Aveyyj")).toBe("আবুল");
  });

  it("reads the copies that swap ‼ and ‽ in for the e-kar", () => {
    expect(bijoyToUnicode("‼gvnv¤§`")).toBe(bijoyToUnicode("†gvnv¤§`"));
    expect(bijoyToUnicode("†nv‽mb")).toBe("হোসেন");
  });
});
