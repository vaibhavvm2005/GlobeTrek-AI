# GlobeTrek AI – Global Tourism, Event Discovery & Smart Ticket Booking Platform

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.14-blue.svg)](run.py)
[![Flask](https://img.shields.io/badge/Flask-3.1-black.svg)](app/__init__.py)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](app/templates/base.html)
[![Tests](https://img.shields.io/badge/pytest-9%20passed%20(100%25)-brightgreen.svg)](tests/test_globetrek.py)
[![Security](https://img.shields.io/badge/Security-HMAC--SHA256%20%7C%20RBAC%20%7C%20CSRF-orange.svg)](app/services/ticket_service.py)

**GlobeTrek AI** is a global tourism, stadium event discovery, and smart online ticket booking platform built with **Python Flask**, **SQLAlchemy ORM (MySQL / SQLite)**, and **Bootstrap 5.3**. The system combines an editorial discovery experience with an enterprise administration cockpit, high-concurrency zero-oversell booking protection, a trilingual/multilingual AI travel concierge, temporary 10-minute seat locks, Razorpay test payment integration, and cryptographically verified turnstile gate check-in passes.

---

## 🏛️ Platform Architecture & User Roles

GlobeTrek AI features role-based access control (RBAC) across three distinct user roles:

```
                                  ┌────────────────────────────────┐
                                  │         GlobeTrek AI           │
                                  └───────────────┬────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 ▼                                ▼                                ▼
   ┌───────────────────────────┐    ┌───────────────────────────┐    ┌───────────────────────────┐
   │    CUSTOMER TRAVELER      │    │      EVENT ORGANIZER      │    │    PLATFORM ADMINISTRATOR │
   ├───────────────────────────┤    ├───────────────────────────┤    ├───────────────────────────┤
   │ • Global Landmark Search  │    │ • Event Creation & Setup  │    │ • Global KPI Analytics    │
   │ • Stadium Concert Booking │    │ • Ticket Tiers & Quotas   │    │ • User Directory & RBAC   │
   │ • 10-Min Seat Hold Locks  │    │ • Turnstile Gate Scanner  │    │ • Event Approval Queue    │
   │ • Digital QR Pass Wallet  │    │ • Duplicate Scan Lockout  │    │ • Payment Ledger & Audit  │
   │ • Multilingual AI Chatbot │    │ • Gross Revenue Analytics │    │ • Review Moderation       │
   └─────────────┬─────────────┘    └─────────────┬─────────────┘    └─────────────┬─────────────┘
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  │
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │      TRANSACTION ENGINE        │
                                  ├────────────────────────────────┤
                                  │ • Atomic Decrement & Holds     │
                                  │ • 10-Min Lock Auto-Expiry      │
                                  │ • Idempotency Deduplication    │
                                  │ • HMAC-SHA256 Signed Tokens    │
                                  │ • Gemini AI Function Calling   │
                                  └────────────────────────────────┘
```

---

## 🔐 Pre-Seeded Accounts & Quick Demo Logins

Both `/auth/login` and the admin/organizer portals feature **1-click quick-fill demo buttons**:

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Administrator** | `admin@demo.com` | `admin123` | Full access to KPI dashboard, event approvals, user RBAC, payments, and reviews |
| **Event Organizer** | `organizer@demo.com` | `demo123` | Create events, configure ticket tiers, gate turnstile QR scanner |
| **Customer Traveler** | `customer@demo.com` | `demo123` | Landmark exploration, AI travel concierge, 10-minute checkout, ticket wallet |

---

## ⚡ Concurrency, Reliability & Security Features

### 1. Zero-Oversell Atomic Reservations & Duplicate Seat Prevention
Under high-demand flash sales (e.g., stadium concerts or cricket finals), typical applications suffer from race conditions. GlobeTrek AI prevents overselling and double booking:
* **Assigned Seating Events**: Seats are locked at the database level with a `SeatLock` record and unique index constraint (`uq_event_seat`). When Customer A selects Seat A1, Customer B receives an immediate real-time rejection:  
  `"Seat A1 is already booked or temporarily locked. Please select another available seat."`
* **General Admission Events**: Ticket inventory is locked atomically (`quantity_locked += requested_qty`), rejecting requests whenever `quantity_available < requested`.

### 2. 10-Minute Hold Expiry & Automatic Inventory Sweep
A reservation hold locks inventory for 10 minutes (`expires_at = now + 10 minutes`). If payment is not completed within 10 minutes:
* The live client timer displays an alert and triggers hold release.
* Background sweeps (`booking_service.expire_stale_holds()`) release held seats back to `available_quantity`.

### 3. Idempotency Key Deduplication
To protect against double charges from repeated clicks or network retry storms, all reservation and payment requests accept a unique `idempotency_key`. Replayed requests return the existing confirmed booking without decrementing inventory twice.

### 4. HMAC-SHA256 Cryptographic Ticket Verification & Turnstile Check-in
Every confirmed ticket generates a signed digital token:
```
TKT:{ticket_uid}:{booking_ref}:{timestamp}:{HMAC-SHA256-DIGEST}
```
At the entrance turnstile (`/organizer/verify`):
1. The server checks the cryptographic signature using the secret key.
2. The gate turnstile engine queries the `ticket_scans` table to verify whether the ticket was previously admitted.
3. If already scanned, entry is rejected with an **`ALREADY_USED`** warning specifying the prior scan timestamp and terminal ID.
4. If valid, the ticket is atomically marked as **`USED`** and a permanent audit row is persisted.

---

## 🤖 Multilingual AI Travel Concierge

The AI Assistant supports **English**, **Hindi (हिन्दी)**, **Kannada (ಕನ್ನಡ)**, and **Telugu (తెలుగు)** with live database grounding:
* **Gemini API Function Calling**: When `GEMINI_API_KEY` is provided, user prompts trigger structured tool calling against the local database (`search_destinations`, `search_events`, `get_availability`).
* **Deterministic Fallback**: When running without an API key or offline, an intelligent intent parser extracts location, budget, visitor count, and date, answering queries accurately in the selected language without price hallucination.

---

## 🚀 Step-by-Step Installation & Quickstart

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- MySQL (Optional: defaults to SQLite for zero-setup demo)

### 1. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` and fill in your credentials if available:
```powershell
cp .env.example .env
```
*(If no `.env` is created, the system runs in verified demo mode using local SQLite and simulated payments out of the box).*

### 3. Initialize & Seed Database
The application automatically creates all tables and seeds realistic global destinations (Eiffel Tower, Taj Mahal, Louvre Museum, Universal Studios Japan, Burj Khalifa, Mysore Palace) and events (Coldplay World Tour, ICC Champions Trophy Finals, Global AI Summit Paris, Tokyo Anime Carnival) on first run:
```powershell
py run.py
```
Open **`http://localhost:5000`** in your browser.

---

## 🧪 Automated Test Suite (9 Passing Tests)

Run the automated test suite to verify inventory concurrency, idempotency, duplicate seat prevention, expired hold releases, and gate turnstile verification:

```powershell
py -m pytest tests/test_globetrek.py -v
```

### Test Coverage Summary:
* `test_rbac_dashboard_guards` – Verifies that unauthenticated or unauthorized users are blocked from `/admin/*`, `/organizer/*`, and `/dashboard/*`.
* `test_atomic_reservation_and_inventory_decrement` – Validates that holding tickets atomically decrements available stock and applies statutory GST (18%) and service fees (₹29).
* `test_prevent_duplicate_seat_booking` – Confirms that two users attempting to lock the same seat concurrently are prevented from double-booking.
* `test_idempotent_reservation_replay` – Proves that replaying identical idempotency keys returns existing reservations without double-decrementing inventory.
* `test_full_payment_ticket_issuance_and_gate_scan` – Full end-to-end lifecycle: reservation hold $\to$ payment verification $\to$ HMAC QR pass generation $\to$ gate admission.
* `test_invalid_and_tampered_qr_ticket` – Rejects forged or altered QR code tokens at the turnstile checkpoint.
* `test_last_ticket_oversell_prevention` – Validates that when only 1 ticket remains, a second concurrent buyer is immediately rejected.
* `test_expired_hold_cleanup` – Confirms that reservation holds past 10 minutes automatically release inventory.
* `test_multilingual_ai_assistant_grounding` – Validates AI responses in English, Hindi, and Kannada using live database records.

---

## 📦 Directory Structure

```
d:\projects\hackton\
├── app/
│   ├── __init__.py              # Flask app factory, blueprint registration & error handlers
│   ├── config.py                # Environment configuration & defaults
│   ├── extensions.py            # SQLAlchemy, Flask-Login, Flask-WTF, Flask-Mail
│   ├── models.py                # 19 normalized relational models
│   ├── seed.py                  # Seed script with global destinations & events
│   ├── routes/
│   │   ├── main.py              # Homepage, destination listings, event detail, search
│   │   ├── auth.py              # User registration, login, logout, profile
│   │   ├── booking.py           # Ticket selection, 10-min reservation hold, payment flow
│   │   ├── customer.py          # Customer dashboard, my bookings, ticket wallet
│   │   ├── organizer.py         # Organizer dashboard, event management, gate verification
│   │   ├── admin.py             # Administrator command center, user RBAC, analytics
│   │   └── api.py               # JSON REST endpoints: chat, availability, seat maps
│   ├── services/
│   │   ├── booking_service.py   # Atomic inventory locks, hold sweeps, calculations
│   │   ├── payment_service.py   # Razorpay verification & simulated transactions
│   │   ├── ticket_service.py    # HMAC-SHA256 QR code generation, PDF export, turnstiles
│   │   ├── ai_service.py        # Gemini function-calling & multilingual fallback
│   │   └── notification_service.py # In-app notification center & email alerts
│   ├── static/
│   │   ├── css/style.css        # Master Bootstrap 5.3 theme styling
│   │   └── js/
│   │       ├── main.js          # Core utilities & alert dismissal
│   │       ├── chatbot.js       # AI Concierge modal client
│   │       └── booking.js       # Dynamic price calculator & seat selector
│   └── templates/
│       ├── base.html            # Master layout with navbar, footer & AI modal
│       ├── auth/                # Login, register, profile, forgot password
│       ├── main/                # Index, destinations, events, search results
│       ├── booking/             # Ticket selection, summary, payment, confirmation
│       ├── customer/            # Dashboard, bookings, digital tickets, notifications
│       ├── organizer/           # Dashboard, events, create/edit event, turnstile scanner
│       ├── admin/               # Command center, users, destinations, events, analytics
│       └── errors/              # 403, 404, 500 error templates
├── tests/
│   └── test_globetrek.py        # 9 automated pytest cases (100% passing)
├── run.py                       # Server entrypoint
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment configuration template
└── README.md                    # Project documentation
```

---

## 📄 License
Created for **GlobeTrek AI – Global Tourism, Event Discovery & Smart Ticket Booking Platform**.
All destination photography sourced under royalty-free licenses with attribution to respective organizations.
