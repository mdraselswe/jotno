import { describe, expect, it } from "vitest";
import { compareNames, nameKey, nameWords } from "./bangla-name";

describe("nameWords", () => {
  it("drops titles and punctuation", () => {
    expect(nameWords("ডাঃ মোঃ আসাদুল ইসলাম")).toEqual(nameWords("আসাদুল ইসলাম"));
    expect(nameWords("ডা: মো. আসাদুল ইসলাম")).toEqual(nameWords("আসাদুল ইসলাম"));
    expect(nameWords("Dr. Md. Rahim")).toEqual(["rahim"]);
  });

  it("is empty without a name", () => {
    expect(nameWords(null)).toEqual([]);
    expect(nameWords("ডাঃ")).toEqual([]);
  });
});

describe("compareNames", () => {
  it("sees the same name through titles, spaces and spelling swaps", () => {
    expect(compareNames("ডাঃ মোহাম্মদ ফারুক হোসেন", "মোঃ ফারুক হোসেন")).toBe("same");
    expect(compareNames("সুদীপ দেব নাথ জয়", "সুদীপ দেবনাথ জয়")).toBe("same");
    expect(compareNames("শামছুল আতাহার", "সামছুল আতাহার")).toBe("same");
    expect(compareNames("তুহিন আল ফেরদৌস", "তুহিন আল ফেরদাউস")).toBe("close");
  });

  it("calls a name with an extra or missing word close", () => {
    expect(compareNames("আসাদুল ইসলাম", "আসাদুল ইসলাম শেখ")).toBe("close");
  });

  it("calls other people different", () => {
    expect(compareNames("সিরাজ উদ্দিন আহমদ", "ফারুক হোসেন")).toBe("different");
    expect(compareNames("আসাদুল ইসলাম", null)).toBe("different");
  });
});

describe("nameKey", () => {
  it("is the same for names that compare as the same", () => {
    expect(nameKey("ডাঃ সুদীপ দেব নাথ জয়")).toBe(nameKey("সুদীপ দেবনাথ জয়"));
    expect(nameKey("")).toBeNull();
  });
});
