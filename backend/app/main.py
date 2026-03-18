from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import logging

from .middleware.logging import LoggingMiddleware
from . import database

# Import all routers
from .endpoints import (
    dashboard,
    abc,
    auth,
    cross_sell,
    customer_behaviour,
    customer_trend,
    article_behaviour,
    top_performance,
    ticket_size,
    forecast,
    transition_analysis,
    cba,
    customer_class_comparison,
    customer_product,
    customer_comparison,
    masters,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for database connection pool.
    Replaces deprecated @app.on_event("startup") and @app.on_event("shutdown")
    """
    # Startup: Initialize database connection pool
    database.init_db()
    logging.info("Application startup complete - Database pool initialized")

    yield

    # Shutdown: Close database connection pool
    database.close_db()
    logging.info("Application shutdown complete - Database pool closed")


app = FastAPI(
    title="Sphoorti Analytics API",
    description="Backend API for Sphoorti Analytics Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging middleware
app.add_middleware(LoggingMiddleware)


# Include all routers
app.include_router(auth.router)  # Auth router should be first (no auth required)
app.include_router(masters.router)
app.include_router(dashboard.router)
app.include_router(abc.router)
app.include_router(cross_sell.router)
app.include_router(customer_behaviour.router)
app.include_router(customer_trend.router)
app.include_router(article_behaviour.router)
app.include_router(top_performance.router)
app.include_router(ticket_size.router)
app.include_router(forecast.router)
app.include_router(transition_analysis.router)
app.include_router(cba.router)
app.include_router(customer_class_comparison.router)
app.include_router(customer_product.router)
app.include_router(customer_comparison.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Spoorthi Analytics API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "okay"}
