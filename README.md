# DealFlow360 🚀
### Intelligent Quote-to-Cash Engine with 3-Layer Risk Assessment & Autonomous Governance

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?&style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📌 Executive Summary

**DealFlow360** eliminates revenue leakage, rogue discounting, and manual approval bottlenecks in enterprise quote-to-cash workflows. By blending **deterministic governance rules** (tier-based discount ceilings, category caps) with a **3-layer blended risk engine** (Policy + Behavioral + Commercial), DealFlow360 provides sales reps with real-time margin visibility and automated approval routing.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React 18 + Vite)"]
        UI_QB["Quotation Builder & Upsell Engine"]
        UI_AP["Approval Matrix & Audit Trail"]
        UI_NS["Negotiation Simulator"]
        UI_FF["Dual-Split Fulfillment"]
        UI_BL["Billing & Invoicing (MRR)"]
        UI_DH["Deal Health Radar"]
    end

    subgraph Gateway["API Gateway / Middleware"]
        AUTH["JWT OAuth2 Auth & RBAC"]
        CORS["CORS & Request Validator"]
    end

    subgraph Services["FastAPI Backend Service Layer"]
        RE["3-Layer Risk Engine\n(Policy + Behavioral + Commercial)"]
        UP["Upsell & Margin Indicator"]
        NEG["Negotiation Evaluator\n(Walk-away Margin: 20%)"]
        APP["Approval Matrix Engine\n(Auto / Manager / Finance)"]
        FUL["Dual-Split Fulfillment\n(Hardware vs License Key)"]
        BIL["Invoicing & Tax Engine\n(18% GST + PDF Invoices)"]
        SUB["Subscription & MRR Engine"]
    end

    subgraph Data["Database & Cache Layer"]
        PG[("PostgreSQL 16\n(Deals, Quotes, Approvals,\nInvoices, Fulfillment)")]
        RD[("Redis Cache & Pub/Sub\n(Live Margin, Rate Limits)")]
    end

    UI_QB -->|REST / JSON| AUTH
    UI_AP -->|REST / JSON| AUTH
    UI_NS -->|REST / JSON| AUTH
    UI_FF -->|REST / JSON| AUTH
    UI_BL -->|REST / JSON| AUTH
    UI_DH -->|REST / JSON| AUTH

    AUTH --> CORS
    CORS --> RE & UP & NEG & APP & FUL & BIL & SUB

    RE --> PG
    UP --> PG
    NEG --> PG
    APP --> PG
    FUL --> PG
    BIL --> PG
    SUB --> PG

    RE -.-> RD
    UP -.-> RD
