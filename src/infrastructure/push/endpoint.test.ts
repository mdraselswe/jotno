import { describe, expect, it } from "vitest";
import { isPushEndpoint } from "./endpoint";

describe("isPushEndpoint", () => {
  it("accepts the browser push services", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
  });

  it("rejects other hosts, plain http, ports and look-alikes", () => {
    expect(isPushEndpoint("https://example.com/push")).toBe(false);
    expect(isPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com.evil.test/x")).toBe(false);
    expect(isPushEndpoint("https://evilnotify.windows.com.test/x")).toBe(false);
    expect(isPushEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isPushEndpoint("not a url")).toBe(false);
  });
});
