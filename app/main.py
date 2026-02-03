from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
from .models import init_db
from .proxy import proxy_request
from .analyzer import analyze_behavior
from .advisor import generate_message
from .config import settings

app = FastAPI(title="API Watchdog", version="0.1.0")

# Add CORS middleware to allow communication with Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Import routes after initialization to avoid circular imports
from .routes import router
app.include_router(router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected"
    }

@app.post("/v1/chat/completions")
async def chat_proxy(request: Request):
    # Parse request body
    body = await request.json()
    project_id = request.headers.get("X-Project-ID", "default")
    provider = request.headers.get("X-Upstream-Provider", "openai")
    
    # Call proxy function
    try:
        response_data, status_code = await proxy_request(body, dict(request.headers), provider)
        
        # Return the proxied response with custom headers
        response = JSONResponse(content=response_data)
        
        # Add custom headers if available in response_data
        if isinstance(response_data, dict):
            if "x_advisor_message" in response_data:
                response.headers["X-Advisor-Message"] = str(response_data["x_advisor_message"])
            if "x_advisor_level" in response_data:
                response.headers["X-Advisor-Level"] = str(response_data["x_advisor_level"])
            if "x_total_cost_usd" in response_data:
                response.headers["X-Total-Cost-USD"] = str(response_data["x_total_cost_usd"])
            if "x_total_cost_cny" in response_data:
                response.headers["X-Total-Cost-CNY"] = str(response_data["x_total_cost_cny"])
            if "x_similarity_score" in response_data:
                response.headers["X-Similarity-Score"] = str(response_data["x_similarity_score"])
        
        return response
    except Exception as e:
        # Handle any errors in proxying
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": "Internal server error during proxying",
                    "type": "internal_error"
                }
            }
        )
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.server.host, port=settings.server.port)