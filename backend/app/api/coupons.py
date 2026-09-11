from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db
from app.models.coupon import Coupon
from app.schemas.order import CouponCreate, CouponUpdate, CouponOut
from app.core.deps import require_admin

router = APIRouter(prefix="/api/coupons", tags=["coupons"])


@router.get("", response_model=List[CouponOut], dependencies=[Depends(require_admin)])
def list_coupons(db: Session = Depends(get_db)):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


@router.post("", response_model=CouponOut, dependencies=[Depends(require_admin)])
def create_coupon(payload: CouponCreate, db: Session = Depends(get_db)):
    code = payload.code.upper()
    if db.query(Coupon).filter(Coupon.code == code).first():
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    if payload.expiry_date <= payload.start_date:
        raise HTTPException(status_code=400, detail="Expiry date must be after start date")
    coupon = Coupon(**{**payload.model_dump(), "code": code})
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.put("/{coupon_id}", response_model=CouponOut, dependencies=[Depends(require_admin)])
def update_coupon(coupon_id: str, payload: CouponUpdate, db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(coupon, k, v)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/{coupon_id}", dependencies=[Depends(require_admin)])
def delete_coupon(coupon_id: str, db: Session = Depends(get_db)):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted"}
