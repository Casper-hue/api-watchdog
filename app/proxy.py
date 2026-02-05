import httpx
import asyncio
from typing import Dict, Any, AsyncGenerator, List
from .config import settings
from .models import Request, get_db
from sqlalchemy.orm import Session
import json
import uuid
from datetime import datetime, timedelta
from .analyzer import analyze_behavior
from .advisor import generate_message

async def proxy_request(request_body: Dict[str, Any], headers: Dict[str, str], provider: str = "openai"):
    """
    Proxy the request to the upstream API provider and analyze the interaction
    """
    # Determine the upstream URL based on provider
    upstream_urls = {
        "openai": settings.upstream.openai,
        "anthropic": settings.upstream.anthropic,
        "openrouter": settings.upstream.openrouter
    }
    
    upstream_url = upstream_urls.get(provider, upstream_urls["openai"])
    
    # Extract project_id from headers
    project_id = headers.get("X-Project-ID", "default")
    model = request_body.get("model", "gpt-4o")
    
    # Get the last user message for privacy consideration and storage
    last_user_message = ""
    for msg in reversed(request_body.get("messages", [])):
        if msg.get("role") == "user":
            last_user_message = msg.get("content", "")
            break
    
    # Analyze behavior using advanced multi-dimensional analysis
    analysis_result = analyze_behavior(project_id, request_body.get("messages", []), model)
    similarity_score = analysis_result["details"]["similarity"]
    pattern_score = analysis_result["details"]["emotion_score"]  # Using emotion score as pattern score for now
    advisor_level = analysis_result["level"]
    advisor_reasons = analysis_result["reasons"]
    advisor_details = analysis_result["details"]
    
    # Make the actual request to upstream API
    async with httpx.AsyncClient(timeout=settings.upstream.timeout) as client:
        try:
            # Prepare the request to upstream
            auth_header = headers.get("Authorization", "")
            upstream_headers = {
                "Content-Type": "application/json",
                "Authorization": auth_header
            }
            
            # Add provider-specific headers
            if provider == "anthropic":
                upstream_headers["x-api-key"] = auth_header.replace("Bearer ", "")
                upstream_headers["anthropic-version"] = "2023-06-01"
            
            # Forward the request to upstream API
            response = await client.post(
                f"{upstream_url}/v1/chat/completions",
                headers=upstream_headers,
                json=request_body
            )
            
            if response.status_code != 200:
                # Handle upstream errors
                return {"error": response.json()}, response.status_code
            
            # Parse the response
            response_data = response.json()
            
            # Calculate costs based on token usage
            usage = response_data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
            
            # Calculate cost based on model pricing
            cost_usd = calculate_cost(model, prompt_tokens, completion_tokens)
            
            # Store the request in database with privacy considerations
            # If privacy settings restrict storing content, only store metadata
            if settings.privacy.store_request_content:
                stored_prompt_text = last_user_message
            else:
                # If privacy is enabled, store a fingerprint instead of raw content.
                # "hash" is treated as simhash for similarity detection (backward compatible config).
                method = (settings.privacy.similarity_method or "hash").lower()
                if method in ("hash", "simhash"):
                    from .analyzer import compute_simhash_hex
                    stored_prompt_text = compute_simhash_hex(last_user_message) if last_user_message else None
                elif method in ("sha256", "sha-256"):
                    import hashlib
                    stored_prompt_text = hashlib.sha256(last_user_message.encode()).hexdigest() if last_user_message else None
                else:
                    # Default to simhash so analyzer can still detect repeats.
                    from .analyzer import compute_simhash_hex
                    stored_prompt_text = compute_simhash_hex(last_user_message) if last_user_message else None
            
            # Check for rate limiting based on hourly total cost BEFORE storing this request
            # This checks the cost BEFORE adding current request, so we need to add current cost
            from .routes import calculate_equivalents
            from .models import SessionLocal
            
            # Calculate total cost including current request
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            db_session = SessionLocal()
            try:
                recent_requests = db_session.query(Request).filter(
                    Request.project_id == project_id,
                    Request.timestamp > one_hour_ago
                ).all()
                total_hourly_cost = sum(req.total_cost_usd for req in recent_requests) + cost_usd
            finally:
                db_session.close()
            
            # Check if rate limiting should be triggered
            if settings.advisor.enable_rate_limit and total_hourly_cost > settings.advisor.max_cost_per_hour_usd:
                # Return 429 rate limit response
                cost_cny = total_hourly_cost * settings.pricing.exchange_rate_usd_to_cny
                equivalents = calculate_equivalents(cost_cny)
                
                return {
                    "error": {
                        "message": "检测到情绪化编程，建议休息20分钟",
                        "type": "rate_limit_exceeded",
                        "details": {
                            "cost_usd": round(total_hourly_cost, 2),
                            "cost_cny": round(cost_cny, 2),
                            "equivalents": equivalents,
                            "suggestions": ["去喝杯水", "看看官方文档", "休息一下再继续"]
                        }
                    }
                }, 429
            
            # Store the request in database
            store_request_in_db(
                request_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                project_id=project_id,
                provider=provider,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_cost_usd=cost_usd,
                similarity_score=similarity_score,
                pattern_score=pattern_score,
                prompt_text=stored_prompt_text,
                progress_indicator=advisor_details.get("progress", "unknown"),
                token_efficiency=(completion_tokens / prompt_tokens) if prompt_tokens > 0 else 0.0
            )
            
            # Update advisor level if needed (but don't trigger rate limit here, already checked above)
            if total_hourly_cost > settings.advisor.max_cost_per_hour_usd * 0.8:  # 80% threshold warning
                advisor_level = max(advisor_level, 3)  # Warning level, not rate limit
            
            advisor_message = generate_message(advisor_level, cost_usd, similarity_score, model=model)
            
            # Add custom headers to response
            response_data["x_advisor_message"] = advisor_message
            response_data["x_advisor_level"] = advisor_level
            response_data["x_total_cost_usd"] = cost_usd
            response_data["x_total_cost_cny"] = cost_usd * settings.pricing.exchange_rate_usd_to_cny
            response_data["x_similarity_score"] = similarity_score
            response_data["x_analysis_details"] = advisor_details  # Include analysis details
            
            return response_data, 200
            
        except Exception as e:
            # Log error and return error response
            print(f"Proxy error: {str(e)}")
            return {
                "error": {
                    "message": "Upstream API request failed",
                    "type": "upstream_error",
                    "upstream_status": getattr(e, 'status_code', 500)
                }
            }, 502


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """
    Calculate cost based on model pricing
    """
    model_pricing = settings.pricing.models.get(model, None)
    
    if not model_pricing:
        # Default to gpt-4o pricing if model not found
        model_pricing = settings.pricing.models.get("gpt-4o", {"input": 0.0025, "output": 0.010})
    
    # Ensure model_pricing is a dictionary with input/output keys
    if isinstance(model_pricing, dict):
        input_price = model_pricing.get("input", 0.0)
        output_price = model_pricing.get("output", 0.0)
    else:
        # Fallback if pricing is not in expected format
        input_price = 0.0025
        output_price = 0.010
    
    input_cost = (prompt_tokens / 1000) * input_price
    output_cost = (completion_tokens / 1000) * output_price
    
    return round(input_cost + output_cost, 6)


