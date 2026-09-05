import enum, uuid
from sqlalchemy import Column, String, Enum, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    required_level = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class ApprovalStep(Base):
    __tablename__ = "approval_steps"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    approval_id = Column(UUID(as_uuid=True), ForeignKey("approvals.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(Enum(ApprovalStatus), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
