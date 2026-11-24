import { describe, expect, it } from "vitest";
import { toIceServers } from "./ice";

describe("toIceServers", () => {
  it("reads Cloudflare's wrapped answer and drops port 53", () => {
    const servers = toIceServers({
      iceServers: {
        urls: ["stun:stun.cloudflare.com:3478", "turn:turn.cloudflare.com:53?transport=udp"],
        username: "u",
        credential: "c",
      },
    });
    expect(servers).toEqual([{ urls: ["stun:stun.cloudflare.com:3478"], username: "u", credential: "c" }]);
  });

  it("reads Metered's bare array", () => {
    const servers = toIceServers([
      { urls: "stun:standard.relay.metered.ca:80" },
      { urls: "turns:standard.relay.metered.ca:443?transport=tcp", username: "u", credential: "c" },
    ]);
    expect(servers).toHaveLength(2);
    expect(servers[1]?.urls).toEqual(["turns:standard.relay.metered.ca:443?transport=tcp"]);
  });

  it("rejects an empty or broken answer", () => {
    expect(() => toIceServers([])).toThrow();
    expect(() => toIceServers({ error: "Invalid API Key" })).toThrow();
  });
});
