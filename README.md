# GetMeds Order Process Automation System

A working prototype for the GetMeds 7-Day AI & Order Process Automation Challenge.

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (tested on v24.19.0)
- npm v9+

### Backend Setup

```bash
cd getmeds-backend

# 1. Install dependencies
npm install
npm approve-scripts better-sqlite3   # approve native build

# 2. Copy environment config
copy .env.example .env

# 3. Run database migration + seed data
npm run setup

# 4. Start the API server (port 4000)
npm run dev
```

### Frontend Setup

```bash
cd getmeds-frontend

# 1. Install dependencies
npm install
npm approve-scripts esbuild   # approve Vite build tool

# 2. Start the dev server (port 5173)
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## 🔑 Demo Login Credentials

| Email | Password | Role |
|---|---|---|
| medrep@getmeds.ph | demo123 | MedRep |
| medrep2@getmeds.ph | demo123 | MedRep |
| finance@getmeds.ph | demo123 | Finance |
| dispatch@getmeds.ph | demo123 | Dispatch |
| manager@getmeds.ph | demo123 | Management |
| admin@getmeds.ph | demo123 | Admin |

---

## 📋 End-to-End Demo Flow

1. **Login as MedRep** → Create New Order for "Jose dela Cruz" (direct patient) → Submit
2. System auto-generates `GM-YYYYMMDD-XXXX` Order ID, creates mock Zoho SO, routes to `waiting_for_payment`
3. **Login as Finance** → Finance Queue → Select the order → Enter payment reference → Verify Payment
4. Order auto-advances to `ready_for_dispatch`, Dispatch team is notified
5. **Login as Dispatch** → Dispatch Queue → Start Picking → Mark Packing → Dispatch
6. Enter tracking details (courier + tracking number) → Order completes
7. **Login as MedRep** → My Orders → See order as `completed` with full tracking info — no Google Chat needed
8. **Login as Management** → Dashboard → See real-time KPI cards and full order table

---

## 🏗️ Architecture

```
MEDREP → GETMEDS ORDER APP → VALIDATION → DATABASE / WORKFLOW → ZOHO (mock)
                                                ↓
                                        FINANCE / PAYMENT
```

### Components

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Role-based SPA UI |
| Backend | Node.js + Express | REST API |
| Database | SQLite (better-sqlite3) | Order persistence + audit log |
| Auth | JWT (jsonwebtoken + bcryptjs) | Role-based access control |
| State Machine | Custom JS class | Controlled order lifecycle |
| Zoho Layer | Mock (switchable to live) | Sales Order integration |
| Notifications | In-app DB + Email log + Chat log | Multi-channel notifications |

---

## 📊 Order Status Lifecycle

```
draft → submitted → validating → so_pending → so_created
                                                   ↓
                                    [credit] → ready_for_dispatch
                                    [direct] → waiting_for_payment → payment_verified → ready_for_dispatch
                                                   ↓
                                           picking_packing → dispatched → tracking_shared → completed
                                    (any stage) → on_hold / exception / cancelled
```

---

## 🔗 Zoho Integration

The prototype includes a **realistic mock** of the Zoho Books API.

### Mock Mode (current)
- Logs the exact payload that would be sent to Zoho Books API
- Returns a mock response matching real Zoho API shape
- Look for `[ZOHO_MOCK]` in the backend console

### Production Mode
Set these environment variables in `getmeds-backend/.env`:

```env
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ORG_ID=your_organization_id
```

### API Mapping (GetMeds → Zoho)

| GetMeds Field | Zoho Books Field | Notes |
|---|---|---|
| `getmeds_order_id` | `reference_number` | Links the two systems (single source of truth) |
| `customer_id` | `customer_id` | Mapped to Zoho Customer ID |
| `customer_type` | `custom_fields[0]` ("GetMeds Customer Type") | `"Credit Customer"` vs `"Non-Credit Patient"` |
| `status` / finance state | `custom_fields[1]` ("Payment Status") | `"Credit Terms (Auto-approved)"` vs `"Pending Finance Verification"` |
| `items[].product_id` | `line_items[].item_id` | Mapped to Zoho Item SKU/ID |
| `items[].unit_price` | `line_items[].rate` | Unit selling rate |
| `items[].quantity` | `line_items[].quantity` | Line item quantity |
| `total_amount` | `total` | Auto-calculated by Zoho |
| `delivery_address` | `shipping_address.address` | Shipping destination |

> **Architectural Note on SO Numbering**: `salesorder_number` is intentionally omitted from the outgoing POST request body. This allows Zoho Books to auto-assign its own sequential sales order sequence (avoiding collisions with manual entries). The GetMeds backend captures the returned `salesorder_number` and `salesorder_id` in Zoho's response and persists them in the database.

**Zoho endpoint**: `POST https://www.zohoapis.com/books/v3/salesorders?organization_id={ORG_ID}`  
**Auth**: OAuth2 Bearer token (refresh via `https://accounts.zoho.com/oauth/v2/token`)

