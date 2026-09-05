import enum, uuid
from sqlalchemy import Column, String, Enum, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class UserRole(str, enum.Enum):
    SALES_REP = "sales_rep"
    SALES_MANAGER = "sales_manager"
    FINANCE = "finance"
    ADMIN = "admin"
    CUSTOMER = "customer"

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.SALES_REP, nullable=False)
    is_active = Column(Boolean, default=True)
    oauth_provider = Column(String, nullable=True)
    oauth_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