def determine_advisor_level(similarity_score: float, pattern_score: int, cost_usd: float) -> int:
    """
    Determine advisor level based on similarity, pattern score and cost
    """
    if cost_usd > settings.advisor.max_cost_per_hour_usd:
        return 4  # Level 4: Rate limiting
    elif similarity_score > settings.analyzer.similarity_threshold_critical and pattern_score >= 5:
        return 3  # Level 3: Severe warning
    elif similarity_score > settings.analyzer.similarity_threshold_warning and pattern_score >= 3:
        return 2  # Level 2: Warning
    elif pattern_score >= 1 and cost_usd > 0.5:
        return 1  # Level 1: Investment notice
    else:
        return 0  # Level 0: Normal operation


def get_recent_requests_for_analysis(project_id: str, limit: int = 5):
    """
    Get recent requests for similarity analysis
    """
    from .models import get_db
    db = next(get_db())
    try:
        recent_requests = db.query(Request).filter(
            Request.project_id == project_id
        ).order_by(Request.timestamp.desc()).limit(limit).all()
        return recent_requests
    finally:
        db.close()


def store_request_in_db(request_id: str, timestamp: datetime, project_id: str, 
                       provider: str, model: str, prompt_tokens: int, 
                       completion_tokens: int, total_cost_usd: float, 
                       similarity_score: float, pattern_score: int, prompt_text: str,
                       progress_indicator: str = "unknown", token_efficiency: float = 0.0):
    """
    Store request data in database
    """
    from .models import get_db, Request
    db = next(get_db())
    try:
        request_record = Request(
            id=request_id,
            timestamp=timestamp,
            project_id=project_id,
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_cost_usd=total_cost_usd,
            similarity_score=similarity_score,
            pattern_score=pattern_score,
            advisor_level=0,  # Will be set during analysis
            prompt_text=prompt_text,  # Store the prompt text for similarity analysis
            progress_indicator=progress_indicator,
            token_efficiency=token_efficiency
        )
        db.add(request_record)
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


