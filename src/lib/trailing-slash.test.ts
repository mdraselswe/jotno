import { describe, expect, it } from "vitest";
import { withTrailingSlash } from "./trailing-slash";

describe("withTrailingSlash", () => {
  it("adds the slash to page paths", () => {
    expect(withTrailingSlash("/en/chat/abc")).toBe("/en/chat/abc/");
    expect(withTrailingSlash("/en")).toBe("/en/");
    expect(withTrailingSlash("/account/appointments")).toBe("/account/appointments/");
  });

  it("keeps the query and hash", () => {
    expect(withTrailingSlash("/en/chat/abc?answer=1")).toBe("/en/chat/abc/?answer=1");
    expect(withTrailingSlash("/en/pay/x#top")).toBe("/en/pay/x/#top");
    expect(withTrailingSlash("https://jotno.com/en?ref=ABCD12")).toBe("https://jotno.com/en/?ref=ABCD12");
    expect(withTrailingSlash("https://jotno.com/en/vet/nadia?ref=ABCD12")).toBe(
      "https://jotno.com/en/vet/nadia/?ref=ABCD12",
    );
  });

  it("gives a bare origin the root path", () => {
    expect(withTrailingSlash("https://jotno.com?ref=ABCD12")).toBe("https://jotno.com/?ref=ABCD12");
  });

  it("leaves slashed URLs, files and non-URLs alone", () => {
    expect(withTrailingSlash("/")).toBe("/");
    expect(withTrailingSlash("/en/chat/abc/")).toBe("/en/chat/abc/");
    expect(withTrailingSlash("https://jotno.com/?ref=X")).toBe("https://jotno.com/?ref=X");
    expect(withTrailingSlash("/sw.js")).toBe("/sw.js");
    expect(withTrailingSlash("https://jotno.com/og.png")).toBe("https://jotno.com/og.png");
    expect(withTrailingSlash("")).toBe("");
    expect(withTrailingSlash("?x=1")).toBe("?x=1");
    expect(withTrailingSlash("not a url")).toBe("not a url");
  });
});
