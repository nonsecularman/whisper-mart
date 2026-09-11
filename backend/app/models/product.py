import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Enum, ForeignKey, Text, Float, Integer, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database.db import Base
from app.models.enums import ProductStatus


def gen_uuid():
    return str(uuid.uuid4())


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(100), nullable=False)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    icon = Column(String(255), nullable=True)
    parent_id = Column(UUID(as_uuid=False), ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    children = relationship("Category", backref="parent", remote_side=[id])
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    seller_id = Column(UUID(as_uuid=False), ForeignKey("sellers.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=False), ForeignKey("categories.id"), nullable=False, index=True)

    name = Column(String(250), nullable=False)
    slug = Column(String(280), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    brand = Column(String(100), nullable=True, index=True)

    price = Column(Float, nullable=False)
    original_price = Column(Float, nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    sku = Column(String(80), unique=True, nullable=False)

    tags = Column(String(500), nullable=True)  # comma separated
    status = Column(Enum(ProductStatus), default=ProductStatus.PENDING_APPROVAL, nullable=False, index=True)
    rejection_reason = Column(Text, nullable=True)

    is_featured = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    sold_count = Column(Integer, default=0)

    rating_avg = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller = relationship("Seller", back_populates="products")
    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")
    specifications = relationship("ProductSpecification", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")

    @property
    def discount_percent(self) -> int:
        if self.original_price and self.original_price > self.price:
            return round((1 - (self.price / self.original_price)) * 100)
        return 0


Index("ix_products_status_category", Product.status, Product.category_id)


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=False)
    url = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)

    product = relationship("Product", back_populates="images")


class ProductSpecification(Base):
    __tablename__ = "product_specifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=False)
    spec_key = Column(String(100), nullable=False)
    spec_value = Column(String(300), nullable=False)

    product = relationship("Product", back_populates="specifications")
