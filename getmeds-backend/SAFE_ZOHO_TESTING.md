# Safe Zoho testing — how this scaffold protects the real company data

This describes `src/integrations/zoho/` and `mock-server/`. Goal: let the
order-automation flow be built and demoed against something that behaves
exactly like Zoho, while making it structurally hard to ever touch the
real company Zoho organization by accident.

## The three layers

1. **A narrow adapter contract (`ZohoAdapter.js`)** — the only thing
   controllers are allowed to import (`require('../integrations/zoho')`).
   It deliberately has no delete, void, bulk-delete, or write-off method.
   GetMeds order automation only ever needs to create and read sales
   orders/contacts/items in Zoho, so those are the only methods that
   exist. There is no destructive call to accidentally make, because the
   code to make one was never written.

2. **Three interchangeable implementations, chosen by one env var
   (`ZOHO_MODE`)**:
   - `mock` (**default**) — `MockZohoAdapter.js`. Pure in-memory, no
     `fetch`/`http`/`axios` anywhere in the file (there's a test that
     enforces this). Physically cannot reach the network.
   - `http-mock` — `LiveZohoAdapter.js` pointed at `mock-server/`
     (`npm run mock-server`, `127.0.0.1:4100` only). Exercises the real
     HTTP + OAuth-header code path with zero external dependency, so you
     can prove "the live wiring works" without any real Zoho account.
   - `live` — `LiveZohoAdapter.js` pointed at the real Zoho API. **Fails
     closed**: if `ZOHO_ORG_ID` isn't explicitly present in
     `ZOHO_ALLOWED_ORG_IDS`, the app refuses to start rather than falling
     back to some other org id. An empty allowlist means every org id is
     rejected, including a real one, until someone deliberately adds it.

3. **A schema-accurate mock HTTP server (`mock-server/server.js`)** —
   binds to `127.0.0.1` only, holds nothing but in-memory fixture data
   (wiped on restart), rejects any `organization_id` other than its fixed
   fake test-org id, and implements no `DELETE` route for anything.

## Running it

```bash
npm test                 # 14 new tests: adapter contract, mock round-trips, factory guardrails
npm run mock-server       # starts the fake Zoho HTTP server on :4100
ZOHO_MODE=http-mock npm run dev   # backend now makes real HTTP calls, all to :4100
```

Default (`ZOHO_MODE` unset, or set to anything the factory doesn't
recognize) is always `mock` — the safest mode is what you get by doing
nothing, not what you get by remembering to configure something.

## Before ever using `ZOHO_MODE=live`

- Get OAuth credentials from https://api-console.zoho.com/ scoped to an
  **isolated test/sandbox Zoho organization** — either your own free/trial
  Zoho account, or a second "Organization" added under the company's
  account with its own `organization_id`. Never the production org.
- Set `ZOHO_ORG_ID` **and** `ZOHO_ALLOWED_ORG_IDS` (comma-separated,
  can list more than one) to that test org's id — both, not just one.
- Implement the OAuth refresh-token exchange in
  `buildOAuthTokenGetter()` in `index.js` (currently a stub that throws on
  purpose, so `live` mode can't silently "half work").
- Seed that test org with fabricated data — fake customers, fake SKUs —
  structurally identical to production but containing no real customer or
  pharmaceutical order data.

## What's *not* included here on purpose

There's no code path anywhere in this scaffold that can delete, void, or
bulk-modify a Zoho record — not in mock mode, not in http-mock mode, and
not in live mode. If a genuine business need for one of those ever comes
up, that should be a deliberate, reviewed addition to `ZohoAdapter.js` and
both implementations, not an ad-hoc call from a controller.

## Wiring this into `orders.controller.js`

This scaffold is intentionally **additive** — nothing in
`orders.controller.js` was changed, so nothing that's already working (and
already covered by the existing Jest suite) is at risk. It currently still
calls `createSalesOrderMock` from the old `zohoMock.js` directly (now
marked superseded, not deleted).

Swapping the controller over to `zoho.createSalesOrder(...)` is a small
but real change worth doing deliberately: the Zoho call currently happens
*inside* `db.transaction(() => {...})`, and `better-sqlite3` transactions
must be fully synchronous — they can't contain an `await`. The correct
fix is to `await zoho.createSalesOrder(...)` *before* opening the
transaction, then pass the already-resolved result in, rather than
calling it from inside the transaction closure. Happy to make that change
next and confirm the existing test suite still passes — just say so.
