from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        url = request.url.path

        logger.info(f"Request: {method} {url} from {client_ip}")

        response = await call_next(request)

        status_code = response.status_code
        logger.info(f"Response: {method} {url} returned {status_code} to {client_ip}")

        return response