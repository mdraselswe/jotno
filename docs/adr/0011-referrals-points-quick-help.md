# 0011. Invites, points, levels and ৳99 quick help

Date: 2026-11-25 · Status: accepted

## Context

Jotno has to grow without paid ads and without the owner paying subsidies out of pocket. Owners need a cheap first step before a full chat, and vets need a reason to bring their own clients. Phone OTP costs money per message, so sign-up stays email-only for now.

## Decision

**Sharing.** One `ShareButton` (`features/share`) on vet, question, article, product, emergency, join and quick-help pages and in the footer: Facebook, WhatsApp, Messenger (phones), copy link, and the phone's share sheet. A signed-in person's links carry `?ref=CODE`. The code comes from the `jotno_my_ref` cookie at click time, so the pages stay cacheable. Link previews use one brand image at `/og.png`, written in Latin text because the image renderer can't shape Bangla. Vets get a QR code and a printable clinic poster (`/dashboard/promote`).

**Invites.** `proxy.ts` keeps a valid `?ref` for 30 days (`jotno_ref`) and gives each browser an id (`jotno_did`). When onboarding finishes, `recordSignup` records the invite (`referrals`). These rules apply:

- An invite is flagged and earns nothing when it comes from the inviter's own browser, from a browser that was already used for another invite, or from a throwaway email domain.
- Sign-up points count for at most `signupMonthlyCap` people a month.
- Admins see a watch list of more than `watchPerDay` sign-ups a day on `/admin/referrals`, and can flag or clear an invite there.

**Points** are a signed ledger (`points`), and 1 point = ৳1. Point rules:

- **When they are earned:**
  - The inviter gets `signupPoints`. These stay pending until the new person adds a pet, asks a question or pays.
  - The inviter gets `firstPaidPoints` when the new person pays for the first time, multiplied by the inviter's level.
  - The new person gets `welcomePoints`.
- **Where they can be spent:**
  - On a shop order, for at most `orderSpendBps` of it.
  - On a chat or quick help, for at most `commissionSpendBps` of **Jotno's commission**. The vet's share never changes.
- **Limits and refunds:**
  - Points expire after `pointsExpireDays`.
  - They can never be cashed out.
  - They come back when the thing they paid for is cancelled or refunded.

**Levels** depend on paid invites: star 3, gold 10, platinum 25. Owner perks:

- a points multiplier;
- gold and above go first in the quick-help queue.

Vet perks:

- star and above pay `vetOwnClientBps` commission on chats with owners they invited;
- gold gets `goldFeaturedDays` of featured placement free once a month;
- platinum gets a search boost and a badge.

**Quick help** (`/quick`, `business.quick`) costs ৳99. It works like this:

1. It can be bought only while at least one vet is on duty. Vets set daily duty hours in Bangladesh time on `/dashboard/quick`.
2. Once paid, the request goes to every vet on duty, and the first vet to answer takes it. That vet's answer opens a short chat (`consults.kind = quick`): the owner gets `ownerMessages` follow-ups and there are no calls. The vet earns `vetShare`.
3. If nobody answers within `answerMinutes`, a job turns the request into a credit. The owner can then ask again free or take a refund.
4. The owner can move to a full chat and pay only the difference.

The ledger is written when a vet takes the request, not at payment, so a credited request is never counted twice.

## Consequences

- Every reward comes out of Jotno's own margin. No point is ever paid out as cash.
- The fraud checks are deliberately light: no phone check, and browser ids can be cleared. The admin list and the monthly cap limit the damage. Revisit with phone OTP if abuse shows up.
- Migration `20261125172346_growth_referrals_quick.sql` must be pushed to production (`supabase db push`) before deploying this code.
