import enum, uuid
from sqlalchemy import Column, String, Enum, Float, Boolean, Text, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class ProductCategory(str, enum.Enum):
    HARDWARE = "hardware"
    SOFTWARE = "software"
    SERVICES = "services"
    SUBSCRIPTION = "subscription"

class Product(Base):
    __tablename__ = "products"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    sku = Column(String, unique=True, nullable=False)
    category = Column(Enum(ProductCategory), nullable=False)
    description = Column(Text, nullable=True)
    base_price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    tax_percent = Column(Float, default=0.0)
    is_subscription = Column(Boolean, default=False)
    recurring_interval = Column(String, nullable=True)
    stock_count = Column(Integer, default=100)
    category_discount_ceiling = Column(Float, default=10.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PriceList(Base):
    __tablename__ = "price_lists"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tier = Column(String, nullable=False)
    category = Column(String, nullable=False)
    max_discount_percent = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
