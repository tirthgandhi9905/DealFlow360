"""
DealFlow360 — Master Seed Script
Run: docker exec dealflow360-backend-1 python -m app.seed.seed_data
"""
import asyncio
import uuid
import random
import hashlib
from datetime import datetime, timedelta
from sqlalchemy import text
from app.database import engine, async_session, Base
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerTier
from app.models.product import Product, ProductCategory, PriceList
from app.models.deal import Deal, DealStatus
from app.models.quote import Quote, QuoteLine
from app.models.approval import Approval, ApprovalStatus
from app.models.warehouse import Warehouse, Inventory
from app.models.fulfillment import Fulfillment, FulfillmentLine
from app.models.negotiation import Negotiation, NegotiationRound, Concession
from app.models.invoice import Invoice, Payment
from app.models.subscription import Subscription, BillingSchedule
from app.models.audit import AuditEvent


def uid():
    return uuid.uuid4()


def hpw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()


def rand_date(start_days_ago=180, end_days_ago=0):
    d = random.randint(end_days_ago, start_days_ago)
    return datetime.utcnow() - timedelta(days=d, hours=random.randint(0, 23), minutes=random.randint(0, 59))


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[seed] Tables recreated")

    async with async_session() as db:
        # ════════════════════════════════════════
        # USERS — 12 users across all roles
        # ════════════════════════════════════════
        users = []
        user_data = [
            ("Hemil Shah", "hemil@gs.in", UserRole.ADMIN),
            ("Prince Patel", "prince@gs.in", UserRole.ADMIN),
            ("GT Desai", "gt@gs.in", UserRole.ADMIN),
            ("Ravi Kumar", "ravi@dealflow.in", UserRole.SALES_REP),
            ("Priya Sharma", "priya@dealflow.in", UserRole.SALES_REP),
            ("Amit Joshi", "amit@dealflow.in", UserRole.SALES_REP),
            ("Neha Gupta", "neha@dealflow.in", UserRole.SALES_REP),
            ("Vikram Singh", "vikram@dealflow.in", UserRole.SALES_MANAGER),
            ("Anjali Mehta", "anjali@dealflow.in", UserRole.SALES_MANAGER),
            ("Deepak Verma", "deepak@dealflow.in", UserRole.FINANCE),
            ("Sunita Rao", "sunita@dealflow.in", UserRole.FINANCE),
            ("Demo User", "demo@dealflow.in", UserRole.SALES_REP),
        ]
        for name, email, role in user_data:
            u = User(id=uid(), email=email, name=name, hashed_password=hpw("1234"), role=role, is_active=True)
            db.add(u)
            users.append(u)
        await db.flush()
        print(f"[seed] {len(users)} users created (all passwords: 1234)")

        sales_reps = [u for u in users if u.role == UserRole.SALES_REP]
        managers = [u for u in users if u.role == UserRole.SALES_MANAGER]
        finance = [u for u in users if u.role == UserRole.FINANCE]

        # ════════════════════════════════════════
        # CUSTOMERS — 100 Indian B2B companies
        # ════════════════════════════════════════
        industries = ["IT Services", "Manufacturing", "Pharma", "BFSI", "Telecom", "Retail", "Energy", "EdTech", "Healthcare", "Logistics", "Auto", "FMCG"]
        company_prefixes = [
            "Acme", "Bharat", "Zenith", "Vertex", "Nova", "Pinnacle", "Titan", "Omega", "Delta", "Apex",
            "Horizon", "Nexus", "Stellar", "Prism", "Quantum", "Atlas", "Orion", "Catalyst", "Vector", "Pulse",
            "Matrix", "Synergy", "Fusion", "Velocity", "Radiant", "Emerald", "Sapphire", "Crystal", "Phoenix", "Summit",
            "Vortex", "Spectrum", "Dynamo", "Endeavour", "Frontier", "Harbinger", "Ignite", "Jubilee", "Krypton", "Lumina",
            "Maverick", "Nebula", "Optima", "Pioneer", "Resolute", "Stratos", "Triumph", "Unity", "Vigil", "Wavelength",
        ]
        company_suffixes = ["Corp", "Industries", "Solutions", "Technologies", "Enterprises", "Systems", "Group", "InfoTech", "Labs", "Global"]
        cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Ahmedabad", "Kolkata", "Jaipur", "Lucknow", "Chandigarh", "Indore"]
        tiers = list(CustomerTier)

        customers = []
        used_names = set()
        for i in range(100):
            while True:
                name = f"{random.choice(company_prefixes)} {random.choice(company_suffixes)}"
                if name not in used_names:
                    used_names.add(name)
                    break
            tier = random.choices(tiers, weights=[50, 35, 15])[0]
            ltv = {"bronze": random.uniform(100000, 2000000), "silver": random.uniform(2000000, 10000000), "gold": random.uniform(10000000, 50000000)}
            c = Customer(
                id=uid(), name=name,
                email=f"procurement@{name.lower().replace(' ', '')}.in",
                phone=f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}",
                tier=tier,
                address=f"{random.randint(1, 500)}, {random.choice(['MG Road', 'Tech Park', 'Industrial Area', 'Business Hub', 'Corporate Tower', 'Trade Center'])}, {random.choice(cities)}",
                industry=random.choice(industries),
                lifetime_value=round(ltv[tier.value], 2),
            )
            db.add(c)
            customers.append(c)
        await db.flush()
        print(f"[seed] {len(customers)} customers created")

        # ════════════════════════════════════════
        # PRODUCTS — 50 B2B products
        # ════════════════════════════════════════
        product_defs = [
            # Hardware
            ("Enterprise Server R740", "HW-SRV-001", ProductCategory.HARDWARE, 450000, 320000, 18),
            ("Enterprise Server R640", "HW-SRV-002", ProductCategory.HARDWARE, 380000, 270000, 18),
            ("Rack Server E200", "HW-SRV-003", ProductCategory.HARDWARE, 250000, 180000, 18),
            ("Workstation Pro X1", "HW-WRK-001", ProductCategory.HARDWARE, 185000, 130000, 18),
            ("Workstation Pro X2", "HW-WRK-002", ProductCategory.HARDWARE, 220000, 155000, 18),
            ("Business Laptop 15 Pro", "HW-LAP-001", ProductCategory.HARDWARE, 95000, 68000, 18),
            ("Business Laptop 14 Slim", "HW-LAP-002", ProductCategory.HARDWARE, 78000, 55000, 18),
            ("Business Laptop 13 Ultra", "HW-LAP-003", ProductCategory.HARDWARE, 120000, 85000, 18),
            ("Desktop PC Office", "HW-DES-001", ProductCategory.HARDWARE, 45000, 32000, 18),
            ("Desktop PC Pro", "HW-DES-002", ProductCategory.HARDWARE, 72000, 51000, 18),
            ("Monitor 27\" 4K", "HW-MON-001", ProductCategory.HARDWARE, 38000, 25000, 18),
            ("Monitor 32\" Curved", "HW-MON-002", ProductCategory.HARDWARE, 52000, 35000, 18),
            ("Network Switch 48-Port", "HW-NET-001", ProductCategory.HARDWARE, 125000, 88000, 18),
            ("Network Switch 24-Port", "HW-NET-002", ProductCategory.HARDWARE, 65000, 45000, 18),
            ("Firewall Appliance FW500", "HW-NET-003", ProductCategory.HARDWARE, 180000, 128000, 18),
            ("UPS 3KVA Rack", "HW-UPS-001", ProductCategory.HARDWARE, 85000, 60000, 18),
            ("UPS 5KVA Tower", "HW-UPS-002", ProductCategory.HARDWARE, 140000, 98000, 18),
            ("Storage Array 20TB", "HW-STO-001", ProductCategory.HARDWARE, 320000, 225000, 18),
            ("NAS Device 8-Bay", "HW-STO-002", ProductCategory.HARDWARE, 95000, 67000, 18),
            ("Docking Station USB-C", "HW-ACC-001", ProductCategory.HARDWARE, 12000, 7500, 18),
            ("Wireless Mouse + KB Combo", "HW-ACC-002", ProductCategory.HARDWARE, 4500, 2800, 18),
            # Software
            ("ERP Suite — Standard", "SW-ERP-001", ProductCategory.SOFTWARE, 500000, 150000, 18),
            ("ERP Suite — Professional", "SW-ERP-002", ProductCategory.SOFTWARE, 850000, 250000, 18),
            ("CRM Platform License", "SW-CRM-001", ProductCategory.SOFTWARE, 180000, 55000, 18),
            ("BI Analytics Dashboard", "SW-ANA-001", ProductCategory.SOFTWARE, 220000, 70000, 18),
            ("Security Suite Enterprise", "SW-SEC-001", ProductCategory.SOFTWARE, 350000, 100000, 18),
            ("Collaboration Platform", "SW-COL-001", ProductCategory.SOFTWARE, 120000, 35000, 18),
            ("DevOps Pipeline Tool", "SW-DEV-001", ProductCategory.SOFTWARE, 280000, 85000, 18),
            ("Cloud Backup Solution", "SW-BAK-001", ProductCategory.SOFTWARE, 95000, 28000, 18),
            ("HR Management System", "SW-HRM-001", ProductCategory.SOFTWARE, 160000, 48000, 18),
            ("Inventory Management", "SW-INV-001", ProductCategory.SOFTWARE, 140000, 42000, 18),
            # Services
            ("Installation — Standard", "SV-INS-001", ProductCategory.SERVICES, 25000, 15000, 18),
            ("Installation — Complex", "SV-INS-002", ProductCategory.SERVICES, 75000, 45000, 18),
            ("Data Migration Service", "SV-MIG-001", ProductCategory.SERVICES, 150000, 90000, 18),
            ("Training — Basic (5 days)", "SV-TRN-001", ProductCategory.SERVICES, 50000, 30000, 18),
            ("Training — Advanced (10 days)", "SV-TRN-002", ProductCategory.SERVICES, 120000, 72000, 18),
            ("Consulting — Architecture", "SV-CON-001", ProductCategory.SERVICES, 200000, 120000, 18),
            ("Consulting — Security Audit", "SV-CON-002", ProductCategory.SERVICES, 180000, 108000, 18),
            ("Project Management", "SV-PMO-001", ProductCategory.SERVICES, 100000, 60000, 18),
            ("Custom Development (per sprint)", "SV-DEV-001", ProductCategory.SERVICES, 250000, 150000, 18),
            ("On-site Support (per month)", "SV-SUP-001", ProductCategory.SERVICES, 80000, 48000, 18),
            # Subscriptions
            ("Cloud Hosting — Basic", "SB-CLD-001", ProductCategory.SUBSCRIPTION, 15000, 5000, 18),
            ("Cloud Hosting — Pro", "SB-CLD-002", ProductCategory.SUBSCRIPTION, 35000, 12000, 18),
            ("Cloud Hosting — Enterprise", "SB-CLD-003", ProductCategory.SUBSCRIPTION, 75000, 25000, 18),
            ("Support SLA — Silver", "SB-SLA-001", ProductCategory.SUBSCRIPTION, 20000, 8000, 18),
            ("Support SLA — Gold", "SB-SLA-002", ProductCategory.SUBSCRIPTION, 45000, 18000, 18),
            ("Support SLA — Platinum", "SB-SLA-003", ProductCategory.SUBSCRIPTION, 80000, 32000, 18),
            ("Managed Security (monthly)", "SB-SEC-001", ProductCategory.SUBSCRIPTION, 55000, 22000, 18),
            ("Email Hosting (per user/mo)", "SB-EML-001", ProductCategory.SUBSCRIPTION, 500, 150, 18),
            ("Domain + SSL Bundle", "SB-DNS-001", ProductCategory.SUBSCRIPTION, 5000, 1500, 18),
        ]
        products = []
        for name, sku, cat, price, cost, tax in product_defs:
            is_sub = cat == ProductCategory.SUBSCRIPTION
            p = Product(
                id=uid(), name=name, sku=sku, category=cat,
                description=f"{name} — enterprise-grade solution for B2B clients",
                base_price=price, cost=cost, tax_percent=tax,
                is_subscription=is_sub,
                recurring_interval="monthly" if is_sub else None,
                stock_count=random.randint(10, 500) if cat == ProductCategory.HARDWARE else 0,
                category_discount_ceiling=10.0 if cat == ProductCategory.HARDWARE else 25.0,
                is_active=True,
            )
            db.add(p)
            products.append(p)
        await db.flush()
        print(f"[seed] {len(products)} products created")

        # ════════════════════════════════════════
        # PRICE LISTS — discount ceilings per tier × category
        # ════════════════════════════════════════
        price_lists = []
        ceilings = {
            ("bronze", "hardware"): 5, ("bronze", "software"): 8, ("bronze", "services"): 3, ("bronze", "subscription"): 2,
            ("silver", "hardware"): 10, ("silver", "software"): 12, ("silver", "services"): 7, ("silver", "subscription"): 4,
            ("gold", "hardware"): 15, ("gold", "software"): 20, ("gold", "services"): 10, ("gold", "subscription"): 5,
        }
        for (tier, cat), max_disc in ceilings.items():
            pl = PriceList(id=uid(), tier=tier, category=cat, max_discount_percent=max_disc)
            db.add(pl)
            price_lists.append(pl)
        await db.flush()
        print(f"[seed] {len(price_lists)} price list rules created")

        # ════════════════════════════════════════
        # WAREHOUSES — 3 locations
        # ════════════════════════════════════════
        wh_data = [
            ("Mumbai Central Warehouse", "Mumbai, Maharashtra", 12.0, 2),
            ("Delhi North Hub", "Manesar, Haryana", 18.0, 3),
            ("Bangalore Tech Depot", "Whitefield, Bangalore", 15.0, 4),
        ]
        warehouses = []
        for name, loc, cost, days in wh_data:
            w = Warehouse(id=uid(), name=name, location=loc, shipping_cost_per_unit=cost, avg_delivery_days=days)
            db.add(w)
            warehouses.append(w)
        await db.flush()
        print(f"[seed] {len(warehouses)} warehouses created")

        # ════════════════════════════════════════
        # INVENTORY — stock for hardware products in each warehouse
        # ════════════════════════════════════════
        hw_products = [p for p in products if p.category == ProductCategory.HARDWARE]
        inv_count = 0
        for wh in warehouses:
            for p in hw_products:
                qty = random.randint(10, 200)
                inv = Inventory(id=uid(), warehouse_id=wh.id, product_id=p.id, quantity_available=qty, quantity_reserved=0)
                db.add(inv)
                inv_count += 1
        await db.flush()
        print(f"[seed] {inv_count} inventory records created")

        # ════════════════════════════════════════
        # DEALS + QUOTES — 500 deals with realistic distribution
        # ════════════════════════════════════════
        statuses = list(DealStatus)
        status_weights = [15, 10, 20, 10, 25, 15, 5]  # draft, pending, approved, negotiation, confirmed, fulfilled, cancelled

        deals = []
        quotes = []
        quote_lines_all = []
        deal_lines_by_deal = {}  # deal_id -> list of (product, qty) for later fulfillment seeding
        deal_counter = 1000

        for i in range(500):
            deal_counter += 1
            customer = random.choice(customers)
            rep = random.choice(sales_reps)
            status = random.choices(statuses, weights=status_weights)[0]
            created = rand_date(180, 1)
            last_activity = created + timedelta(days=random.randint(0, 30))

            # Pick 1-6 products for this deal
            n_products = random.randint(1, 6)
            deal_products = random.sample(products, min(n_products, len(products)))

            total_amount = 0
            total_cost = 0
            lines = []
            for p in deal_products:
                qty = random.randint(1, 50) if p.category == ProductCategory.HARDWARE else random.randint(1, 10)
                tier_limit = ceilings.get((customer.tier.value, p.category.value), 5)
                # Most discounts are within limits, some exceed (for risk demo)
                if random.random() < 0.8:
                    disc = round(random.uniform(0, tier_limit), 1)
                else:
                    disc = round(random.uniform(tier_limit, tier_limit + 10), 1)
                line_price = p.base_price * qty * (1 - disc / 100)
                line_cost = p.cost * qty
                total_amount += line_price
                total_cost += line_cost
                lines.append({"product": p, "qty": qty, "disc": disc, "unit_price": p.base_price, "line_total": line_price, "limit": tier_limit})

            margin = round((total_amount - total_cost) / total_amount * 100, 2) if total_amount > 0 else 0
            risk = random.randint(5, 95)

            deal = Deal(
                id=uid(), deal_number=f"DF-{deal_counter}",
                customer_id=customer.id, sales_rep_id=rep.id,
                status=status, total_amount=round(total_amount, 2),
                total_cost=round(total_cost, 2), margin_percent=margin,
                risk_score=risk,
                notes=f"Deal with {customer.name} — {len(lines)} line items",
                created_at=created, updated_at=last_activity, last_activity_at=last_activity,
            )
            db.add(deal)
            deals.append(deal)
            deal_lines_by_deal[deal.id] = [(ln["product"], ln["qty"]) for ln in lines]

            quote = Quote(
                id=uid(), quote_number=f"QT-{deal_counter}-v1",
                deal_id=deal.id, version=1,
                subtotal=round(total_amount / 0.82, 2),
                total_discount=round(total_amount / 0.82 - total_amount, 2),
                tax_amount=round(total_amount * 0.18, 2),
                grand_total=round(total_amount * 1.18, 2),
                created_at=created,
            )
            db.add(quote)
            quotes.append(quote)

            for ln in lines:
                ql = QuoteLine(
                    id=uid(), quote_id=quote.id, product_id=ln["product"].id,
                    quantity=ln["qty"], unit_price=ln["unit_price"],
                    discount_percent=ln["disc"], discount_limit=ln["limit"],
                    line_total=round(ln["line_total"], 2),
                )
                db.add(ql)
                quote_lines_all.append(ql)

            # Flush every 50 deals to avoid memory buildup
            if (i + 1) % 50 == 0:
                await db.flush()

        await db.flush()
        print(f"[seed] {len(deals)} deals, {len(quotes)} quotes, {len(quote_lines_all)} quote lines created")

        # ════════════════════════════════════════
        # APPROVALS — for non-draft deals
        # ════════════════════════════════════════
        approval_count = 0
        for deal in deals:
            if deal.status in (DealStatus.DRAFT, DealStatus.CANCELLED):
                continue
            level = "sales_manager" if deal.risk_score <= 70 else "finance"
            a_status = ApprovalStatus.APPROVED if deal.status in (DealStatus.APPROVED, DealStatus.CONFIRMED, DealStatus.FULFILLED) else ApprovalStatus.PENDING
            appr = Approval(
                id=uid(), deal_id=deal.id, status=a_status,
                required_level=level, created_at=deal.created_at,
                resolved_at=deal.updated_at if a_status == ApprovalStatus.APPROVED else None,
            )
            db.add(appr)
            approval_count += 1
        await db.flush()
        print(f"[seed] {approval_count} approvals created")

        # ════════════════════════════════════════
        # NEGOTIATIONS — for deals in negotiation/confirmed
        # ════════════════════════════════════════
        neg_count = 0
        for deal in deals:
            if deal.status not in (DealStatus.NEGOTIATION, DealStatus.CONFIRMED, DealStatus.APPROVED):
                continue
            if random.random() < 0.4:
                continue
            rounds = random.randint(1, 4)
            neg = Negotiation(id=uid(), deal_id=deal.id, round_count=str(rounds), status="closed" if deal.status != DealStatus.NEGOTIATION else "open")
            db.add(neg)
            for r in range(1, rounds + 1):
                requests = [
                    "Can you match competitor pricing? We need at least 5% more.",
                    "We need better payment terms — NET 60 instead of NET 30.",
                    "Include installation at no extra cost and we have a deal.",
                    "Our budget was approved for 10% less. Can you adjust?",
                    "We want a 3-year support SLA bundled in.",
                    "Delivery must be within 2 weeks or we go with another vendor.",
                ]
                nr = NegotiationRound(
                    id=uid(), negotiation_id=neg.id, round_number=str(r),
                    customer_request=random.choice(requests),
                    proposed_options='[{"label":"Price reduction","discount_change":3},{"label":"Free installation","extras":"installation"},{"label":"Extended support","extras":"6mo support"}]',
                    selected_option=random.choice(["A", "B", "C"]) if r < rounds else None,
                )
                db.add(nr)
            # Concession budget
            conc = Concession(
                id=uid(), deal_id=deal.id,
                total_budget=round(deal.total_amount * 0.08, 2),
                used_amount=round(deal.total_amount * random.uniform(0.01, 0.06), 2),
                remaining=round(deal.total_amount * random.uniform(0.01, 0.04), 2),
            )
            db.add(conc)
            neg_count += 1
        await db.flush()
        print(f"[seed] {neg_count} negotiations created")

        # ════════════════════════════════════════
        # FULFILLMENTS — for confirmed/fulfilled deals
        # Each fulfillment gets FulfillmentLine rows splitting each product
        # across 1-3 warehouses (this is what the frontend "Splits" column reads).
        # ════════════════════════════════════════
        fulfill_count = 0
        fulfill_line_count = 0
        for deal in deals:
            if deal.status not in (DealStatus.CONFIRMED, DealStatus.FULFILLED):
                continue

            f = Fulfillment(
                id=uid(), deal_id=deal.id,
                status="delivered" if deal.status == DealStatus.FULFILLED else "in_transit",
                total_shipping_cost=0.0,  # sum of lines, computed below
                estimated_delivery=deal.updated_at + timedelta(days=random.randint(2, 7)),
                delivery_confidence=round(random.uniform(0.7, 0.99), 2),
            )
            db.add(f)
            await db.flush()  # need f.id for FulfillmentLine FKs

            total_ship = 0.0
            deal_lines = deal_lines_by_deal.get(deal.id, [])
            for product, qty in deal_lines:
                # Split this product across 1-3 warehouses
                n_splits = random.choices([1, 2, 3], weights=[0.5, 0.35, 0.15])[0]
                n_splits = min(n_splits, qty)  # can't split more than qty
                # Distribute qty across the splits
                if n_splits == 1:
                    splits = [qty]
                elif n_splits == 2:
                    a = random.randint(1, qty - 1)
                    splits = [a, qty - a]
                else:
                    a = random.randint(1, qty - 2)
                    b = random.randint(1, qty - a - 1)
                    splits = [a, b, qty - a - b]

                chosen_warehouses = random.sample(warehouses, n_splits)
                for wh, split_qty in zip(chosen_warehouses, splits):
                    ship_cost = round(wh.shipping_cost_per_unit * split_qty, 2)
                    fl = FulfillmentLine(
                        id=uid(),
                        fulfillment_id=f.id,
                        warehouse_id=wh.id,
                        product_id=product.id,
                        quantity=split_qty,
                        shipping_cost=ship_cost,
                    )
                    db.add(fl)
                    total_ship += ship_cost
                    fulfill_line_count += 1

            f.total_shipping_cost = round(total_ship, 2)
            fulfill_count += 1

            # Flush every 50 to avoid memory buildup
            if fulfill_count % 50 == 0:
                await db.flush()
        await db.flush()
        print(f"[seed] {fulfill_count} fulfillments with {fulfill_line_count} warehouse-split lines created")

        # ════════════════════════════════════════
        # INVOICES + PAYMENTS — for confirmed/fulfilled deals
        # ════════════════════════════════════════
        inv_counter = 5000
        invoice_count = 0
        payment_count = 0
        for deal in deals:
            if deal.status not in (DealStatus.CONFIRMED, DealStatus.FULFILLED):
                continue
            inv_counter += 1
            is_paid = deal.status == DealStatus.FULFILLED or random.random() < 0.5
            inv = Invoice(
                id=uid(), invoice_number=f"INV-{inv_counter}",
                deal_id=deal.id, customer_id=deal.customer_id,
                amount=round(deal.total_amount * 1.18, 2),
                status="paid" if is_paid else "unpaid",
                due_date=deal.updated_at + timedelta(days=30),
                paid_at=deal.updated_at + timedelta(days=random.randint(5, 25)) if is_paid else None,
            )
            db.add(inv)
            invoice_count += 1
            if is_paid:
                pay = Payment(
                    id=uid(), invoice_id=inv.id,
                    amount=inv.amount,
                    method=random.choice(["bank_transfer", "upi", "cheque", "neft"]),
                )
                db.add(pay)
                payment_count += 1
        await db.flush()
        print(f"[seed] {invoice_count} invoices, {payment_count} payments created")

        # ════════════════════════════════════════
        # SUBSCRIPTIONS — for subscription product deals
        # ════════════════════════════════════════
        sub_products = [p for p in products if p.is_subscription]
        sub_count = 0
        for deal in deals[:80]:
            if deal.status not in (DealStatus.CONFIRMED, DealStatus.FULFILLED):
                continue
            sp = random.choice(sub_products)
            sub = Subscription(
                id=uid(), deal_id=deal.id,
                customer_id=deal.customer_id, product_id=sp.id,
                plan_name=sp.name, cycle="monthly",
                amount=sp.base_price,
                recurring_total=sp.base_price,
                one_time_total=round(sp.base_price * 0.2, 2),
                status="active",
                start_date=deal.created_at,
                next_billing_date=datetime.utcnow() + timedelta(days=random.randint(1, 30)),
            )
            db.add(sub)
            sub_count += 1
        await db.flush()
        print(f"[seed] {sub_count} subscriptions created")

        # ════════════════════════════════════════
        # AUDIT EVENTS — sprinkle across deals
        # ════════════════════════════════════════
        audit_count = 0
        actions = ["created", "updated", "discount_changed", "approved", "rejected", "submitted", "fulfilled", "invoice_sent"]
        for deal in deals[:200]:
            n_events = random.randint(2, 6)
            for _ in range(n_events):
                ae = AuditEvent(
                    id=uid(), entity_type="deal", entity_id=deal.id,
                    action=random.choice(actions),
                    user_id=random.choice(users).id,
                    old_value='{"status":"draft"}',
                    new_value=f'{{"status":"{deal.status.value}"}}',
                    reason=random.choice(["Initial creation", "Discount adjusted per customer request", "Manager approved", "Sent for fulfillment", "Price negotiation round", "Terms updated"]),
                    created_at=deal.created_at + timedelta(hours=random.randint(1, 720)),
                )
                db.add(ae)
                audit_count += 1
        await db.flush()
        print(f"[seed] {audit_count} audit events created")

        await db.commit()

    print("\n" + "=" * 50)
    print("  SEED COMPLETE")
    print("=" * 50)
    print(f"  Users:          12  (all password: 1234)")
    print(f"  Customers:      100")
    print(f"  Products:       50")
    print(f"  Price Lists:    12")
    print(f"  Warehouses:     3")
    print(f"  Deals:          500")
    print(f"  Quotes:         500")
    print(f"  Approvals:      ~350")
    print(f"  Negotiations:   ~80")
    print(f"  Invoices:       ~200")
    print(f"  Subscriptions:  ~40")
    print(f"  Audit Events:   ~800")
    print("=" * 50)
    print("\n  Login with any of:")
    print("    hemil@gs.in / 1234  (admin)")
    print("    prince@gs.in / 1234  (admin)")
    print("    gt@gs.in / 1234  (admin)")
    print("    ravi@dealflow.in / 1234  (sales_rep)")
    print("    vikram@dealflow.in / 1234  (sales_manager)")
    print("    deepak@dealflow.in / 1234  (finance)")
    print()


if __name__ == "__main__":
    asyncio.run(seed())