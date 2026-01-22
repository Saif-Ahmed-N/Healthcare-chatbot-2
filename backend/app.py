from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from backend.config import settings
from backend.routers import auth, patient, admin
from backend.services.socket_manager import socket_manager
from backend.database import create_tables  # <--- IMPORT THIS

# 1. Initialize FastAPI (Use a different variable name temporarily)
fastapi_app = FastAPI(title=settings.PROJECT_NAME)

# 2. CORS Middleware
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount Routes
fastapi_app.include_router(auth.router)
fastapi_app.include_router(patient.router)
fastapi_app.include_router(admin.router)

# 4. STARTUP EVENT: Create Tables in Cloud DB
@fastapi_app.on_event("startup")
def on_startup():
    print("🚀 Server Starting... Creating Database Tables...")
    try:
        create_tables()
        print("✅ Database Tables Created Successfully!")
    except Exception as e:
        print(f"❌ Database Creation Failed: {e}")

# 5. Health Check
@fastapi_app.get("/")
def health_check():
    return {"status": "online", "message": "Healthcare Enterprise Platform is Running"}

# 6. Mount Socket.IO (Wrap the FastAPI app)
app = socketio.ASGIApp(socket_manager.server, other_asgi_app=fastapi_app)