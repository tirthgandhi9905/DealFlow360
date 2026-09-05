import uuid
from sqlalchemy import Column, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class Negotiation(Base):
    __tablename__ = "negotiations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    round_count = Column(String, default="0")
    status = Column(String, default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class NegotiationRound(Base):
    __tablename__ = "negotiation_rounds"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    negotiation_id = Column(UUID(as_uuid=True), ForeignKey("negotiations.id"), nullable=False)
    round_number = Column(String, nullable=False)
    customer_request = Column(Text, nullable=True)
    proposed_options = Column(Text, nullable=True)
    selected_option = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Concession(Base):
    __tablename__ = "concessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    total_budget = Column(Float, default=0.0)
    used_amount = Column(Float, default=0.0)
    remaining = Column(Float, default=0.0)
