from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import os
import logging
import midtransclient
from pathlib import Path
from dotenv import load_dotenv
import uuid
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Midtrans config
MIDTRANS_SERVER_KEY = os.environ.get('MIDTRANS_SERVER_KEY', 'sandbox-test-key')
MIDTRANS_CLIENT_KEY = os.environ.get('MIDTRANS_CLIENT_KEY', 'sandbox-test-key')
MIDTRANS_IS_PRODUCTION = os.environ.get('MIDTRANS_IS_PRODUCTION', 'False').lower() == 'true'

# Xendit config (placeholder)
XENDIT_API_KEY = os.environ.get('XENDIT_API_KEY', 'sandbox-test-key')

# Initialize Midtrans
snap = midtransclient.Snap(
    is_production=MIDTRANS_IS_PRODUCTION,
    server_key=MIDTRANS_SERVER_KEY,
    client_key=MIDTRANS_CLIENT_KEY
)

app = FastAPI(title="IndoWater Solution API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class UserRole(str):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    MANAGER = "manager"
    CUSTOMER = "customer"

class Permission(str):
    # User Management
    CREATE_USER = "create_user"
    EDIT_USER = "edit_user"
    DELETE_USER = "delete_user"
    VIEW_USERS = "view_users"
    MANAGE_ROLES = "manage_roles"
    
    # Meter Management
    CREATE_METER = "create_meter"
    EDIT_METER = "edit_meter"
    DELETE_METER = "delete_meter"
    VIEW_ALL_METERS = "view_all_meters"
    
    # Property Management
    CREATE_PROPERTY = "create_property"
    EDIT_PROPERTY = "edit_property"
    DELETE_PROPERTY = "delete_property"
    VIEW_ALL_PROPERTIES = "view_all_properties"
    VERIFY_PROPERTY = "verify_property"
    
    # Transaction Management
    VIEW_ALL_TRANSACTIONS = "view_all_transactions"
    REFUND_TRANSACTION = "refund_transaction"
    
    # Settings
    MANAGE_SETTINGS = "manage_settings"
    UPLOAD_LOGO = "upload_logo"
    MANAGE_RATES = "manage_rates"
    
    # Reports
    VIEW_REPORTS = "view_reports"
    EXPORT_DATA = "export_data"

# Role Permissions Mapping
ROLE_PERMISSIONS = {
    UserRole.SUPERADMIN: [
        Permission.CREATE_USER, Permission.EDIT_USER, Permission.DELETE_USER, 
        Permission.VIEW_USERS, Permission.MANAGE_ROLES,
        Permission.CREATE_METER, Permission.EDIT_METER, Permission.DELETE_METER, 
        Permission.VIEW_ALL_METERS,
        Permission.CREATE_PROPERTY, Permission.EDIT_PROPERTY, Permission.DELETE_PROPERTY,
        Permission.VIEW_ALL_PROPERTIES, Permission.VERIFY_PROPERTY,
        Permission.VIEW_ALL_TRANSACTIONS, Permission.REFUND_TRANSACTION,
        Permission.MANAGE_SETTINGS, Permission.UPLOAD_LOGO, Permission.MANAGE_RATES,
        Permission.VIEW_REPORTS, Permission.EXPORT_DATA
    ],
    UserRole.ADMIN: [
        Permission.VIEW_USERS, Permission.EDIT_USER,
        Permission.VIEW_ALL_METERS, Permission.EDIT_METER,
        Permission.VIEW_ALL_PROPERTIES, Permission.VERIFY_PROPERTY,
        Permission.VIEW_ALL_TRANSACTIONS,
        Permission.UPLOAD_LOGO, Permission.MANAGE_RATES,
        Permission.VIEW_REPORTS
    ],
    UserRole.MANAGER: [
        Permission.VIEW_USERS,
        Permission.VIEW_ALL_METERS,
        Permission.VIEW_ALL_PROPERTIES,
        Permission.VIEW_ALL_TRANSACTIONS,
        Permission.VIEW_REPORTS
    ],
    UserRole.CUSTOMER: [
        Permission.CREATE_METER, Permission.EDIT_METER,
        Permission.CREATE_PROPERTY, Permission.EDIT_PROPERTY
    ]
}

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission"""
        return permission in ROLE_PERMISSIONS.get(self.role, [])

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class PropertyType(str):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    BOARDING_HOUSE = "boarding_house"
    RENTAL = "rental"
    OTHER = "other"

class PropertyStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Property(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    property_type: str
    address: str
    city: str
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    owner_id: str
    owner_name: str
    status: str = PropertyStatus.PENDING
    verification_note: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PropertyCreate(BaseModel):
    name: str
    property_type: str
    address: str
    city: str
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PropertyVerify(BaseModel):
    status: str
    note: Optional[str] = None

class WaterMeter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    meter_number: str
    location: str
    customer_id: str
    customer_name: str
    property_id: Optional[str] = None
    property_name: Optional[str] = None
    balance: float = 0.0
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MeterPropertyLink(BaseModel):
    property_id: str

class MeterCreate(BaseModel):
    meter_number: str
    location: str

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    customer_id: str
    meter_id: str
    amount: float
    payment_method: str
    status: str = "pending"
    transaction_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreditPurchase(BaseModel):
    meter_id: str
    amount: float
    payment_method: str

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    logo_base64: Optional[str] = None
    water_rate: float = 1000.0
    low_balance_threshold: float = 5000.0

# ============= AUTH FUNCTIONS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    
    user_data = await db.users.find_one({"email": email}, {"_id": 0})
    if user_data is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user_data['created_at'], str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    user = User(**user_data)
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    return user

def require_permission(permission: str):
    """Dependency to check if user has required permission"""
    async def permission_checker(current_user: User = Depends(get_current_user)):
        if not current_user.has_permission(permission):
            raise HTTPException(
                status_code=403, 
                detail=f"Permission denied. Required permission: {permission}"
            )
        return current_user
    return permission_checker

# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=Token)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_obj = User(
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=UserRole.CUSTOMER
    )
    
    user_doc = user_obj.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['hashed_password'] = hash_password(user.password)
    
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": user.email})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user_data = await db.users.find_one({"email": user_login.email}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(user_login.password, user_data['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if isinstance(user_data['created_at'], str):
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    user_obj = User(**{k: v for k, v in user_data.items() if k != 'hashed_password'})
    access_token = create_access_token(data={"sub": user_login.email})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ============= METER ROUTES =============

@api_router.post("/meters", response_model=WaterMeter)
async def create_meter(meter: MeterCreate, current_user: User = Depends(get_current_user)):
    existing = await db.meters.find_one({"meter_number": meter.meter_number})
    if existing:
        raise HTTPException(status_code=400, detail="Meter number already exists")
    
    meter_obj = WaterMeter(
        meter_number=meter.meter_number,
        location=meter.location,
        customer_id=current_user.id,
        customer_name=current_user.name
    )
    
    meter_doc = meter_obj.model_dump()
    meter_doc['created_at'] = meter_doc['created_at'].isoformat()
    
    await db.meters.insert_one(meter_doc)
    
    return meter_obj

@api_router.get("/meters", response_model=List[WaterMeter])
async def get_meters(current_user: User = Depends(get_current_user)):
    if current_user.has_permission(Permission.VIEW_ALL_METERS):
        meters = await db.meters.find({}, {"_id": 0}).to_list(1000)
    else:
        meters = await db.meters.find({"customer_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    for meter in meters:
        if isinstance(meter['created_at'], str):
            meter['created_at'] = datetime.fromisoformat(meter['created_at'])
    
    return meters

@api_router.get("/meters/{meter_id}", response_model=WaterMeter)
async def get_meter(meter_id: str, current_user: User = Depends(get_current_user)):
    meter_data = await db.meters.find_one({"id": meter_id}, {"_id": 0})
    if not meter_data:
        raise HTTPException(status_code=404, detail="Meter not found")
    
    if not current_user.has_permission(Permission.VIEW_ALL_METERS) and meter_data['customer_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if isinstance(meter_data['created_at'], str):
        meter_data['created_at'] = datetime.fromisoformat(meter_data['created_at'])
    
    return WaterMeter(**meter_data)

@api_router.put("/meters/{meter_id}/property")
async def link_meter_to_property(
    meter_id: str,
    link: MeterPropertyLink,
    current_user: User = Depends(get_current_user)
):
    """Link meter to a property"""
    # Check meter exists and user has access
    meter_data = await db.meters.find_one({"id": meter_id})
    if not meter_data:
        raise HTTPException(status_code=404, detail="Meter not found")
    
    if not current_user.has_permission(Permission.EDIT_METER) and meter_data['customer_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check property exists and is approved
    property_data = await db.properties.find_one({"id": link.property_id})
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if property_data['status'] != PropertyStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Property must be approved first")
    
    # Update meter
    await db.meters.update_one(
        {"id": meter_id},
        {"$set": {
            "property_id": link.property_id,
            "property_name": property_data['name']
        }}
    )
    
    return {"message": "Meter linked to property successfully"}

# ============= PROPERTY ROUTES =============

@api_router.post("/properties", response_model=Property)
async def create_property(property_data: PropertyCreate, current_user: User = Depends(get_current_user)):
    """Create new property"""
    if not current_user.has_permission(Permission.CREATE_PROPERTY):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Validate property type
    valid_types = [PropertyType.RESIDENTIAL, PropertyType.COMMERCIAL, PropertyType.INDUSTRIAL,
                   PropertyType.BOARDING_HOUSE, PropertyType.RENTAL, PropertyType.OTHER]
    if property_data.property_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid property type")
    
    property_obj = Property(
        name=property_data.name,
        property_type=property_data.property_type,
        address=property_data.address,
        city=property_data.city,
        postal_code=property_data.postal_code,
        latitude=property_data.latitude,
        longitude=property_data.longitude,
        owner_id=current_user.id,
        owner_name=current_user.name,
        status=PropertyStatus.PENDING
    )
    
    property_doc = property_obj.model_dump()
    property_doc['created_at'] = property_doc['created_at'].isoformat()
    
    await db.properties.insert_one(property_doc)
    
    logger.info(f"Property created: {property_obj.id} by {current_user.email}")
    
    return property_obj

@api_router.get("/properties", response_model=List[Property])
async def get_properties(current_user: User = Depends(get_current_user)):
    """Get properties list"""
    if current_user.has_permission(Permission.VIEW_ALL_PROPERTIES):
        properties = await db.properties.find({}, {"_id": 0}).to_list(1000)
    else:
        properties = await db.properties.find({"owner_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    for prop in properties:
        if isinstance(prop['created_at'], str):
            prop['created_at'] = datetime.fromisoformat(prop['created_at'])
        if prop.get('verified_at') and isinstance(prop['verified_at'], str):
            prop['verified_at'] = datetime.fromisoformat(prop['verified_at'])
    
    return properties

@api_router.get("/properties/{property_id}", response_model=Property)
async def get_property(property_id: str, current_user: User = Depends(get_current_user)):
    """Get property details"""
    property_data = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if not current_user.has_permission(Permission.VIEW_ALL_PROPERTIES) and property_data['owner_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if isinstance(property_data['created_at'], str):
        property_data['created_at'] = datetime.fromisoformat(property_data['created_at'])
    if property_data.get('verified_at') and isinstance(property_data['verified_at'], str):
        property_data['verified_at'] = datetime.fromisoformat(property_data['verified_at'])
    
    return Property(**property_data)

@api_router.put("/properties/{property_id}")
async def update_property(
    property_id: str,
    property_update: PropertyCreate,
    current_user: User = Depends(get_current_user)
):
    """Update property"""
    property_data = await db.properties.find_one({"id": property_id})
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if not current_user.has_permission(Permission.EDIT_PROPERTY) and property_data['owner_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # If property was approved, set back to pending after edit
    update_data = property_update.model_dump()
    if property_data['status'] == PropertyStatus.APPROVED:
        update_data['status'] = PropertyStatus.PENDING
        update_data['verification_note'] = None
        update_data['verified_by'] = None
        update_data['verified_at'] = None
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": update_data}
    )
    
    logger.info(f"Property updated: {property_id} by {current_user.email}")
    
    return {"message": "Property updated successfully"}

@api_router.put("/properties/{property_id}/verify")
async def verify_property(
    property_id: str,
    verify_data: PropertyVerify,
    current_user: User = Depends(require_permission(Permission.VERIFY_PROPERTY))
):
    """Verify property (approve/reject)"""
    property_data = await db.properties.find_one({"id": property_id})
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if verify_data.status not in [PropertyStatus.APPROVED, PropertyStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")
    
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {
            "status": verify_data.status,
            "verification_note": verify_data.note,
            "verified_by": current_user.email,
            "verified_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Property {property_id} {verify_data.status} by {current_user.email}")
    
    return {"message": f"Property {verify_data.status} successfully"}

@api_router.delete("/properties/{property_id}")
async def delete_property(
    property_id: str,
    current_user: User = Depends(require_permission(Permission.DELETE_PROPERTY))
):
    """Delete property"""
    property_data = await db.properties.find_one({"id": property_id})
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Check if any meters are linked
    linked_meters = await db.meters.count_documents({"property_id": property_id})
    if linked_meters > 0:
        raise HTTPException(status_code=400, detail="Cannot delete property with linked meters")
    
    await db.properties.delete_one({"id": property_id})
    
    logger.info(f"Property deleted: {property_id} by {current_user.email}")
    
    return {"message": "Property deleted successfully"}

# ============= CREDIT & PAYMENT ROUTES =============

@api_router.post("/credit/purchase")
async def purchase_credit(purchase: CreditPurchase, current_user: User = Depends(get_current_user)):
    meter_data = await db.meters.find_one({"id": purchase.meter_id}, {"_id": 0})
    if not meter_data:
        raise HTTPException(status_code=404, detail="Meter not found")
    
    if current_user.role != UserRole.ADMIN and meter_data['customer_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if purchase.amount < 10000:
        raise HTTPException(status_code=400, detail="Minimum purchase amount is 10,000 IDR")
    
    order_id = f"water-{purchase.meter_id}-{int(datetime.now().timestamp())}"
    
    # Create Midtrans transaction
    param = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": int(purchase.amount)
        },
        "customer_details": {
            "first_name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone or "+628123456789"
        },
        "item_details": [
            {
                "id": purchase.meter_id,
                "price": int(purchase.amount),
                "quantity": 1,
                "name": f"Water Credit - {meter_data['meter_number']}"
            }
        ]
    }
    
    try:
        transaction = snap.create_transaction(param)
        
        # Save transaction
        trans_obj = Transaction(
            order_id=order_id,
            customer_id=current_user.id,
            meter_id=purchase.meter_id,
            amount=purchase.amount,
            payment_method=purchase.payment_method
        )
        
        trans_doc = trans_obj.model_dump()
        trans_doc['transaction_time'] = trans_doc['transaction_time'].isoformat()
        
        await db.transactions.insert_one(trans_doc)
        
        return {
            "order_id": order_id,
            "payment_token": transaction.get('token'),
            "payment_url": transaction.get('redirect_url'),
            "transaction_id": transaction.get('transaction_id')
        }
    except Exception as e:
        logger.error(f"Payment creation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment creation failed: {str(e)}")

@api_router.post("/payment/notification")
async def payment_notification(notification: dict):
    order_id = notification.get('order_id')
    transaction_status = notification.get('transaction_status')
    
    logger.info(f"Payment notification received: {order_id}, status: {transaction_status}")
    
    # Update transaction status
    await db.transactions.update_one(
        {"order_id": order_id},
        {"$set": {"status": transaction_status}}
    )
    
    # If payment successful, update meter balance
    if transaction_status in ['capture', 'settlement']:
        trans_data = await db.transactions.find_one({"order_id": order_id}, {"_id": 0})
        if trans_data:
            await db.meters.update_one(
                {"id": trans_data['meter_id']},
                {"$inc": {"balance": trans_data['amount']}}
            )
            logger.info(f"Meter balance updated: {trans_data['meter_id']}, amount: {trans_data['amount']}")
    
    return {"status": "success"}

@api_router.get("/transactions")
async def get_transactions(current_user: User = Depends(get_current_user)):
    if current_user.has_permission(Permission.VIEW_ALL_TRANSACTIONS):
        transactions = await db.transactions.find({}, {"_id": 0}).to_list(1000)
    else:
        transactions = await db.transactions.find({"customer_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    for trans in transactions:
        if isinstance(trans['transaction_time'], str):
            trans['transaction_time'] = datetime.fromisoformat(trans['transaction_time'])
    
    return transactions

# ============= ADMIN ROUTES =============

@api_router.get("/admin/dashboard")
async def admin_dashboard(current_user: User = Depends(require_permission(Permission.VIEW_REPORTS))):
    total_customers = await db.users.count_documents({"role": UserRole.CUSTOMER})
    total_users = await db.users.count_documents({})
    total_meters = await db.meters.count_documents({})
    total_properties = await db.properties.count_documents({})
    total_transactions = await db.transactions.count_documents({})
    
    # Property stats by status
    pending_properties = await db.properties.count_documents({"status": PropertyStatus.PENDING})
    approved_properties = await db.properties.count_documents({"status": PropertyStatus.APPROVED})
    rejected_properties = await db.properties.count_documents({"status": PropertyStatus.REJECTED})
    
    # Total revenue
    transactions = await db.transactions.find({"status": {"$in": ["capture", "settlement"]}}, {"_id": 0}).to_list(10000)
    total_revenue = sum(t['amount'] for t in transactions)
    
    # Role distribution
    role_stats = {}
    for role in [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER]:
        count = await db.users.count_documents({"role": role})
        role_stats[role] = count
    
    return {
        "total_customers": total_customers,
        "total_users": total_users,
        "total_meters": total_meters,
        "total_properties": total_properties,
        "total_transactions": total_transactions,
        "total_revenue": total_revenue,
        "role_distribution": role_stats,
        "property_stats": {
            "pending": pending_properties,
            "approved": approved_properties,
            "rejected": rejected_properties
        }
    }

@api_router.get("/admin/customers")
async def get_all_customers(current_user: User = Depends(require_permission(Permission.VIEW_USERS))):
    customers = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    
    for customer in customers:
        if isinstance(customer['created_at'], str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    
    return customers

# ============= ROLE MANAGEMENT ROUTES =============

class UserRoleUpdate(BaseModel):
    user_id: str
    new_role: str

class UserStatusUpdate(BaseModel):
    user_id: str
    is_active: bool

@api_router.get("/roles/available")
async def get_available_roles(current_user: User = Depends(get_current_user)):
    """Get list of available roles and their permissions"""
    roles = []
    
    if current_user.role == UserRole.SUPERADMIN:
        # Superadmin can see all roles
        role_list = [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER]
    elif current_user.role == UserRole.ADMIN:
        # Admin can manage Manager and Customer
        role_list = [UserRole.MANAGER, UserRole.CUSTOMER]
    else:
        role_list = []
    
    for role in role_list:
        roles.append({
            "role": role,
            "permissions": ROLE_PERMISSIONS.get(role, []),
            "description": get_role_description(role)
        })
    
    return roles

def get_role_description(role: str) -> str:
    descriptions = {
        UserRole.SUPERADMIN: "Full access to all features including user role management",
        UserRole.ADMIN: "Manage users, meters, transactions, and settings",
        UserRole.MANAGER: "View-only access to users, meters, and transactions",
        UserRole.CUSTOMER: "Manage own meters and purchase credits"
    }
    return descriptions.get(role, "")

@api_router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str, 
    role_update: UserRoleUpdate,
    current_user: User = Depends(require_permission(Permission.MANAGE_ROLES))
):
    """Update user role (Superadmin only)"""
    
    # Validate new role
    valid_roles = [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER]
    if role_update.new_role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Prevent changing own role
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent non-superadmin from creating superadmin
    if role_update.new_role == UserRole.SUPERADMIN and current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only Superadmin can create Superadmin users")
    
    # Update role
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role_update.new_role}}
    )
    
    logger.info(f"User {user_id} role updated to {role_update.new_role} by {current_user.email}")
    
    return {"message": "User role updated successfully", "user_id": user_id, "new_role": role_update.new_role}

@api_router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_user: User = Depends(require_permission(Permission.EDIT_USER))
):
    """Activate or deactivate user account"""
    
    # Prevent changing own status
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": status_update.is_active}}
    )
    
    status_text = "activated" if status_update.is_active else "deactivated"
    logger.info(f"User {user_id} {status_text} by {current_user.email}")
    
    return {"message": f"User {status_text} successfully", "user_id": user_id, "is_active": status_update.is_active}

@api_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.DELETE_USER))
):
    """Delete user (Superadmin only)"""
    
    # Prevent deleting own account
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    
    logger.info(f"User {user_id} deleted by {current_user.email}")
    
    return {"message": "User deleted successfully", "user_id": user_id}

@api_router.get("/permissions/me")
async def get_my_permissions(current_user: User = Depends(get_current_user)):
    """Get current user's permissions"""
    return {
        "user_id": current_user.id,
        "role": current_user.role,
        "permissions": ROLE_PERMISSIONS.get(current_user.role, [])
    }

# ============= SETTINGS ROUTES =============

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings_data = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings_data:
        settings_obj = Settings()
        settings_doc = settings_obj.model_dump()
        await db.settings.insert_one(settings_doc)
        return settings_obj
    
    return Settings(**settings_data)

@api_router.put("/settings/logo")
async def update_logo(file: UploadFile = File(...), current_user: User = Depends(require_permission(Permission.UPLOAD_LOGO))):
    contents = await file.read()
    base64_encoded = base64.b64encode(contents).decode('utf-8')
    logo_data = f"data:{file.content_type};base64,{base64_encoded}"
    
    await db.settings.update_one(
        {"id": "settings"},
        {"$set": {"logo_base64": logo_data}},
        upsert=True
    )
    
    return {"message": "Logo updated successfully", "logo_base64": logo_data}

@api_router.put("/settings/rate")
async def update_water_rate(water_rate: float, current_user: User = Depends(require_permission(Permission.MANAGE_RATES))):
    await db.settings.update_one(
        {"id": "settings"},
        {"$set": {"water_rate": water_rate}},
        upsert=True
    )
    
    return {"message": "Water rate updated successfully", "water_rate": water_rate}

# ============= SEEDING ADMIN =============

@app.on_event("startup")
async def seed_admin():
    # Create Superadmin
    superadmin_email = "superadmin@indowater.com"
    existing_superadmin = await db.users.find_one({"email": superadmin_email})
    if not existing_superadmin:
        superadmin_user = User(
            email=superadmin_email,
            name="Super Admin",
            role=UserRole.SUPERADMIN
        )
        superadmin_doc = superadmin_user.model_dump()
        superadmin_doc['created_at'] = superadmin_doc['created_at'].isoformat()
        superadmin_doc['hashed_password'] = hash_password("superadmin123")
        
        await db.users.insert_one(superadmin_doc)
        logger.info("Superadmin user created: superadmin@indowater.com / superadmin123")
    
    # Create Admin
    admin_email = "admin@indowater.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = User(
            email=admin_email,
            name="Admin",
            role=UserRole.ADMIN
        )
        admin_doc = admin_user.model_dump()
        admin_doc['created_at'] = admin_doc['created_at'].isoformat()
        admin_doc['hashed_password'] = hash_password("admin123")
        
        await db.users.insert_one(admin_doc)
        logger.info("Admin user created: admin@indowater.com / admin123")
    
    # Create Manager
    manager_email = "manager@indowater.com"
    existing_manager = await db.users.find_one({"email": manager_email})
    if not existing_manager:
        manager_user = User(
            email=manager_email,
            name="Manager",
            role=UserRole.MANAGER
        )
        manager_doc = manager_user.model_dump()
        manager_doc['created_at'] = manager_doc['created_at'].isoformat()
        manager_doc['hashed_password'] = hash_password("manager123")
        
        await db.users.insert_one(manager_doc)
        logger.info("Manager user created: manager@indowater.com / manager123")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()