# Jotno redesign — hand-over note

Branch: **`redesign/pro-ui`** (local only; push ba `main`-e merge kora hoyni — `main`-e push korlei jotnocare.com ar demo auto-deploy hoy).

## Locally kivabe chalaben

```powershell
git checkout redesign/pro-ui
pnpm install
```

Demo data diye production build (one-click owner/vet/admin login shoho). `.env.demo.local`-e auth/demo-login key nei, tai demo site-er env (`.env.demo.hostinger.local`) use korun, kintu site URL localhost kore din (Node `--env-file` aage set kora variable bodlay na):

```powershell
$env:NEXT_PUBLIC_SITE_URL = "http://localhost:3000"
```

```powershell
node --env-file=.env.demo.hostinger.local scripts/build.ts
```

```powershell
node --env-file=.env.demo.hostinger.local node_modules/next/dist/bin/next start -p 3000
```

Tarpor <http://localhost:3000> khulun. Login page-e "Try a demo account" theke owner / vet / admin bechhe nin. (Ei build demo database-ei kaj kore — demo data, production na.)
Local Supabase chalu thakle shudhu `pnpm build` + `pnpm start`-o hobe. Ei machine-e build ~25 min lage.

Prottek page 360px mobile, desktop, light ar dark — char bhabe dekhun.

## Ki bodlalo, kothay dekhben

### Landing (`/`)

- **Scroll halka**: Lenis smooth-scroll, hero-r scroll-scrub GSAP ar WebGL blob (phone-e) bad. Card-er glowing border ekhon shudhu hover-e ghore (aage protiti card protiti frame-e repaint korto). Button-er backdrop blur, header-er emergency button-er box-shadow animation (sticky blurred header repaint korto) — ei duita-o bad/halka.
- **Animation shudhu niche scroll korle**: `ScrollScenes` ekhon IntersectionObserver + CSS (GSAP chara). Uporer dike scroll korle kono reverse animation nei; element screen-er niche chole gele abar "arm" hoy, tai protibar niche namle abar play hoy. Screen-e/upore thaka jinish load-e kokhono lukay na. Reduced motion-e kichui nore na.
- **Bangla juktakkhor (iOS)**: WebKit (iOS-er Chrome-o WebKit) letter-spacing ≠ 0 hole juktakkhor bhenge dey. `globals.css`-e Bangla page-e shob `tracking-*` reset kora hoyeche. iPhone-e hero "প্রাণীর যত্ন" check korun.
- **Emergency section**: phone-e icon + title ek line-e, tarpor text, tarpor full-width duita button (Emergency help + Find a vet); desktop-e ek row.
- **Footer**: "Follow us" block — Facebook-er brand-colour boro button (logo shoho); link column-e heading.
- Hero search button ekhon brand blue.

### Header ar menu (shob page)

- **Hamburger menu** (phone): upore boro Language ar Theme segmented control; tarpor account card (avatar, naam, role; vet/admin hole Dashboard/Admin shortcut) ba Sign in card; main page-gulo icon tile + chevron + current page highlight; "More" link grid; niche Emergency. **Kono item-e tap korle drawer nije bondho hoy.**
- **Avatar**: ekhon ashol chobi — DB theke (Jotno-te upload kora chobi → vet profile photo → Google photo), circle-e center-crop; load na hole initial.
- **Avatar menu**: notun design — upore chobi + naam + email + role pill, vet/admin-er jonno Dashboard/Admin upore, tarpor icon tile shoho My account / pets / chats / appointments / orders, Settings, lal Sign out.
- Header-e **cart icon** (item count badge shoho).

### Account / Vet dashboard / Admin layout

- Desktop-e bame sticky **sidebar** (group heading shoho: Daily work, Money…), phone-e header-er niche sticky **icon chip row** (current-ta auto scroll hoye majhe ashe).
- Shared parts: `src/components/layout/app-ui.tsx` (PageHeader, StatCard, SectionCard, EmptyState, StatusBadge, DataTable — desktop-e table, phone-e card).

### Chat (`/chat/<id>`, `/account/consults`, `/dashboard/consults`)

