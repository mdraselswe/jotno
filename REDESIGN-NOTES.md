# Jotno redesign — hand-over note

Branch: **`redesign/pro-ui`** — 2026-11-25-e `main`-e merge kore push kora hoyeche (`main`-e push korlei jotnocare.com ar demo auto-deploy hoy). Kono database migration nei.

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

### Dwitiyo dofa (apnar 4 ta issue)

1. **Shudhu call-e kotha holeo "ভেট সময়মতো উত্তর দেননি" + refund** — asol bug chilo: vet-er "prothom uttor" shudhu text message dile gona hoto. Call-e kotha bolleo 30 min por cron (`/api/cron/frequent`) chat-ke `refunded` kore dito: owner-er payment `refund_due` hoto, admin-er kache "Refund to send" push jeto, vet-er ay theke taka kete nito. Ekhon **call receive (answer) holei** vet-er reply hisebe gona hoy (`answerCall` → `firstReplyAt`), tai ar refund hoy na; chat-e "Hello bolun" empty message-o call thakle dekhay na; owner-er countdown call-er por lukay. Refund-er text-o thik kora: bKash/Nagad manual, tai "ফেরত দেওয়া হয়েছে" na, "ফেরত পাঠানো হচ্ছে"; admin refund korle alada text ("যত্ন টিম চ্যাট বন্ধ করেছে"); owner-er push owner-er bhashay (aage raw `vet_no_reply` jeto).
2. **Vet-ke notun chat-er khobor** — (a) vet app-er **jekono page-e** thakle niche ekta lal/neel alert: "Farhana আপনার উত্তরের অপেক্ষায় · আর ১৮ মিনিট" + "এখনই উত্তর দিন" (notun chat ashle shobdo + vibrate, tab title-e "(1)"); 10 min-er niche lal. (b) App bondho thakle: chat khulle push (aage theke chilo) + **10 min ar 20 min-e abar push** ("আর ২০ মিনিট বাকি…"). (c) **20 min-e admin-ke push** (vet-er naam + phone) jate phone kore janano jay.
3. **Prescription form** — upore patient/owner/somossa, 3 ta numbered section (Diagnosis → Medicines → Advice ar follow-up), quick chip (দিনে ১/২/৩ বার, দরকার হলে; ৩/৫/৭/১০/১৪ দিন; খাবারের আগে/পরে; follow-up ৩/৭/১৪/৩০ দিন), field-er niche error, niche summary (কয়টা ওষুধ · follow-up).
4. **Profile chobi shob jaygay** — owner-er chobi ekhon vet-er chat header/bubble/call screen/chat list-e, admin user list-e, account page-e (Google chobi fallback shoho); vet-er account chobi vet photo na thakle chat-e. Settings ba vet profile-e chobi save korle header/menu **reload chara** shathe shathe bodlay.

## Tritiyo dofa — 33 ta issue-er ki holo

**Chat / call**

- **1.** **Inbox-e last message** — chat list-e ekhon ashol shesh message ("আপনি: …", "ছবি", call-er line) ar tar shomoy; list shesh activity onujayi shajano.
- **2.** **Flip camera** — video call-e camera ghurano button (shamne/pichhone; phone-e 2 ta camera thakle dekhay). Speaker button web-e (bishesh kore iPhone-e) shombhob na — phone-er nijer volume/speaker use hoy.
- **3.** "Seen" shudhu shesh message-e — Messenger-er moto, iccha kore emon rakha.
- **33.** **Call = reply shudhu 30 second kotha holei** (`business.consult.call.replySeconds`, config-e bodlano jay). 2 second-er call ar reply na. Call cholakalin refund job chat refund kore na.

**Shop / payment**

- **4.** Delivery/return din ekhon config-e (`business.shop.deliveryDays`, `returnDays`) — product page ar legal page dui jaygay shei number. Ashol din-gulo confirm kore config-e bosaben.
- **5.** 0-taka coupon checkout-e bad pore, `used` bare na.
- **6.** COD limit-er beshi hole cart-ei COD lukay, karon lekha thake.
- **7.** Order list-e thumbnail ekhon shudhu oi order-er product theke (50-er limit nei).

