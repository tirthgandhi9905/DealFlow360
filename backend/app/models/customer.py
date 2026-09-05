import enum, uuid
from sqlalchemy import Column, String, Enum, Text, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class CustomerTier(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"

class Customer(Base):
    __tablename__ = "customers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    tier = Column(Enum(CustomerTier), default=CustomerTier.BRONZE)
    address = Column(Text, nullable=True)
    industry = Column(String, nullable=True)
    lifetime_value = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
