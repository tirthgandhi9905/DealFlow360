import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class Quote(Base):
    __tablename__ = "quotes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_number = Column(String, unique=True, nullable=False, index=True)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    version = Column(Integer, default=1)
    subtotal = Column(Float, default=0.0)
    total_discount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class QuoteLine(Base):
    __tablename__ = "quote_lines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_id = Column(UUID(as_uuid=True), ForeignKey("quotes.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0)
    discount_limit = Column(Float, default=0.0)
    line_total = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
