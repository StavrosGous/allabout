from fastapi import APIRouter, HTTPException, status

from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest):
    # Check uniqueness
    if await User.find_one(User.username == req.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    if await User.find_one(User.email == req.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    await user.insert()
    return UserResponse(id=str(user.id), username=user.username, email=user.email, role=user.role)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await User.find_one(User.username == req.username)
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=token)
