# 0009. Calls, consult monitoring and prescriptions

Date: 2026-11-23 · Status: accepted

## Context

Owners and vets wanted to talk, not only type. A paid video service (Twilio, Agora, Daily) costs money per minute, and Google Meet can't be started from our app without each person's Google consent. The business also has to know whether consults go well (reply time, calls, complaints) without reading people's private conversations. Vets asked for a written prescription the owner can take to a pharmacy.

## Decision

- **Calls are browser WebRTC, peer to peer.** Signalling (ring, accept, SDP, ICE) uses Supabase Realtime broadcast on the consult's channel `consult:<id>`. Media goes straight between the two browsers; Cloudflare TURN (free up to 1,000 GB a month) relays it when a carrier's CGNAT blocks a direct path. Without TURN keys the app falls back to STUN only and calls still work on most networks. Calls are never recorded.
- **The consult channel is private.** `realtime.messages` has RLS policies that let only the owner and the vet of that consult (`public.is_consult_participant`) read or send on `consult:<uuid>`. The client joins with `private: true` after `realtime.setAuth()`.
- **Ringing reaches every page (2026-11-25).** Each signed-in person also listens on their own private topic `user:<uuid>` (`public.is_own_user_topic`, read-only; nobody sends from the browser). The server rings it with `realtime.send` when a call starts and sends "over" when it's answered, declined, cancelled or missed, so the incoming-call screen (`IncomingCall` in the root layout) shows on any page. Answer opens the chat with `?answer=<call>` and the call screen picks up at once. The push is call-style (stays until tapped, vibrates, Answer / Decline; Decline posts to `/api/calls/decline/`) and lives only as long as the ring (push TTL = `ringSeconds`). A missed call (caller gave up, or the cron's no-answer) pushes "Missed call from <name>" to the callee, replacing the ringing notification.
- **A `calls` row per call** (status, who, media, answered/ended times, end reason, whether TURN was used). The browser sends a heartbeat every 30 s; the 5-minute cron ends rings that nobody answered, calls whose heartbeat stopped, and calls in consults that closed. Each finished call leaves a `system:call:…` line in the chat.
- **Admins see metadata, not content.** `/admin/consults` shows reply time, message counts, photos, calls, ratings, complaints and whether a prescription was written, plus per-vet 30-day stats. Reading a conversation needs a written reason, which goes to `audit_log` as `consult.read` and gives that admin 30 minutes of access (chat, photos, prescription). The reason shows in the consult's timeline. Owners and vets can report a consult; that notifies admins.
- **Prescriptions** are one row per consult (`prescriptions`, upsert), written by the vet while the chat is open or up to 24 hours after it closes (only if the vet replied). Medicines can link to shop products; the owner can add those to the cart. The page prints as a standard prescription with the vet's BVC registration.

## Consequences

- Ringing reaches someone who has any Jotno page open, or through the push notification. With the browser fully closed it's only the notification (no native call screen); iPhones get push only after "Add to Home Screen". The chat and the vet dashboard ask people to turn notifications on.
- Facebook/Messenger in-app browsers can't call; the app tells people to open the page in Chrome.
- In Supabase → Realtime settings, "Allow public access" must be off for the channel policies to matter.
- A call needs both people online at the same time; that is the vet's normal working pattern for an open chat.
