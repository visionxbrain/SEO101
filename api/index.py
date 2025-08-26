"""
Vercel Serverless Handler for SEO101 Backend
"""
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.blog_link_checker import router as blog_link_checker_router
from backend.blog_link_checker_stream import router as blog_link_checker_stream_router
from backend.schema_markup_checker import router as schema_markup_checker_router
from backend.schema_markup_checker_stream import router as schema_markup_checker_stream_router
from backend.heading_structure_analyzer import router as heading_structure_router
from backend.schema_generator_v2 import router as schema_v2_router

# Import main app functions from backend
import backend.app as backend_app

# Create FastAPI app
app = FastAPI()

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# Include routers
app.include_router(blog_link_checker_router)
app.include_router(blog_link_checker_stream_router)
app.include_router(schema_markup_checker_router)
app.include_router(schema_markup_checker_stream_router)
app.include_router(heading_structure_router)
app.include_router(schema_v2_router)

# Mount backend endpoints
@app.get("/")
async def root():
    return {"message": "SEO101 API - Vercel Deployment"}

@app.post("/api/upload-csv")
async def upload_csv(request: Request):
    return await backend_app.upload_csv(request)

@app.post("/api/check-urls")
async def check_urls(request: dict):
    return await backend_app.check_urls(request)

@app.post("/api/test-sitemap")
async def test_sitemap(request: dict):
    return await backend_app.test_sitemap(request)