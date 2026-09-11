from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.enums import ProductStatus


class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    parent_id: Optional[str] = None


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    icon: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class SpecificationIn(BaseModel):
    spec_key: str
    spec_value: str


class ProductImageOut(BaseModel):
    id: str
    url: str
    sort_order: int
    is_primary: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str = Field(min_length=3, max_length=250)
    slug: Optional[str] = None
    description: Optional[str] = None
    category_id: str
    brand: Optional[str] = None
    price: float = Field(gt=0)
    original_price: float = Field(gt=0)
    stock: int = Field(ge=0)
    sku: str
    tags: Optional[str] = None
    specifications: Optional[List[SpecificationIn]] = []
    images: Optional[List[str]] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    stock: Optional[int] = None
    tags: Optional[str] = None
    status: Optional[ProductStatus] = None
    is_featured: Optional[bool] = None
    specifications: Optional[List[SpecificationIn]] = None
    images: Optional[List[str]] = None


class SellerBrief(BaseModel):
    id: str
    store_name: str

    class Config:
        from_attributes = True


class ProductCardOut(BaseModel):
    id: str
    name: str
    slug: str
    price: float
    original_price: float
    discount_percent: int
    rating_avg: float
    rating_count: int
    stock: int
    status: ProductStatus
    image: Optional[str] = None
    brand: Optional[str] = None

    class Config:
        from_attributes = True


class ProductDetailOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    brand: Optional[str] = None
    price: float
    original_price: float
    discount_percent: int
    stock: int
    sku: str
    tags: Optional[str] = None
    status: ProductStatus
    rejection_reason: Optional[str] = None
    is_featured: bool
    rating_avg: float
    rating_count: int
    sold_count: int
    created_at: datetime
    category: CategoryOut
    seller: SellerBrief
    images: List[ProductImageOut] = []
    specifications: List[dict] = []

    class Config:
        from_attributes = True


class PaginatedProducts(BaseModel):
    items: List[ProductCardOut]
    total: int
    page: int
    page_size: int
    total_pages: int
