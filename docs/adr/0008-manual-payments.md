# 0008. Manual bKash/Nagad payments before a gateway

Date: 2026-11-22 · Status: accepted

## Context

A payment gateway (SSLCommerz) needs a trade licence, a merchant agreement and review time, and takes a cut on every payment. At launch Jotno has a handful of vets and orders a day, and the owners already use bKash and Nagad personal accounts.

## Decision

- `PAYMENT_PROVIDER=manual` is the default. Every payment (chat, booking fee, featured pack, shop order) still creates a `payments` row, but instead of a redirect the payer sees `/pay/<id>`: our wallet number from `/admin/settings`, the amount plus the wallet's cash-out charge, and a form for the sender number and TrxID.
- The row moves `pending → review` (TrxID stored as `<wallet>:<TRXID>`, unique, so one transfer can't pay twice) → `paid` when an admin approves it on `/admin/payments`, or back to `pending` with a reason. Approval runs the same `markPaid` path a gateway callback would, so the ledger, chats, bookings and orders behave the same either way.
- Refunds become `refund_due` (a queue for the admin to send from the wallet) → `refunded` with the refund's TrxID.
- Shop orders may use cash on delivery (`orders.status = placed`, payment `gateway = cod`); the payment is marked paid when the order is delivered.
- The gateway code stays (`mock`, `sslcommerz`) and can be switched on later with the env variable.

## Consequences

- A person must check each TrxID (target: within 30 minutes, shown to payers as the review hours in settings). Unpaid holds expire by job; a payment waiting for review never expires.
- Chats and bookings start only after approval, so a fake TrxID costs nothing but an admin's minute.
- Money in a personal wallet is the owner's responsibility for accounting; the ledger and CSV export keep the records.