**Owner / auth**

- **8.** Chobi upload cholakalin Save button bondho ("আপলোড হচ্ছে…") — pet, profile, vet profile, admin shop, question form.
- **9.** Health reminder shudhu shesh (current) vaccine/deworm record theke.
- **10.** Language bodlale `profiles.locale`-o bodlay, tai push shei bhashay ashe.

**Public**

- **11.** `/vets`-e sort (best match / rating / fee kom→beshi / experience).
- **12.** Area dile age oi area-r vet, tarpor "জেলার অন্য ভেট" bhag kore baki district-er vet.
- **13.** Sort/paging ekhon database-e, 300 cap nei; "আরো দেখুন" shudhu porer 12 ta ane.
- **14.** Answer form shudhu verified vet profile ache emon user dekhe (admin-er form ar fail kore na).
- **15.** Refund promise legal page-e config theke (`replyWindowMinutes`). Hotline number set na thakle button lukano (bhul number dekhay na). **Baki:** hotline number apni din (`business.emergencyHotline`); first-aid text ekjon vet-ke diye review korate hobe.

**Vet dashboard**

- **16.** Schedule save korle completeness (search ranking) shathe shathe update.
- **17.** Availability bodlale public page-gulo shathe shathe refresh.
- **18.** Earnings page-e **payout account** card (bKash / Nagad / bank); admin payout page-e vet-er account dekhay. (Notun table na, `settings` table-e — migration lage na.)
- **19.** Fee poisha shoho save hoy (step 0.01).
- **32.** Vet offline thakle owner chat/booking page-e "ei vet ekhon offline, uttor dite deri hote pare" note; chat khola bondho kora hoyni.

**Admin**

- **20.** Shudhu `pending` / `suspended` vet verify kora jay (server-e block).
- **21.** Suspend/reject-e reason lagbe (kompokkhe 3 okkhor) server-eo.
- **22.** Report "hide" korle copy audit log-e thake; audit page-e **Restore** button diye ferot ana jay.
- **23.** Admin list-e paging (আগের / পরের).
- **24.** Overview-e COD (`placed`) order "to pack"-e gona hoy.
- **25.** Payout, verify, reject, article remove, visit cancel — vet-er push tar nijer bhashay.
- **28.** Audit log-e action-er Bangla/English label.
- **30.** Admin tab title Bangla/English.

**Onnanno**

- **26.** `lenis` remove (info).
- **27.** E2E local Supabase-e chalano hoyeche: desktop + mobile, 78 ta test pass (4 ta iccha kore skip). Purono design dhore lekha test (theme picker, chat bhetor "Active now", phone-e lukano hero button, filter chip) notun design-e update kora.
- **29.** Demo vet-er photo nei — data-r bishoy, code na.
- **31.** **SMS / voice call** — apnar decision baki: kon SMS provider (BD), account/key, ar khoroch. Ekhon: push (chat khulle, 10 ar 20 min-e) + app-er jekono page-e alert + 20 min-e admin-ke push.

### Shob fix-er pore regression check-e paoa ar thik kora

- Call shesh ar "reply" dhora ekshathe (ek transaction) — refund cron majhkhane dhukte pare na; refund hoye jaoa chat-e call "reply" hoy na.
- Vet call-e thakle "owner wait korche" push/alert ar admin push jay na.
- Camera flip: purono camera chhede tarpor notun ta khole (Android), mic abar chay na (iPhone-e mic mute hoy na); fail korle aager camera-y ferot.
- Report-e ekmatro answer hide korle question abar "open"; restore korle abar "answered".
- `/vets` area bhag ekhon vet-er area dekhe (position na); 20 page-er pore "আরো দেখুন" shudhu button.
- Accessibility (axe): footer-er Facebook button-er neel ar lal (`destructive`) rong ek dhap garho — chhoto lekha 4.5:1 contrast pay; emergency page-er hero lekha puro rong-e.

### Apnar kaj / decision baki

- SMS provider (31) ar tar key.
- Emergency hotline number (15).
- First-aid text vet review (15).
- Delivery/return din confirm (4).