async def parse_tokens_from_stream(chunks: list) -> Dict[str, int]:
    """
    Parse token usage from SSE stream chunks
    """
    total_prompt_tokens = 0
    total_completion_tokens = 0
    total_tokens = 0
    
    for chunk in chunks:
        try:
            # Decode the chunk if it's bytes
            if isinstance(chunk, bytes):
                chunk_str = chunk.decode('utf-8')
            else:
                chunk_str = str(chunk)
                
            # Check if this is a data line in SSE format
            if chunk_str.startswith('data: ') and 'DONE' not in chunk_str:
                # Remove 'data: ' prefix
                data_part = chunk_str[6:].strip()
                
                # Skip empty lines
                if not data_part:
                    continue
                    
                # Parse JSON
                import json
                parsed_data = json.loads(data_part)
                
                # Extract usage information
                if 'usage' in parsed_data:
                    usage = parsed_data['usage']
                    total_prompt_tokens = usage.get('prompt_tokens', 0)
                    total_completion_tokens = usage.get('completion_tokens', 0)
                    total_tokens = usage.get('total_tokens', 0)
                    
        except (json.JSONDecodeError, KeyError, AttributeError):
            # Skip malformed chunks
            continue
    
    return {
        "prompt_tokens": total_prompt_tokens,
        "completion_tokens": total_completion_tokens,
        "total_tokens": total_tokens
    }


# Note: We're commenting out the stream_proxy_response function for now to avoid the syntax error
# async def stream_proxy_response(request_body: Dict[str, Any], headers: Dict[str, str], provider: str = "openai"):
#     """
#     Stream the response from upstream API while capturing usage data
#     """
#     upstream_urls = {
#         "openai": settings.upstream.openai,
#         "anthropic": settings.upstream.anthropic,
#         "openrouter": settings.upstream.openrouter
#     }
    
#     upstream_url = upstream_urls.get(provider, upstream_urls["openai"])
    
#     # Extract project_id and model
#     project_id = headers.get("X-Project-ID", "default")
#     model = request_body.get("model", "gpt-4o")
    
#     # Get recent requests for similarity analysis
#     recent_requests = get_recent_requests_for_analysis(project_id)
    
#     # Calculate similarity
#     similarity_score = 0.0
#     last_user_message = ""
#     for msg in reversed(request_body.get("messages", [])):
#         if msg.get("role") == "user":
#             last_user_message = msg.get("content", "")
#             break
    
#     if recent_requests and last_user_message and recent_requests[0].prompt_text:
#         similarity_score = calculate_similarity(last_user_message, recent_requests[0].prompt_text)
    
#     # Extract pattern score
#     pattern_score = extract_pattern_score(request_body.get("messages", []))
    
#     # Prepare for streaming
#     async with httpx.AsyncClient(timeout=settings.upstream.timeout) as client:
#         auth_header = headers.get("Authorization", "")
#         upstream_headers = {
#             "Content-Type": "application/json",
#             "Authorization": auth_header
#         }
        
#         if provider == "anthropic":
#             upstream_headers["x-api-key"] = auth_header.replace("Bearer ", "")
#             upstream_headers["anthropic-version"] = "2023-06-01"
        
#         # Make streaming request to upstream
#         upstream_response = await client.stream(
#             "POST",
#             f"{upstream_url}/v1/chat/completions",
#             headers=upstream_headers,
#             json=request_body
#         )
        
#         # Process the stream
#         async with upstream_response:
#             if upstream_response.status_code != 200:
#                 yield f"data: {json.dumps({'error': await upstream_response.json()})}\n\n"
#                 return  # This is fine in an async generator, just return without a value
            
#             # Buffer to collect usage data
#             collected_chunks = []
#             async for chunk in upstream_response.aiter_bytes():
#                 collected_chunks.append(chunk)
#                 yield chunk
        
#         # After stream is complete, calculate usage and store in DB
#         usage_data = await parse_tokens_from_stream(collected_chunks)
        
#         if usage_data["total_tokens"] > 0:
#             cost_usd = calculate_cost(model, usage_data["prompt_tokens"], usage_data["completion_tokens"])
            
#             # Store the request in database
#             store_request_in_db(
#                 request_id=str(uuid.uuid4()),
#                 timestamp=datetime.utcnow(),
#                 project_id=project_id,
#                 provider=provider,
#                 model=model,
#                 prompt_tokens=usage_data["prompt_tokens"],
#                 completion_tokens=usage_data["completion_tokens"],
#                 total_cost_usd=cost_usd,
#                 similarity_score=similarity_score,
#                 pattern_score=pattern_score,
#                 prompt_text=last_user_message
#             )
            
#             # Generate advisor message
#             advisor_level = determine_advisor_level(similarity_score, pattern_score, cost_usd)
#             advisor_message = generate_message(advisor_level, cost_usd, similarity_score, model=model)
            
#             # Send final metadata
#             metadata = {
#                 "x_advisor_message": advisor_message,
#                 "x_advisor_level": advisor_level,
#                 "x_total_cost_usd": cost_usd,
#                 "x_total_cost_cny": cost_usd * settings.pricing.exchange_rate_usd_to_cny,
#                 "x_similarity_score": similarity_score
#             }
            
#             yield f"data: {json.dumps({'metadata': metadata})}\n\n"


async def save_request_to_db(db: Session, request_data: Dict[str, Any]):
    """
    Save request data to database
    """
    db_request = Request(**request_data)
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request