**Retry strategy**: On API failure, set `zoho_sync_status = 'failed'` and retry via a background cron job (retry stub location: `src/integrations/zoho/zohoClient.js`).

---

## 🔔 Notification Channels

| Channel | Implementation | Production Path |
|---|---|---|
| In-app | Stored in `notifications` table, polled by frontend every 30s | Already live |
| Email | Logged as `[EMAIL_LOG]` to console | Wire SMTP via nodemailer; set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env` |
| Google Chat | Logged as `[GOOGLE_CHAT_LOG]` with full Card payload | Set `GOOGLE_CHAT_WEBHOOK_URL` in `.env` to send real messages |

---

## 📂 Project Structure

```
GETMEDS-System/
├── getmeds-backend/
│   ├── src/
│   │   ├── controllers/    (auth, orders, finance, dispatch, management, notifications, admin)
│   │   ├── routes/         (Express routers)
│   │   ├── middleware/     (auth.js JWT + RBAC, errorHandler.js)
│   │   ├── workflow/       (stateMachine.js — 15 statuses, all transitions)
│   │   ├── services/       (orderIdService, auditService, notificationService)
│   │   ├── integrations/   (zoho/zohoMock.js)
│   │   ├── db/             (schema.sql, migrate.js, seed.js, database.js)
│   │   └── app.js + server.js
│   ├── tests/              (stateMachine.test.js — 79 tests, all passing)
│   ├── data/               (SQLite database file — auto-created)
│   └── package.json
└── getmeds-frontend/
    ├── src/
    │   ├── pages/          (medrep/, finance/, dispatch/, management/, admin/)
    │   ├── components/     (layout/, ui/, orders/)
    │   ├── context/        (AuthContext.jsx)
    │   ├── hooks/          (useAuth.js, useNotifications.js)
    │   └── api/            (client.js — axios + interceptors)
    └── package.json
```

---

## 🧪 Running Tests

```bash
cd getmeds-backend
npm test
# → 79/79 tests passing (state machine, all valid/invalid transitions)
```

---

## 🔒 Security Notes

- JWT tokens expire in 8 hours
- All secrets are in `.env` (never hard-coded)
- Role-based route guards on every endpoint
- Foreign keys enforced in SQLite
- Passwords hashed with bcrypt (rounds=10)
- Do not commit `.env` to git (it's in `.gitignore`)

---

## 🌐 API Endpoints Reference

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Any | Current user |
| GET | `/api/orders` | Any | List orders (MedRep: own only) |
| POST | `/api/orders` | MedRep | Create draft order |
| GET | `/api/orders/:id` | Any | Order detail |
| POST | `/api/orders/:id/submit` | MedRep | Submit + auto-process |
| PATCH | `/api/orders/:id/exception` | Management | Set exception/hold |
| GET | `/api/orders/meta/customers` | Any | Customer list for form |
| GET | `/api/orders/meta/products` | Any | Product list for form |
| GET | `/api/finance/queue` | Finance | Payment pending orders |
| POST | `/api/finance/orders/:id/verify-payment` | Finance | Verify/reject payment |
| GET | `/api/dispatch/queue` | Dispatch | Dispatch queue |
| POST | `/api/dispatch/orders/:id/update-status` | Dispatch | Update dispatch status |
| POST | `/api/dispatch/orders/:id/tracking` | Dispatch | Enter tracking → complete |
| GET | `/api/management/summary` | Management | KPI stats |
| GET | `/api/management/orders` | Management | All orders |
| GET | `/api/notifications` | Any | In-app notifications |
| GET | `/api/notifications/unread-count` | Any | Unread count |
| PATCH | `/api/notifications/:id/read` | Any | Mark read |
| GET | `/api/admin/users` | Admin | User list |
| POST | `/api/admin/users` | Admin | Create user |
| PATCH | `/api/admin/users/:id` | Admin | Update user |
| GET | `/api/health` | Public | Health check |

---

*GetMeds Philippines Inc. | Order Process Automation Prototype*  
*Built as part of the 7-Day AI & Order Process Automation Challenge*
