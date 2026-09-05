import uuid
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class Fulfillment(Base):
    __tablename__ = "fulfillments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    status = Column(String, default="pending")
    total_shipping_cost = Column(Float, default=0.0)
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    delivery_confidence = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FulfillmentLine(Base):
    __tablename__ = "fulfillment_lines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fulfillment_id = Column(UUID(as_uuid=True), ForeignKey("fulfillments.id"), nullable=False)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    shipping_cost = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
