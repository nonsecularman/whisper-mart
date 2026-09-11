import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database.db import Base


def gen_uuid():
    return str(uuid.uuid4())


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    order_item_id = Column(UUID(as_uuid=False), ForeignKey("order_items.id"), nullable=True)

    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    images = Column(String(1000), nullable=True)  # comma-separated urls

    is_approved = Column(Boolean, default=True)
    is_flagged = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
