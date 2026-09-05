import enum, uuid
from sqlalchemy import Column, String, Enum, Float, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class DealStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    NEGOTIATION = "negotiation"
    CONFIRMED = "confirmed"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"

class Deal(Base):
    __tablename__ = "deals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_number = Column(String, unique=True, nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    sales_rep_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(DealStatus), default=DealStatus.DRAFT)
    total_amount = Column(Float, default=0.0)
    total_cost = Column(Float, default=0.0)
    margin_percent = Column(Float, default=0.0)
    risk_score = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
