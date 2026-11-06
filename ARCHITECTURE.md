# WAYFARER AI – Technical Architecture & Engineering Specifications

This document defines the architectural patterns, security boundaries, database design, and concurrency controls of the **WAYFARER AI** platform (PS-07).

---

## 1. High-Level Architectural Topology

WAYFARER AI is designed around two discrete applications built on top of a unified, high-reliability backend:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                        │
│                                                                                        │
│   ┌─────────────────────────────────────────┐   ┌──────────────────────────────────┐   │
│   │        WAYFARER (Consumer App)          │   │   WAYFARER CONTROL (Admin App)   │   │
│   │                                         │   │                                  │   │
│   │  • Editorial UI (Tailwind + CSS Grid)   │   │  • Enterprise Dashboard Workspace│   │
│   │  • Trilingual AI Concierge (en/hi/kn)   │   │  • Turnstile Gate QR Scanner     │   │
│   │  • Itinerary Trip Planner               │   │  • Real-Time Inventory Matrix    │   │
│   │  • Offline Ticket Wallet (PWA)          │   │  • Audit Trail & AI Monitor      │   │
│   └────────────────────┬────────────────────┘   └─────────────────┬────────────────┘   │
└────────────────────────┼──────────────────────────────────────────┼────────────────────┘
                         │                                          │
                         ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             FASTAPI APPLICATION SERVER                                 │
│                                                                                        │
│   ┌─────────────────────┐   ┌───────────────────────┐   ┌──────────────────────────┐   │
│   │   Auth & RBAC       │   │  Booking & Inventory  │   │  AI Agent Orchestrator   │   │
│   │   (JWT + PBKDF2)    │   │  (Atomic Locks, Holds)│   │  (Gemini + Tool Calling) │   │
│   └──────────┬──────────┘   └───────────┬───────────┘   └────────────┬─────────────┘   │
│              │                          │                            │                 │
│   ┌──────────┴──────────┐   ┌───────────┴───────────┐   ┌────────────┴─────────────┐   │
│   │ External Adapters   │   │ Turnstile Gate Engine │   │ Audit & Telemetry Engine │   │
│   │ (Meteo, OSM, TM)    │   │ (HMAC-SHA256 Verify)  │   │ (Immutable Logging)      │   │
│   └─────────────────────┘   └───────────────────────┘   └──────────────────────────┘   │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              RELATIONAL DATA LAYER                                     │
│                                                                                        │
│   SQLite (Dev/Demo) / Supabase PostgreSQL (Production)                                 │
│   • Normalized Schema with Foreign Key Constraints                                     │
│   • Atomic Compare-and-Swap Inventory Locks                                            │
│   • Idempotency Deduplication Key Storage                                              │
│   • Immutable Security & Transaction Audit Logs                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Relational Integrity

The data model is fully normalized with strict primary/foreign key relationships:

```
   ┌───────────────┐
   │     users     │
   ├───────────────┤
   │ id (PK)       │
   │ email         │
   │ password_hash │
   │ full_name     │
   │ role          │◀─── [SUPER_ADMIN, EVENT_MANAGER, TICKET_STAFF, FINANCE_MANAGER, CUSTOMER]
   │ phone         │
   └───────┬───────┘
           │
           │ 1:N
           ▼
   ┌───────────────┐         ┌────────────────┐
   │   bookings    │ 1:N     │  booking_items │
   ├───────────────┼────────▶├────────────────┤
   │ id (PK)       │         │ id (PK)        │
   │ user_id (FK)  │         │ booking_id (FK)│
   │ event_id (FK) │         │ ticket_type_id │
   │ status        │         │ quantity       │
   │ total_amount  │         │ unit_price     │
   │ hold_expires  │         │ subtotal       │
   │ idempotency   │         └────────────────┘
   └───────┬───────┘
           │
           ├─────────────────────────┐
           │ 1:N                     │ 1:N
           ▼                         ▼
   ┌───────────────┐         ┌────────────────┐
   │   payments    │         │  ticket_scans  │
   ├───────────────┤         ├────────────────┤
   │ id (PK)       │         │ id (PK)        │
   │ booking_id(FK)│         │ booking_id (FK)│
   │ gateway_ref   │         │ scanned_by (FK)│
   │ status        │         │ scan_terminal  │
   │ amount        │         │ scanned_at     │
   └───────────────┘         └────────────────┘
```

### Table Definitions & Purpose:
1. **`users`**: Contains authenticated entities, hashed passwords (`PBKDF2-HMAC-SHA256`), and hierarchical roles.
2. **`venues`**: Physical facilities, postal addresses, geo-coordinates, and operating capacities.
3. **`categories`**: Taxonomy classifications (Museums, Cultural Heritage, Performing Arts, Nature, Adventure).
4. **`events`**: Experiences and attractions with dates, city, descriptions, rich imagery, and publication status.
5. **`ticket_types`**: Specific admission tiers (e.g. Adult, Child, VIP Access, Foreign Tourist) linked to events.
6. **`inventory`**: Real-time capacity ledger tracking `total_capacity`, `reserved_quantity`, and `available_quantity`.
7. **`bookings`**: State of customer reservation holds and confirmed tickets.
8. **`booking_items`**: Line items per ticket tier for group booking support.
9. **`payments`**: Payment gateway transactions, simulated verifications, and fees.
10. **`refunds`**: Cancellation refund requests, approved amounts, and review timestamps.
11. **`ticket_scans`**: Single-use gate admissions recorded at turnstile checkpoints.
12. **`audit_logs`**: Immutable security journal tracking every administrative mutation.

