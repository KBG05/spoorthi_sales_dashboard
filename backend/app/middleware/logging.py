from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time

logging.basicConfig(
    filename="app.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        url = request.url.path

        logger.info(f"Request: {method} {url} from {client_ip}")

        response = await call_next(request)
        
        request_time = time.time() - start_time
        status_code = response.status_code
        logger.info(
            f"Response: {method} {url} returned {status_code} to {client_ip} "
            f"(took {request_time:.3f}s)"
        )

        return response