// @vitest-environment node
import { describe, expect, it } from "vitest";
import { b64url, encryptPayload, vapidHeader } from "./crypto";

const enc = new TextEncoder();
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
async function hmac(key: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** What the browser does (RFC 8291 §3.4), to prove our side is right. */
async function decrypt(
  body: Uint8Array<ArrayBuffer>,
  ua: CryptoKeyPair,
  uaPublic: Uint8Array<ArrayBuffer>,
  authSecret: Uint8Array<ArrayBuffer>,
) {
  const salt = body.slice(0, 16);
  const idLen = body[20] ?? 0;
  const asPublic = body.slice(21, 21 + idLen);
  const cipher = body.slice(21 + idLen);
  const asKey = await crypto.subtle.importKey(
    "raw",
    asPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256),
  );
  const prkKey = await hmac(authSecret, shared);
  const ikm = await hmac(
    prkKey,
    concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])),
  );
  const prk = await hmac(salt, ikm);
  const cek = (
    await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))
  ).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(
    0,
    12,
  );
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, cipher));
  expect(plain.at(-1)).toBe(2);
  return new TextDecoder().decode(plain.slice(0, -1));
}

describe("web push crypto", () => {
  it("encrypts a payload the browser can decrypt", async () => {
    const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair;
    const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
    const authSecret = crypto.getRandomValues(new Uint8Array(16));
    const message = JSON.stringify({ title: "ডা. নুসরাত উত্তর দিয়েছেন", body: "Hi", url: "/chat/x/" });
    const body = await encryptPayload(
      {
        endpoint: "https://push.example/x",
        p256dh: b64url.encode(uaPublic),
        auth: b64url.encode(authSecret),
      },
      enc.encode(message),
    );
    expect(await decrypt(body, ua, uaPublic, authSecret)).toBe(message);
  });

  it("signs a VAPID JWT that verifies with the public key", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const header = await vapidHeader(
      "https://fcm.googleapis.com/fcm/send/abc",
      b64url.encode(pub),
      jwk.d ?? "",
      "mailto:a@b.c",
    );
    const token = /t=([^,]+)/.exec(header)?.[1] ?? "";
    const [h, c, s] = token.split(".") as [string, string, string];
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      b64url.decode(s),
      enc.encode(`${h}.${c}`),
    );
    expect(ok).toBe(true);
    expect(JSON.parse(new TextDecoder().decode(b64url.decode(c))).aud).toBe("https://fcm.googleapis.com");
  });
});