- Messenger-style: header (back, avatar + online dot, naam, typing/active status, audio/video call button, ⋮ menu), bubble grouping, sticky day pill, time + Seen, link, boro emoji, photo thumbnail + lightbox, call line (missed hole lal + Call back), pill composer (photo preview, auto-grow, desktop-e Enter = send), optimistic send ("Sending…", failed → Try again), "N new" scroll button. Phone-e full screen (tab bar/footer lukay).
- Call screen: dark full-screen, boro avatar, round control (label shoho). Call logic/push/IncomingCall chhoya hoyni.
- Inbox list: avatar, time, unread badge, status pill.
- Bug fix: reconnect-er por miss howa message ashto na; scroll jump; chat bondho holeo composer active thakto; vet "End chat" confirm chara; background tab-e message unread thekhe jeto; photo signed-URL ek shathe shob fetch.

### Shop (`/shop`, `/shop/<slug>`, `/shop/cart`, `/account/orders`)

- Listing: search hero, category chip, desktop sidebar filter / phone bottom-sheet filter, sort, removable filter chip, product tile (discount %, stock, quick add → stepper).
- Product: gallery (thumbnail, swipe, arrow key), price/save, stock, qty stepper (stock-limit), Add to cart + Buy now, delivery/COD/return row, related; phone-e sticky add bar.
- Cart/checkout: step indicator, item stepper + Undo remove, contact/address/payment card, live coupon, free-delivery progress, desktop sticky summary / phone sticky total.
- Orders: status pill, timeline, cancel dialog.
- Bug fix: muche jaoa product checkout atke ditto; delivery fee preview server-er sathe milto na; coupon discount qty bodlale update hoto na; 0 taka-r coupon use hoye jeto; stock-er beshi add kora jeto; double submit.

### Payment (`/pay/<id>`)

- Merchant-style summary (amount, charge, total, pay-by time), bKash/Nagad branded card, copy button shoho numbered step, TrxID + number validation, safety note, phone-e sticky button; review / paid / expired / COD state.

### Owner (`/account`, `/account/pets/**`, `/account/appointments`, `/account/settings`)

- Overview: greeting + avatar, quick-action tile (Find a vet, Ask free, Add pet, Shop, Emergency), pet row, health reminder, visit/chat/order summary card.
- Pets: card grid; pet page-e profile header, health timeline, delete confirm; form section-e bhag kora + phone-e save bar.
- Bug fix: purono vaccine record-o "Due" dekhato; health record/appointment cancel confirm chara hoto.

### Auth (`/login`, `/onboarding`) ar booking (`/vet/<slug>/book`)

- Login: desktop-e brand panel + card; demo build-e "Try a demo account" (owner/vet/admin).
- Onboarding: 3-step progress.
- Booking: day strip → Morning/Afternoon/Evening slot grid → pet + reason; phone-e sticky confirm bar.

### Public (`/vets`, `/vet/<slug>`, `/questions/**`, `/articles/**`, `/emergency`, `/about`, `/legal/**`)

- Find a vet: search hero, desktop filter sidebar / phone filter sheet (count badge), removable chip, notun vet card (Chat + Book).
- Vet profile: hero, stat, price card, weekly hours (aaj highlight), about/qualification/reviews; phone-e sticky Chat/Book bar.
- Q&A: search + filter pill, guided ask form, thread view. Articles: magazine layout, reading typography, TOC.
- Emergency: boro action button, "Ki hoyeche?" grid → first-aid card, ekhon pawa jay emon vet.

### Vet dashboard (`/dashboard/**`)

- Home: greeting, verification checklist, boro availability card, stat (waiting chats, aajker visit, ei maser ay, rating), waiting chats, aajker visit, quick action.
- Profile: 5 ta section card + document status + sticky save bar. Schedule: din-wise switch + time block + "copy to all days" + overlap check. Bookings/Questions/Earnings/Articles/Featured: filter, card, table, plan picker.
- Bug fix: availability switch save-er por aager value-te phire jeto; schedule-e overlap/ulta time save hoto (booking page-e same slot duibar).

### Admin (`/admin/**`)

- Overview: age "Needs attention" (report, late chat, pending vet, order…), tarpor people/consult/money KPI, quick task.
- Users, vets (verification queue + reason shoho approve/reject), consult monitor, featured, payouts, appointments, articles, reports, settings (section + sticky save), audit: search + filter pill + DataTable + StatusBadge; destructive kaje confirm.

### Browser test-e paoa ar thik kora (375px, demo owner/vet/admin)

