from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database.db import get_db
from app.models.user import User, Seller
from app.models.product import Product, Category
from app.models.order import Order, OrderItem
from app.models.enums import UserRole, UserStatus, ProductStatus, OrderStatus, SellerStatus
from app.schemas.user import UserOut
from app.core.deps import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", dependencies=[Depends(require_admin)])
def platform_stats(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).filter(User.role == UserRole.CUSTOMER).scalar() or 0
    total_sellers = db.query(func.count(Seller.id)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_revenue = db.query(func.sum(Order.total)).filter(Order.status != OrderStatus.CANCELLED).scalar() or 0
    pending_seller_approvals = db.query(func.count(Seller.id)).filter(Seller.status == SellerStatus.PENDING).scalar() or 0
    pending_product_approvals = db.query(func.count(Product.id)).filter(Product.status == ProductStatus.PENDING_APPROVAL).scalar() or 0

    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "pending_seller_approvals": pending_seller_approvals,
        "pending_product_approvals": pending_product_approvals,
    }


@router.get("/stats/sales-over-time", dependencies=[Depends(require_admin)])
def sales_over_time(db: Session = Depends(get_db)):
    rows = (
        db.query(func.date(Order.created_at).label("day"), func.sum(Order.total).label("revenue"), func.count(Order.id).label("orders"))
        .filter(Order.status != OrderStatus.CANCELLED)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    return [{"date": str(r.day), "revenue": round(r.revenue or 0, 2), "orders": r.orders} for r in rows]


@router.get("/stats/top-categories", dependencies=[Depends(require_admin)])
def top_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(Category.name, func.count(Product.id).label("product_count"), func.sum(Product.sold_count).label("units_sold"))
        .join(Product, Product.category_id == Category.id)
        .group_by(Category.name)
        .order_by(func.sum(Product.sold_count).desc())
        .limit(10)
        .all()
    )
    return [{"category": r.name, "product_count": r.product_count, "units_sold": r.units_sold or 0} for r in rows]


@router.get("/stats/top-products", dependencies=[Depends(require_admin)])
def top_products(db: Session = Depends(get_db)):
    rows = db.query(Product).order_by(Product.sold_count.desc()).limit(10).all()
    return [{"id": p.id, "name": p.name, "sold_count": p.sold_count, "revenue": round(p.sold_count * p.price, 2)} for p in rows]


@router.get("/users", response_model=List[UserOut], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}/suspend", dependencies=[Depends(require_admin)])
def suspend_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot suspend an admin account")
    user.status = UserStatus.SUSPENDED
    db.commit()
    return {"message": "User suspended"}


@router.put("/users/{user_id}/activate", dependencies=[Depends(require_admin)])
def activate_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.ACTIVE
    db.commit()
    return {"message": "User activated"}
