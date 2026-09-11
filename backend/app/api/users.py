from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.user import User
from app.models.address import Address
from app.schemas.user import UserOut, UserUpdate
from app.schemas.order import AddressCreate, AddressUpdate, AddressOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    db.commit()
    db.refresh(user)
    return user


# ---------- Addresses ----------

@router.get("/me/addresses", response_model=List[AddressOut])
def list_addresses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Address).filter(Address.user_id == user.id).order_by(Address.is_default.desc()).all()


@router.post("/me/addresses", response_model=AddressOut)
def add_address(
    payload: AddressCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if payload.is_default:
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    addr = Address(user_id=user.id, **payload.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return addr


@router.put("/me/addresses/{address_id}", response_model=AddressOut)
def update_address(
    address_id: str,
    payload: AddressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("is_default"):
        db.query(Address).filter(Address.user_id == user.id).update({"is_default": False})
    for k, v in data.items():
        setattr(addr, k, v)
    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/me/addresses/{address_id}")
def delete_address(
    address_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(addr)
    db.commit()
    return {"message": "Address deleted"}