- Account/dashboard/admin page phone-e pashe scroll hoto (page 566–906px choura): grid item-er `min-width:auto` + lomba ek-line text. Section layout grid ar `main`-er grid item-e `min-width:0` diye thik — ekhon shob 375px.
- Chat page-e demo banner page-ke screen-er cheye 28px lomba kore ditto — full-screen page-e banner lukano.
- Browser tab-er title onek private page-e English chilo (Appointments, Earnings, Payment…) — ekhon Bangla/English duitai.
- Bangla page-e English digit: call duration, vet checklist ("13টির মধ্যে 11টি"), onboarding step, admin/vet filter count — ekhon Bangla digit.
- Vet earnings-e internal code dekhato ("refund: vet_no_reply (manual)", "consult") — ekhon "Refund" / "Chat".
- Check kora: hamburger-e item tap → navigate + drawer bondho; Bangla heading `letter-spacing: normal`; chat full-screen-e tab bar/footer lukay; demo owner/vet/admin login; vet ar admin-er main page gulo error chara load hoy.
- Dekha hoyni: desktop ar dark mode chokhe (pane hidden chilo, screenshot neya jayni), shop checkout/pay flow click kore, ashol iPhone.

## Open issues / apnar decision lagbe

(Egulo bodlano hoyni — product decision lage ba app bhangte pare.)

**Chat**

1. Inbox list-e last message/last time nei (query-te nei) — case summary + start date dekhay. Ashol last message dekhate `consults/server/queries.ts` bodlate hobe.
2. Call-e flip camera / speaker button nei — `peer.ts` media code-e notun function lagbe.
3. "Seen" shudhu amar shesh message-e.

**Shop / payment**

4. Return policy ar delivery time (Dhaka 1–3 din, baire 2–5 din) text assumption — confirm korun.
5. Server `checkout()` 0-taka coupon-eo `used` baray — server-e fix kora uchit (payment logic, chhoyini).
6. COD order limit cart-e dekhay na, pay page-e giye dekhay.
7. Puron order-e 50-er beshi product thakle kichu thumbnail category art dekhay.

**Owner / auth**

8. Photo upload chalakalin Save chapa jay → photo chara save hoy (`ImageUpload`-e busy state lagbe).
9. `runHealthReminders` push job purono vaccine record-eo reminder pathay.
10. Settings-e language bodlale `profiles.locale` (push-er bhasha) bodlay na.

**Public**

11. `/vets`-e sort nei (query-te sort input lagbe).
12. Area filter shudhu oi area-r vet upore ane, baki district-er vet-o dekhay — strict filter chan?
13. Vet list 300 row cap + "load more" page×12 refetch.
14. Admin (vet profile chara) answer form dekhe kintu submit fail hoy.
15. "30 min-e reply na dile taka ferot" promise live kina confirm korun; emergency hotline number set nei; first-aid text vet-ke diye review korate hobe.

**Vet dashboard**

16. Schedule save korle `completeness` (search ranking) update hoy na — porer profile save porjonto.
17. Availability bodlale public vet page-er dot cache expire na howa porjonto purono thakte pare.
18. Vet-er payout account (bKash/Nagad/bank) deyar jayga nei — admin hate payout record kore.
19. Poisha shoho fee profile abar save korle whole taka-y round hoy.

**Admin**

20. `draft` vet-keo verify kora jay (shudhu warning dekhay) — server-e block korben?
21. `suspendProvider` server-e reason chara-o hoy (UI-te required).
22. Report "hide" answer/review permanently delete kore — soft-hide korben?
23. Vet/consult/article/appointment list 100/200 row-e thame (paging nei).
24. Overview-e COD (`placed`) order "to pack" hisebe gona hoy na.
25. Payout push text shudhu English.

**Onnanno**

26. `lenis` package remove kora hoyeche (ar use hoy na).
27. E2E (`pnpm test:e2e`) chalano hoyni — shop filter test-e phone sheet bondho korar step add kora hoyeche; dui project-ei chalan.
28. Admin audit log-e action code (`consult.refund`, `payment.paid`) raw dekhay — admin-er jonno chole, chaile label map kora jay.
29. Demo vet "Dr. Nusrat Jahan"-er profile photo nei, tai avatar-e initial dekhay — photo upload kore header/menu-te chobi check korun.
30. Admin page-gulor browser tab title ekhono English ("Admin · Vets") — shudhu staff dekhe; chaile `generateMetadata` + `getT()` diye Bangla kora jay (owner/vet page-e kora hoyeche).