---

## 3. Concurrency Protection & Booking Lifecycle

### State Machine:
```
  [Initiate Checkout]
          │
          ▼
     ┌─────────┐
     │  HELD   │──(10 min expired without payment)──▶ [EXPIRED / RELEASED]
     └────┬────┘
          │ (Payment Verified)
          ▼
   ┌─────────────┐
   │  CONFIRMED  │──(Cancel by Customer / Admin)──▶ [CANCELLED / REFUNDED]
   └──────┬──────┘
          │ (Scanned at Gate Turnstile)
          ▼
   ┌─────────────┐
   │  COMPLETED  │ (Pass marked as ALREADY_USED; cannot be re-admitted)
   └─────────────┘
```

### High-Concurrency Guarantees:
1. **Atomic Decrement via SQL Engine**:
   ```sql
   UPDATE inventory 
   SET available_quantity = available_quantity - ?,
       reserved_quantity = reserved_quantity + ?,
       updated_at = CURRENT_TIMESTAMP
   WHERE ticket_type_id = ? AND available_quantity >= ?;
   ```
   Under simultaneous burst traffic (e.g., 50 concurrent buyers competing for 5 tickets), only 5 will receive `rowcount == 1`. The remaining 45 requests immediately receive `409 Conflict`, completely preventing overselling without requiring complex distributed locks.

2. **Idempotency Protection**:
   All reservation endpoints mandate an `Idempotency-Key` HTTP header. The backend checks for pre-existing keys before executing inventory queries. If detected, the cached booking snapshot is returned, preventing accidental double booking during network retry storms.

3. **10-Minute Hold Expiry**:
   Unpaid reservations automatically revert via background and on-demand sweep checks (`WHERE status = 'HELD' AND hold_expires_at < CURRENT_TIMESTAMP`), replenishing available seats for other users.

---

## 4. Gate Turnstile Check-In & HMAC-SHA256 Tokenization

Every confirmed ticket generates an immutable signed digital token:
```
TKT:{booking_id}:{event_id}:{created_timestamp}:{HMAC-SHA256(secret, payload)}
```

### Gate Validation Protocol:
1. **Signature Integrity**: The turnstile terminal verifies that the HMAC digest matches the server's secret key, rejecting forged or tampered QR codes instantly.
2. **Double-Entry Lockout**: The system performs a transactional lookup in `ticket_scans`:
   - If a record exists: The turnstile halts with `ALREADY_USED`, displaying the previous admission time and terminal ID.
   - If no record exists: A new scan row is inserted in the same transaction, and the booking status is promoted to `COMPLETED`.
3. **Audit Recording**: Every scan attempt (both authorized and rejected) is recorded in `audit_logs` with staff operator ID and timestamp.

---

## 5. Security & RBAC Enforcement Matrix

| Endpoint Route | Public | Customer | Ticket Staff | Event Manager | Super Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| `GET /api/events` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/weather` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/ai/chat` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/bookings/reserve` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/bookings/pay` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/admin/verify-ticket` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `POST /api/admin/events` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /api/admin/inventory/adjust` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `GET /api/admin/bookings` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `POST /api/admin/refunds/approve` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GET /api/admin/audit-logs` | ❌ | ❌ | ❌ | ❌ | ✅ |

Passwords are salted and hashed using `PBKDF2-HMAC-SHA256` with 100,000 iterations. API sessions are governed by JSON Web Tokens (JWT) signed with `HS256`.

---

## 6. Multilingual AI Assistant Architecture

The AI Concierge uses a dual-engine architecture to guarantee functionality across both cloud-connected and air-gapped/demo environments:

```
                          ┌───────────────────────┐
                          │   User Chat Message   │
                          └───────────┬───────────┘
                                      │
                         Is GEMINI_API_KEY set?
                                ╱       ╲
                              YES       NO
                              ╱           ╲
                             ▼             ▼
               ┌────────────────────┐   ┌─────────────────────────┐
               │ Gemini 2.5 Flash   │   │ Deterministic Fallback  │
               │ Function Calling   │   │ Multi-intent Parser     │
               └─────────┬──────────┘   └────────────┬────────────┘
                         │                           │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │    Database Tool Execution    │
                       │ • search_experiences          │
                       │ • get_pricing_and_availability│
                       │ • get_booking_status          │
                       │ • check_weather               │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │ Trilingual Structured Output  │
                       │ (English / Hindi / Kannada)   │
                       └───────────────────────────────┘
```

The system strictly enforces **zero price hallucination**: all prices and seat counts quoted to the traveler are drawn directly from the live database.

---

## 7. Offline-First Resilience (Ticket Wallet)

To serve travelers visiting remote cultural sites (e.g., Badami Caves or Hampi) with intermittent cellular reception:
1. Confirmed bookings are proactively mirrored into client-side storage upon purchase and wallet viewing.
2. A browser network listener continuously monitors `navigator.onLine`.
3. When offline, the app switches into **Offline Mode**, surfacing a clear notification banner while maintaining uninterrupted access to:
   - Full booking details and itinerary schedule.
   - High-contrast, mathematically rendered SVG QR passes that can be scanned by gate turnstiles even when the phone has zero internet connection.
