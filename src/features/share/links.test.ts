import { describe, expect, it } from "vitest";
import { pageLink, shareUrl } from "./links";

const URL_ = "https://jotnocare.com/vet/dr-a/?ref=ABCD12";

describe("shareUrl", () => {
  it("builds a Facebook sharer link", () => {
    expect(shareUrl("facebook", URL_)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_)}`,
    );
  });
  it("puts the text before the link for WhatsApp", () => {
    expect(shareUrl("whatsapp", URL_, "Dr A")).toBe(
      `https://wa.me/?text=${encodeURIComponent(`Dr A\n${URL_}`)}`,
    );
    expect(shareUrl("whatsapp", URL_)).toBe(`https://wa.me/?text=${encodeURIComponent(URL_)}`);
  });
  it("opens the Messenger app", () => {
    expect(shareUrl("messenger", URL_)).toBe(`fb-messenger://share/?link=${encodeURIComponent(URL_)}`);
  });
});

describe("pageLink", () => {
  it("drops the fragment", () => {
    expect(pageLink("https://jotnocare.com/a/#top")).toBe("https://jotnocare.com/a/");
  });
});
