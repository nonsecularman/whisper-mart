"""
Seed script — populates Whisper Mart with demo data:
  - 1 admin account
  - 1 seller account (approved) + store
  - 1 customer account
  - Categories
  - Products (with images, specs)
  - A couple of reviews
  - Coupons

Run with:  python seed.py
(Run AFTER the API has started at least once, or after `alembic upgrade head`,
so tables already exist — this script also calls create_all defensively.)
"""
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.db import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, Seller
from app.models.product import Category, Product, ProductImage, ProductSpecification
from app.models.cart import Cart, Wishlist
from app.models.review import Review
from app.models.coupon import Coupon
from app.models.enums import UserRole, SellerStatus, ProductStatus, DiscountType

Base.metadata.create_all(bind=engine)
db = SessionLocal()

PLACEHOLDER_IMAGES = {
    "electronics": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600",
    "mobiles": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600",
    "laptops": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600",
    "fashion": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600",
    "home": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600",
    "beauty": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600",
    "books": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600",
    "sports": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600",
    "toys": "https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=600",
}


def get_or_create_user(name, email, password, role, phone="9999999999"):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(name=name, email=email, phone=phone, hashed_password=hash_password(password), role=role)
    db.add(user)
    db.flush()
    db.add(Cart(user_id=user.id))
    db.add(Wishlist(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def get_or_create_category(name, slug, icon=None):
    cat = db.query(Category).filter(Category.slug == slug).first()
    if cat:
        return cat
    cat = Category(name=name, slug=slug, icon=icon)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def main():
    print("Seeding Whisper Mart demo data...")

    admin = get_or_create_user("Whisper Admin", "admin@wm-demo.example.com", "Admin@123", UserRole.ADMIN)
    seller_user = get_or_create_user("Aarav Traders", "seller@wm-demo.example.com", "Seller@123", UserRole.SELLER)
    customer = get_or_create_user("Demo Customer", "customer@wm-demo.example.com", "Customer@123", UserRole.CUSTOMER)

    seller = db.query(Seller).filter(Seller.user_id == seller_user.id).first()
    if not seller:
        seller = Seller(
            user_id=seller_user.id, store_name="Aarav Traders", owner_name="Aarav Sharma",
            email="seller@wm-demo.example.com", phone="9876543210",
            description="Trusted seller of electronics and lifestyle products.",
            address="MG Road, Bengaluru, Karnataka", status=SellerStatus.APPROVED,
        )
        db.add(seller)
        db.commit()
        db.refresh(seller)

    categories_data = [
        ("Electronics", "electronics"), ("Mobiles", "mobiles"), ("Laptops", "laptops"),
        ("Computers", "computers"), ("Gaming", "gaming"), ("Fashion", "fashion"),
        ("Men", "men"), ("Women", "women"), ("Home", "home"), ("Kitchen", "kitchen"),
        ("Beauty", "beauty"), ("Accessories", "accessories"), ("Books", "books"),
        ("Sports", "sports"), ("Toys", "toys"),
    ]
    cats = {}
    for name, slug in categories_data:
        cats[slug] = get_or_create_category(name, slug)

    products_data = [
        dict(name="Whisper AeroBuds Pro Wireless Earbuds", cat="mobiles", brand="Whisper Audio",
             price=1999, original_price=3999, stock=50, sku="WM-EAR-001",
             desc="True wireless earbuds with active noise cancellation, 30-hour battery life, and IPX5 water resistance.",
             specs={"Battery Life": "30 hours", "Connectivity": "Bluetooth 5.3", "Water Resistance": "IPX5"},
             img=PLACEHOLDER_IMAGES["mobiles"]),
        dict(name="Nimbus 6.7-inch Smartphone (128GB)", cat="mobiles", brand="Nimbus",
             price=14999, original_price=19999, stock=30, sku="WM-PHN-001",
             desc="6.7-inch AMOLED display, 128GB storage, 5000mAh battery, triple camera setup.",
             specs={"Display": "6.7 inch AMOLED", "Storage": "128GB", "RAM": "8GB", "Battery": "5000mAh"},
             img=PLACEHOLDER_IMAGES["electronics"]),
        dict(name="CoreBook 14 Ultraslim Laptop (i5, 16GB)", cat="laptops", brand="CoreBook",
             price=48999, original_price=59999, stock=15, sku="WM-LAP-001",
             desc="14-inch FHD display, Intel i5 12th Gen, 16GB RAM, 512GB SSD, ultra-slim aluminium body.",
             specs={"Processor": "Intel i5 12th Gen", "RAM": "16GB", "Storage": "512GB SSD", "Display": "14 inch FHD"},
             img=PLACEHOLDER_IMAGES["laptops"]),
        dict(name="Momentum Mechanical Gaming Keyboard RGB", cat="gaming", brand="Momentum",
             price=2499, original_price=3499, stock=40, sku="WM-GAM-001",
             desc="Full-size mechanical keyboard with hot-swappable switches and per-key RGB lighting.",
             specs={"Switch Type": "Hot-swappable Blue", "Backlight": "RGB", "Connectivity": "USB-C"},
             img=PLACEHOLDER_IMAGES["electronics"]),
        dict(name="Everyday Cotton Crew-Neck T-Shirt", cat="men", brand="Everyday Basics",
             price=399, original_price=799, stock=100, sku="WM-MEN-001",
             desc="100% breathable cotton, regular fit, machine washable, available in multiple colours.",
             specs={"Material": "100% Cotton", "Fit": "Regular", "Care": "Machine wash"},
             img=PLACEHOLDER_IMAGES["fashion"]),
        dict(name="Aura Floral Wrap Dress", cat="women", brand="Aura Studio",
             price=1299, original_price=2199, stock=60, sku="WM-WOM-001",
             desc="Flowy floral wrap dress, perfect for summer outings, breathable rayon fabric.",
             specs={"Material": "Rayon", "Occasion": "Casual", "Length": "Midi"},
             img=PLACEHOLDER_IMAGES["fashion"]),
        dict(name="HearthGlow Non-Stick Cookware Set (5 Pcs)", cat="kitchen", brand="HearthGlow",
             price=1799, original_price=2999, stock=35, sku="WM-KIT-001",
             desc="5-piece non-stick cookware set with heat-resistant handles, induction compatible.",
             specs={"Material": "Aluminium, Non-stick coating", "Pieces": "5", "Induction Compatible": "Yes"},
             img=PLACEHOLDER_IMAGES["home"]),
        dict(name="PureGlow Vitamin C Face Serum 30ml", cat="beauty", brand="PureGlow",
             price=549, original_price=899, stock=80, sku="WM-BEA-001",
             desc="Brightening vitamin C serum with hyaluronic acid, suitable for all skin types.",
             specs={"Volume": "30ml", "Skin Type": "All", "Key Ingredient": "Vitamin C"},
             img=PLACEHOLDER_IMAGES["beauty"]),
        dict(name="Wanderlust Bestsellers Fiction Bundle (3 Books)", cat="books", brand="Wanderlust Press",
             price=699, original_price=1050, stock=45, sku="WM-BOOK-001",
             desc="A curated bundle of 3 bestselling fiction paperbacks.",
             specs={"Format": "Paperback", "Language": "English", "Books Included": "3"},
             img=PLACEHOLDER_IMAGES["books"]),
        dict(name="TrailBlaze Running Shoes", cat="sports", brand="TrailBlaze",
             price=1899, original_price=2999, stock=55, sku="WM-SPO-001",
             desc="Lightweight running shoes with breathable mesh upper and cushioned sole.",
             specs={"Sole": "EVA Cushioned", "Upper Material": "Mesh", "Use": "Running"},
             img=PLACEHOLDER_IMAGES["sports"]),
        dict(name="Tinker Bricks Building Blocks Set (350 pcs)", cat="toys", brand="Tinker",
             price=999, original_price=1599, stock=70, sku="WM-TOY-001",
             desc="350-piece creative building block set, compatible with major brick brands.",
             specs={"Pieces": "350", "Age Group": "6+", "Material": "ABS Plastic"},
             img=PLACEHOLDER_IMAGES["toys"]),
        dict(name="Voltix 20000mAh Fast Charging Power Bank", cat="accessories", brand="Voltix",
             price=1499, original_price=2299, stock=90, sku="WM-ACC-001",
             desc="20000mAh power bank with 22.5W fast charging, dual USB output.",
             specs={"Capacity": "20000mAh", "Fast Charging": "22.5W", "Ports": "2x USB-A, 1x USB-C"},
             img=PLACEHOLDER_IMAGES["electronics"]),
    ]

    created_products = []
    for pd in products_data:
        existing = db.query(Product).filter(Product.sku == pd["sku"]).first()
        if existing:
            created_products.append(existing)
            continue
        slug = pd["sku"].lower()
        product = Product(
            seller_id=seller.id, category_id=cats[pd["cat"]].id, name=pd["name"], slug=slug,
            description=pd["desc"], brand=pd["brand"], price=pd["price"], original_price=pd["original_price"],
            stock=pd["stock"], sku=pd["sku"], tags=pd["brand"], status=ProductStatus.ACTIVE,
            is_featured=True,
        )
        db.add(product)
        db.flush()
        db.add(ProductImage(product_id=product.id, url=pd["img"], sort_order=0, is_primary=True))
        for k, v in pd["specs"].items():
            db.add(ProductSpecification(product_id=product.id, spec_key=k, spec_value=v))
        created_products.append(product)

    db.commit()

    coupons_data = [
        dict(code="WELCOME10", discount_type=DiscountType.PERCENTAGE, discount_value=10,
             min_order_amount=500, max_discount_amount=300, usage_limit=1000),
        dict(code="FLAT100", discount_type=DiscountType.FIXED, discount_value=100,
             min_order_amount=999, max_discount_amount=None, usage_limit=500),
    ]
    for cd in coupons_data:
        if db.query(Coupon).filter(Coupon.code == cd["code"]).first():
            continue
        db.add(Coupon(
            **cd, start_date=datetime.utcnow() - timedelta(days=1),
            expiry_date=datetime.utcnow() + timedelta(days=90), is_active=True,
        ))
    db.commit()

    print("Seed complete.")
    print("-" * 60)
    print("Demo credentials:")
    print("  Admin:    admin@wm-demo.example.com / Admin@123")
    print("  Seller:   seller@wm-demo.example.com / Seller@123")
    print("  Customer: customer@wm-demo.example.com / Customer@123")
    print("-" * 60)
    print(f"Categories created: {len(cats)}")
    print(f"Products created:   {len(created_products)}")
    print("Coupons: WELCOME10 (10% off, max ₹300), FLAT100 (₹100 off orders ₹999+)")


if __name__ == "__main__":
    main()
