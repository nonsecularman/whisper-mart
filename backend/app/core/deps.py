from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.core.security import decode_access_token
from app.models.user import User, Seller
from app.models.enums import UserRole, UserStatus, SellerStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail="Account suspended")
    return user


def get_current_user_optional(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    return user


def require_role(*roles: UserRole):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


require_admin = require_role(UserRole.ADMIN)
require_seller = require_role(UserRole.SELLER)
require_customer = require_role(UserRole.CUSTOMER)


def get_current_seller(
    user: User = Depends(require_seller), db: Session = Depends(get_db)
) -> Seller:
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    if seller.status != SellerStatus.APPROVED:
        raise HTTPException(
            status_code=403,
            detail=f"Seller account is {seller.status.value}. Contact admin for approval.",
        )
    return seller
