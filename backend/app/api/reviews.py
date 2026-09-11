from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database.db import get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.review import Review
from app.models.enums import OrderStatus
from app.schemas.order import ReviewCreate, ReviewOut
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def _recalculate_rating(product_id: str, db: Session):
    product = db.query(Product).filter(Product.id == product_id).first()
    reviews = db.query(Review).filter(Review.product_id == product_id, Review.is_approved == True).all()  # noqa: E712
    if reviews:
        product.rating_avg = round(sum(r.rating for r in reviews) / len(reviews), 2)
        product.rating_count = len(reviews)
    else:
        product.rating_avg = 0
        product.rating_count = 0
    db.commit()


@router.get("/product/{product_id}", response_model=List[ReviewOut])
def product_reviews(product_id: str, db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.product_id == product_id, Review.is_approved == True)  # noqa: E712
        .order_by(Review.created_at.desc())
        .all()
    )
    out = []
    for r in reviews:
        out.append(ReviewOut(
            id=r.id, product_id=r.product_id, user_id=r.user_id,
            user_name=r.user.name if r.user else "Anonymous",
            rating=r.rating, comment=r.comment, images=r.images, created_at=r.created_at,
        ))
    return out


@router.get("/product/{product_id}/summary")
def rating_summary(product_id: str, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.product_id == product_id, Review.is_approved == True).all()  # noqa: E712
    distribution = {str(i): 0 for i in range(1, 6)}
    for r in reviews:
        distribution[str(r.rating)] += 1
    avg = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else 0
    return {"average": avg, "count": len(reviews), "distribution": distribution}


@router.post("", response_model=ReviewOut)
def create_review(payload: ReviewCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only customers who purchased & received the product can review it.
    purchased_item = (
        db.query(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.user_id == user.id,
            OrderItem.product_id == payload.product_id,
            OrderItem.item_status == OrderStatus.DELIVERED,
        )
        .first()
    )
    if not purchased_item:
        raise HTTPException(status_code=403, detail="You can only review products you have purchased and received")

    existing = db.query(Review).filter(Review.product_id == payload.product_id, Review.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    review = Review(
        product_id=payload.product_id, user_id=user.id, order_item_id=purchased_item.id,
        rating=payload.rating, comment=payload.comment, images=payload.images,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    _recalculate_rating(payload.product_id, db)

    return ReviewOut(
        id=review.id, product_id=review.product_id, user_id=review.user_id, user_name=user.name,
        rating=review.rating, comment=review.comment, images=review.images, created_at=review.created_at,
    )


@router.delete("/{review_id}")
def delete_review(review_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != user.id and user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    product_id = review.product_id
    db.delete(review)
    db.commit()
    _recalculate_rating(product_id, db)
    return {"message": "Review deleted"}


# ---------- Admin moderation ----------

@router.get("/admin/all", dependencies=[Depends(require_admin)])
def admin_all_reviews(db: Session = Depends(get_db)):
    reviews = db.query(Review).options(joinedload(Review.user), joinedload(Review.product)).order_by(Review.created_at.desc()).limit(300).all()
    return [
        {
            "id": r.id, "product_id": r.product_id, "product_name": r.product.name if r.product else None,
            "user_name": r.user.name if r.user else None, "rating": r.rating, "comment": r.comment,
            "is_approved": r.is_approved, "is_flagged": r.is_flagged, "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]


@router.put("/admin/{review_id}/moderate", dependencies=[Depends(require_admin)])
def moderate_review(review_id: str, is_approved: bool, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_approved = is_approved
    db.commit()
    _recalculate_rating(review.product_id, db)
    return {"message": "Review moderated"}
