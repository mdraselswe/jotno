import { describe, expect, it } from "vitest";
import { pushSupport, type PushEnvironment } from "./push-support";

const UA = {
  chromeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-A155F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0.0;]",
  messengerIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/480.0]",
};

/** A desktop browser that can do everything; each test changes what it needs. */
const env = (over: Partial<PushEnvironment> = {}): PushEnvironment => ({
  hasKey: true,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  permission: "default",
  userAgent: UA.chromeWin,
  maxTouchPoints: 0,
  standalone: false,
  ...over,
});

describe("pushSupport", () => {
  it("is ready on desktop Chrome, Edge, Firefox, macOS Safari and Android Chrome", () => {
    for (const userAgent of [UA.chromeWin, UA.edge, UA.firefox, UA.macSafari, UA.androidChrome])
      expect(pushSupport(env({ userAgent }))).toBe("ready");
  });

  it("asks iPhone and iPad users to add Jotno to the Home Screen first", () => {
    // iOS Safari in a tab has no PushManager at all.
    expect(pushSupport(env({ userAgent: UA.iphone, hasPushManager: false }))).toBe("ios");
    expect(pushSupport(env({ userAgent: UA.ipad, maxTouchPoints: 5, hasPushManager: false }))).toBe("ios");
  });

  it("is ready in the installed iPhone app on iOS 16.4+", () => {
    expect(pushSupport(env({ userAgent: UA.iphone, standalone: true }))).toBe("ready");
  });

  it("asks for an iOS update when the installed app has no push", () => {
    expect(
      pushSupport(
        env({ userAgent: UA.iphone, standalone: true, hasPushManager: false, hasNotification: false }),
      ),
    ).toBe("ios-update");
  });

  it("sends Facebook and Messenger in-app browsers to a real browser", () => {
    expect(pushSupport(env({ userAgent: UA.facebookAndroid, hasPushManager: false }))).toBe("in-app");
    expect(pushSupport(env({ userAgent: UA.messengerIos, hasPushManager: false }))).toBe("in-app");
  });

  it("reports a block only the browser settings can undo", () => {
    expect(pushSupport(env({ permission: "denied" }))).toBe("blocked");
  });

  it("is unsupported without the APIs, or when the site has no push key", () => {
    expect(pushSupport(env({ hasNotification: false, permission: null }))).toBe("unsupported");
    expect(pushSupport(env({ hasServiceWorker: false }))).toBe("unsupported");
    expect(pushSupport(env({ hasKey: false }))).toBe("unsupported");
  });
});