```

---

## 🗄️ Database Schema & Entity Relationships

```mermaid
erDiagram
    USERS ||--o{ DEALS : "creates / owns"
    CUSTOMERS ||--o{ DEALS : "associated with"
    DEALS ||--o{ QUOTATIONS : "contains revisions"
    DEALS ||--o{ APPROVALS : "triggers"
    DEALS ||--o{ FULFILLMENT_TASKS : "spawns"
    DEALS ||--o{ INVOICES : "generates"
    DEALS ||--o{ SUBSCRIPTIONS : "initiates"
    DEALS ||--o{ NEGOTIATIONS : "tracks"
    QUOTATIONS ||--o{ QUOTE_LINES : "consists of"
    PRODUCTS ||--o{ QUOTE_LINES : "referenced by"

    CUSTOMERS {
        uuid id PK
        string name
        string tier "Bronze | Silver | Gold"
        float ltv
        float credit_limit
    }

    DEALS {
        uuid id PK
        string deal_number UK
        uuid customer_id FK
        uuid sales_rep_id FK
        string status "Draft | Pending | Confirmed"
        float total_amount
        float margin_percent
        int risk_score
    }

    QUOTATIONS {
        uuid id PK
        string quote_number UK
        uuid deal_id FK
        int version
        float subtotal
        float total_discount
        float grand_total
    }

    QUOTE_LINES {
        uuid id PK
        uuid quotation_id FK
        uuid product_id FK
        int quantity
        float unit_price
        float discount_percent
        float line_total
    }

    APPROVALS {
        uuid id PK
        uuid deal_id FK
        string required_role "sales_manager | finance"
        string status "pending | approved | rejected"
        int risk_score
        string rejection_reason
    }

    FULFILLMENT_TASKS {
        uuid id PK
        uuid deal_id FK
        string product_type "hardware | software"
        string status "pending | in_progress | completed"
        string tracking_or_license_key
    }
```

---

## 🧠 Core Risk & Governance Engine

### 1. Three-Layer Blended Risk Formula
$$\text{Total Risk Score} = \text{Policy Risk} (0-60) + \text{Behavioral Risk} (0-30) + \text{Commercial Risk} (0-30)$$

| Layer | Trigger Conditions | Scoring Metric |
|---|---|---|
| **Policy Risk** | Line item discount exceeds $\min(\text{Customer Tier}, \text{Product Category})$ ceiling | Base **$41 \text{ pts}$** $+ (3 \times \% \text{ over ceiling})$ |
| **Behavioral Risk** | Deal inactivity or excessive haggling | $>7\text{ days idle}$ ($+2 \text{ pts/day}$), $>3 \text{ rounds}$ ($+3 \text{ pts/round}$) |
| **Commercial Risk** | Gross profit margin falls below $25\%$ target | Margin $<25\%$ ($+2 \text{ pts per } 1\% \text{ drop}$) |

### 2. Autonomous Approval Matrix
- **$\le 40$ Risk Score**: **Auto-Approved** $\rightarrow$ Deal status directly set to `CONFIRMED`.
- **$41 - 70$ Risk Score**: Escalated to **Sales Manager** $\rightarrow$ `PENDING_APPROVAL`.
- **$> 70$ Risk Score**: Escalated to **Finance Head** $\rightarrow$ `PENDING_APPROVAL`.

### 3. Discount Governance Ceilings

| Entity | Category / Tier | Max Permitted Discount |
|---|---|:---:|
| **Customer Tier** | 🥇 Gold | **15%** |
| | 🥈 Silver | **10%** |
| | 🥉 Bronze | **5%** |
| **Product Category** | 💻 Software | **20%** |
| | 🖥️ Hardware | **15%** |
| | 🛠️ Services | **10%** |
| | 🔄 Subscriptions | **5%** |

*Rule: Strictest ceiling applies: $\text{Limit} = \min(\text{Tier Limit}, \text{Category Limit})$.*

---

## 🌟 Key Application Features

1. **Interactive Quotation Builder**:
   - Dynamic real-time calculation of order revenue, costs, and gross profit margin.
   - Live discount ceiling indicator per line item.
2. **Real-Time Upsell Suggestion Engine**:
   - Evaluates unselected products and shows the positive margin delta ($\Delta \text{Margin}$) if added.
3. **Interactive Negotiation Simulator**:
   - Tests customer counter-offers against a strict $20\%$ walk-away margin.
   - Recommends intelligent compromise trade-offs (e.g., higher volume / longer terms for requested discount).
4. **Automated Dual-Split Fulfillment**:
   - Confirmed deals automatically split hardware orders (warehouse shipping, serial tracking) from software products (instant license keys).
5. **Subscription & Tax Billing**:
   - Full invoice generation with 18% GST/VAT calculation and PDF preview.
   - Recurring SaaS contract management and MRR/ARR tracking.

---

## 🚀 Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Node.js 18+ & Python 3.11+ (for local bare-metal run)

### Running with Docker Compose (1-Click Startup)

```bash
docker compose up --build
```

- **Frontend App**: `http://localhost:5173`
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`

---

## 🔑 Default Demo Credentials

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@dealflow.com` | `admin123` |
| **Sales Manager** | `manager@dealflow.com` | `manager123` |
| **Sales Rep** | `rep@dealflow.com` | `rep123` |
| **Finance Controller** | `finance@dealflow.com` | `finance123` |

---

## 📡 API Endpoints Reference

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | JWT OAuth2 Login |
| **Quotes** | `POST` | `/api/quotes/` | Create Quote with Risk & Route Assessment |
| **Quotes** | `POST` | `/api/quotes/upsell-suggestions` | Calculate Live Upsell Margin Impact |
| **Approvals** | `GET` | `/api/approvals/` | Fetch Pending Approval Queue |
| **Approvals** | `POST` | `/api/approvals/{id}/act` | Approve/Reject Quote with Reason |
| **Negotiations** | `POST` | `/api/negotiations/evaluate` | Smart Counter-Offer Evaluation |
| **Fulfillment** | `GET` | `/api/fulfillment/deal/{id}` | View Hardware / Digital Split Tasks |
| **Billing** | `GET` | `/api/billing/invoices` | List Invoices & Tax Calculations |
| **Subscriptions** | `GET` | `/api/subscriptions/` | List Active Recurring Contracts (MRR) |
| **Dashboard** | `GET` | `/api/dashboard/stats` | Top-line Dealflow Metrics |