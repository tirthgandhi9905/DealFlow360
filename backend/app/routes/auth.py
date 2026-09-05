from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.auth.oauth import oauth

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.SALES_REP


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.SECRET_KEY, algorithm="HS256")


@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    user = User(
        email=data.email,
        name=data.name,
        hashed_password=pwd_context.hash(data.password),
        role=data.role,
    )
    db.add(user)
    await db.flush()
    return {"access_token": create_token(user.id), "user": {"id": str(user.id), "email": user.email, "name": user.name, "role": user.role}}


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return {"access_token": create_token(user.id), "user": {"id": str(user.id), "email": user.email, "name": user.name, "role": user.role}}


@router.get("/google")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.OAUTH_REDIRECT_URI)


@router.get("/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo", {})
    email = userinfo.get("email")
    if not email:
        raise HTTPException(400, "No email from OAuth")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email=email, name=userinfo.get("name", email), oauth_provider="google", oauth_id=userinfo.get("sub"))
        db.add(user)
        await db.flush()
    access_token = create_token(user.id)
    return RedirectResponse(f"{settings.FRONTEND_URL}?token={access_token}")


@router.get("/me")
async def me(db: AsyncSession = Depends(get_db)):
    from app.auth.dependencies import get_current_user
    return {"status": "use Authorization header"}
