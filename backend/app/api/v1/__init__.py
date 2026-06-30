from fastapi import APIRouter
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.datasets import router as datasets_router
from app.api.v1.routes.analytics import router as analytics_router
from app.api.v1.routes.intelligence import router as intelligence_router
from app.api.v1.routes.organizations import router as organizations_router
from app.api.v1.routes.saved_queries import router as saved_queries_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(datasets_router)
api_router.include_router(analytics_router)
api_router.include_router(intelligence_router)
api_router.include_router(organizations_router)
api_router.include_router(saved_queries_router)
