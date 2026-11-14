# Northern Flavors Restaurant — Digital Platform (v3.0)

**Location:** Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria  
**Official Contact:** 09068202567  
**Architecture:** React (Vite) + Supabase (PostgreSQL, RLS, Auth, Edge Functions, Storage)  
**Deployment:** Frontend on Vercel, Backend on Supabase Cloud  
**Timezone:** Africa/Lagos (UTC+1)  
**Currency:** Nigerian Naira (NGN / ₦)

---

## 🍽️ Overview

Northern Flavors Restaurant is a production-ready restaurant ordering, inventory, and management platform built with high performance, strict database security, and an elegant Nigerian restaurant brand aesthetic.

### Platform Components:
1. **Customer-Facing Ordering Experience**:
   - Matches the reference design with dark forest green (`#194633`), gold (`#DDB956`), and warm cream (`#F8F6F0`).
   - Category filtering (Rice, Swallow, Proteins, Sides, Meals, Snacks, Drinks).
   - Interactive search, food cards with Nigerian Naira pricing, customer favourite tags, and real-time availability.
   - Slide-out shopping basket drawer with local persistence and stock re-validation.
   - Checkout with Delivery or Pickup, address validation, and automatic itemized WhatsApp order message generation.
2. **Protected Management Dashboard (`/admin`)**:
   - Real-time order management with status workflow transitions:
     `pending` ➔ `confirmed` ➔ `preparing` ➔ `ready` ➔ `out_for_delivery` / `completed`.
   - **Guaranteed Stock Integrity**: Product stock is deducted **only upon administrator order confirmation** via PostgreSQL transactional row locks (`SELECT ... FOR UPDATE`).
   - Order rejection and cancellation with automatic stock reversal.
   - Simple product quantity inventory tracking (Stock In, Adjustments, Waste, Damaged) with immutable movement audit trails.
   - Inventory valuation at retail and cost prices.
   - Thermal receipt view and printing.
   - 5-Tier Role-Based Access Control (Super Admin, Manager, Order Manager, Inventory Manager, Staff).
   - Sales analytics, charts (Recharts), CSV reports export, customer and supplier records, and immutable audit logs.

---

## 🔐 5-Tier Role Matrix

| Capability | Super Admin | Manager | Order Manager | Inventory Manager | Staff |
|---|:---:|:---:|:---:|:---:|:---:|
| Overview Dashboard | ✅ | ✅ | ✅ (Orders) | ✅ (Stock) | ✅ |
| Customer Orders | Confirm / Reject / Cancel / Transition | Confirm / Reject / Cancel / Transition | Confirm / Reject / Transition | View items | View assigned |
| Menu Products & Categories | Full CRUD | Full CRUD | View only | View only | View active |
| Inventory & Stock-In | Full CRUD | Full CRUD | ❌ | Full CRUD & Adjust | ❌ |
| Supplier Contacts | ✅ | ✅ | ❌ | ✅ | ❌ |
| Financial & Sales Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Staff Management & Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Restaurant Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audit Trail Inspection | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🗄️ Database Architecture & Migrations

All migrations reside in `supabase/migrations/` and execute in strict sequential order:

```text
001_create_extensions_and_schemas.sql   -- uuid-ossp, pgcrypto, private schema
002_create_profiles_and_roles.sql       -- profiles table linked to auth.users
003_create_categories.sql               -- menu categories
004_create_products.sql                 -- catalog products & stock tracking
005_create_customers.sql                -- customer directory
006_create_orders_and_order_items.sql   -- orders & snapshot line items
007_create_inventory_movements.sql      -- stock movement audit trail
008_create_suppliers_and_payments.sql   -- vendor contacts & payments ledger
009_create_restaurant_settings.sql      -- restaurant configuration singleton
010_create_notifications_and_audit_logs.sql -- alert log & audit records
011_create_indexes.sql                  -- performance & foreign key indexes
012_create_helper_functions.sql         -- Security Definer role helpers
013_create_rls_policies.sql             -- strict deny-by-default RLS
014_create_order_functions.sql          -- RPC: create, confirm, reject, cancel
015_create_inventory_functions.sql      -- RPC: add_product_stock, adjust_product_stock
016_create_reporting_functions.sql      -- RPC: get_dashboard_statistics, valuations
017_create_triggers.sql                 -- updated_at maintenance & order alerts
018_configure_storage_policies.sql      -- storage buckets & upload permissions
```

### Seeding:
Seed data with authentic Northern Nigerian meals (Tuwon Shinkafa, Suya, Masa, Miyan Taushe, Zobo, Kunu Aya, etc.) is located in `supabase/seed.sql`.

---

## ⚡ Supabase Edge Functions

Located in `supabase/functions/`:
- `create-order`: Validates input, calculates authoritative prices on the server, creates customer order, generates WhatsApp message payload.
- `confirm-order`: Protected function invoking `confirm_order_and_deduct_stock`.
- `reject-order`: Protected rejection function.
- `cancel-order`: Protected function invoking `cancel_order_and_restore_stock`.
- `update-order-status`: Validates allowable state transitions.
- `send-notification`: Internal alert dispatch.
- `generate-report`: Aggregates date-range sales and best-selling dishes.

---

## 🚀 Local Development Setup

1. Clone or navigate to the project directory:
   ```bash
   cd "Northern Flavors"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. Staff Portal Login:
   Navigate to `/admin/login`.
   Demo credentials for quick evaluation:
   - **Email:** `admin@northernflavors.ng`
   - **Password:** `admin123`

---

## 📦 Deployment to Vercel

1. Push repository to GitHub.
2. Import project in Vercel.
3. Configure environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. The included `vercel.json` ensures client-side routes (`/admin`, `/admin/orders`, `/order-confirmation/:id`) route seamlessly without 404 errors.
