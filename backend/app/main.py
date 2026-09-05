from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routes import auth, customers, products, quotes, approvals, fulfillment, negotiations, billing, deal_health, dashboard

import redis.asyncio as aioredis


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    yield
    # Shutdown
    await app.state.redis.close()


app = FastAPI(
    title="DealFlow360",
    description="Intelligent B2B Deal Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(quotes.router, prefix="/api/quotes", tags=["Quotes"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["Approvals"])
app.include_router(fulfillment.router, prefix="/api/fulfillment", tags=["Fulfillment"])
app.include_router(negotiations.router, prefix="/api/negotiations", tags=["Negotiations"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(deal_health.router, prefix="/api/deal-health", tags=["Deal Health"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "dealflow360"}
