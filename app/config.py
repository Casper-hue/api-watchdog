from pydantic_settings import BaseSettings
from typing import Dict, List
from typing import Optional
import yaml
import os

class ServerConfig(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

class UpstreamConfig(BaseSettings):
    openai: str = "https://api.openai.com"
    anthropic: str = "https://api.anthropic.com"
    openrouter: str = "https://openrouter.ai/api"
    custom: str = ""
    timeout: int = 120

class PricingConfig(BaseSettings):
    exchange_rate_usd_to_cny: float = 7.3
    coffee_price_cny: float = 15
    jianbing_price_cny: float = 8
    meal_price_cny: float = 50
    hotpot_price_cny: float = 120
    
    models: Dict[str, Dict[str, float]] = {
        "gpt-4o": {
            "input": 0.0025,
            "output": 0.010
        },
        "claude-sonnet-3.5-20241022": {
            "input": 0.003,
            "output": 0.015,
        },
        "deepseek-chat": {
            "input": 0.00014,
            "output": 0.00028
        }
    }

class AnalyzerConfig(BaseSettings):
    similarity_threshold_warning: float = 0.75
    similarity_threshold_critical: float = 0.85
    pattern_keywords: Dict[str, List[str]] = {
        "debug": ["error", "bug", "fix", "修复", "报错"],
        "repeat": ["same", "still", "一样", "还是"]
    }
    # Model-specific profiles for different behaviors
    model_profiles: Dict[str, Dict[str, float]] = {
        "claude-opus-4": {
            "similarity_threshold": 0.90,  # More strict, as Claude typically gives complete answers
            "max_retries": 2
        },
        "claude-sonnet-4": {
            "similarity_threshold": 0.85,
            "max_retries": 3
        },
        "claude-haiku-3": {
            "similarity_threshold": 0.80,
            "max_retries": 4
        },
        "gpt-4o": {
            "similarity_threshold": 0.75,
            "max_retries": 4
        },
        "gpt-4o-mini": {
            "similarity_threshold": 0.70,
            "max_retries": 5
        },
        "o1-preview": {
            "similarity_threshold": 0.80,
            "max_retries": 3
        },
        "o1-mini": {
            "similarity_threshold": 0.75,
            "max_retries": 4
        }
    }

class PrivacyConfig(BaseSettings):
    store_request_content: bool = False
    similarity_method: str = "hash"
    cache_ttl_seconds: int = 3600
    anonymize_project_id: bool = True

class AdvisorConfig(BaseSettings):
    enable_rate_limit: bool = True
    max_cost_per_hour_usd: float = 5.0
    cooldown_minutes: int = 20
    webhook_url: Optional[str] = ""

class Settings(BaseSettings):
    server: ServerConfig = ServerConfig()
    upstream: UpstreamConfig = UpstreamConfig()
    pricing: PricingConfig = PricingConfig()
    analyzer: AnalyzerConfig = AnalyzerConfig()
    privacy: PrivacyConfig = PrivacyConfig()
    advisor: AdvisorConfig = AdvisorConfig()

# Global settings instance
settings = Settings()

# Load from config.yaml if exists
config_file = "config.yaml"
if os.path.exists(config_file):
    with open(config_file, "r", encoding='utf-8') as f:
        yaml_config = yaml.safe_load(f)
        # Override defaults with YAML config
        if yaml_config:
            # Update pricing settings
            if 'pricing' in yaml_config:
                pricing_config = yaml_config['pricing']
                if 'exchange_rate_usd_to_cny' in pricing_config:
                    settings.pricing.exchange_rate_usd_to_cny = pricing_config['exchange_rate_usd_to_cny']
                if 'equivalents' in pricing_config:
                    equiv = pricing_config['equivalents']
                    if 'coffee' in equiv:
                        settings.pricing.coffee_price_cny = equiv['coffee']
                    if 'jianbing' in equiv:
                        settings.pricing.jianbing_price_cny = equiv['jianbing']
                if 'models' in pricing_config:
                    settings.pricing.models = pricing_config['models']
            
            # Update analyzer settings
            if 'analyzer' in yaml_config:
                analyzer_config = yaml_config['analyzer']
                if 'similarity_threshold_warning' in analyzer_config:
                    settings.analyzer.similarity_threshold_warning = analyzer_config['similarity_threshold_warning']
                if 'similarity_threshold_critical' in analyzer_config:
                    settings.analyzer.similarity_threshold_critical = analyzer_config['similarity_threshold_critical']
                if 'pattern_keywords' in analyzer_config:
                    settings.analyzer.pattern_keywords = analyzer_config['pattern_keywords']
            
            # Update advisor settings
            if 'advisor' in yaml_config:
                advisor_config = yaml_config['advisor']
                if 'max_cost_per_hour_usd' in advisor_config:
                    settings.advisor.max_cost_per_hour_usd = advisor_config['max_cost_per_hour_usd']
                if 'cooldown_minutes' in advisor_config:
                    settings.advisor.cooldown_minutes = advisor_config['cooldown_minutes']
                if 'enable_rate_limit' in advisor_config:
                    settings.advisor.enable_rate_limit = advisor_config['enable_rate_limit']
                if 'webhook_url' in advisor_config:
                    settings.advisor.webhook_url = advisor_config['webhook_url']
            
            # Update upstream settings
            if 'upstream' in yaml_config:
                upstream_config = yaml_config['upstream']
                if 'openai' in upstream_config:
                    openai_config = upstream_config['openai']
                    if isinstance(openai_config, str):
                        settings.upstream.openai = openai_config
                    elif isinstance(openai_config, dict) and 'base_url' in openai_config:
                        settings.upstream.openai = openai_config['base_url']
                if 'anthropic' in upstream_config:
                    anth_config = upstream_config['anthropic']
                    if isinstance(anth_config, str):
                        settings.upstream.anthropic = anth_config
                    elif isinstance(anth_config, dict) and 'base_url' in anth_config:
                        settings.upstream.anthropic = anth_config['base_url']
                if 'openrouter' in upstream_config:
                    or_config = upstream_config['openrouter']
                    if isinstance(or_config, str):
                        settings.upstream.openrouter = or_config
                    elif isinstance(or_config, dict) and 'base_url' in or_config:
                        settings.upstream.openrouter = or_config['base_url']
                if 'custom' in upstream_config:
                    custom_config = upstream_config['custom']
                    if isinstance(custom_config, dict) and 'base_url' in custom_config:
                        settings.upstream.custom = custom_config['base_url']