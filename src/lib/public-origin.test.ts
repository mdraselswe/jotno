import { describe, expect, it } from "vitest";
import { publicOrigin } from "./public-origin";

const bound = new URL("http://0.0.0.0:3000/auth/callback/?code=x");
const SITE = "https://jotnocare.com/";

describe("publicOrigin", () => {
  it("uses the proxy's forwarded host and protocol", () => {
    const h = new Headers({ "x-forwarded-host": "demo.jotnocare.com", "x-forwarded-proto": "https" });
    expect(publicOrigin(h, bound, SITE)).toBe("https://demo.jotnocare.com");
  });

  it("takes the first value of a forwarded list and defaults to https", () => {
    const h = new Headers({ "x-forwarded-host": "jotnocare.com, internal:3000" });
    expect(publicOrigin(h, bound, SITE)).toBe("https://jotnocare.com");
  });

  it("uses the Host header when there is no proxy header", () => {
    const h = new Headers({ host: "localhost:4173" });
    expect(publicOrigin(h, new URL("http://localhost:4173/x"), SITE)).toBe("http://localhost:4173");
  });

  it("never returns a bind-all address: falls back to the site URL", () => {
    const h = new Headers({ host: "0.0.0.0:3000" });
    expect(publicOrigin(h, bound, SITE)).toBe("https://jotnocare.com");
  });

  it("keeps the request URL when nothing better is known", () => {
    expect(publicOrigin(new Headers(), new URL("http://127.0.0.1:3100/x"))).toBe("http://127.0.0.1:3100");
  });
});
