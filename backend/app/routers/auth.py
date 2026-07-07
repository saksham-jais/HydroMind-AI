from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(tags=["auth"])

class LoginRequest(BaseModel):
    userid: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    user: dict | None = None
    detail: str | None = None

# A very basic hardcoded list of valid users
VALID_USERS = {
    "admin": {
        "password": "password123",
        "name": "Super Admin",
        "role": "admin"
    },
    "cgwb_gujarat": {
        "password": "water",
        "name": "CGWB Nodal Officer",
        "role": "officer"
    }
}

@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    user_record = VALID_USERS.get(req.userid)
    if not user_record or user_record["password"] != req.password:
        return LoginResponse(
            success=False,
            detail="Invalid credentials. Hint: use admin / password123"
        )
    
    return LoginResponse(
        success=True,
        user={
            "userid": req.userid,
            "name": user_record["name"],
            "role": user_record["role"]
        }
    )
