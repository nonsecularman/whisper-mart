from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.enums import SellerStatus


class SellerRegister(BaseModel):
    store_name: str = Field(min_length=2, max_length=150)
    owner_name: str
    email: EmailStr
    phone: str
    description: Optional[str] = None
    address: Optional[str] = None


class SellerOut(BaseModel):
    id: str
    user_id: str
    store_name: str
    owner_name: str
    email: str
    phone: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    status: SellerStatus
    commission_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


class SellerUpdate(BaseModel):
    store_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class SellerStatusUpdate(BaseModel):
    status: SellerStatus
    reason: Optional[str] = None
