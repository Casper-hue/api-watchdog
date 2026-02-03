/**
 * API数据契约 - 前端类型定义
 * 从 contracts/api.types.ts 同步
 */

// ============================================
// 通用类型
// ============================================

/** 货币等价物 */
export interface CurrencyEquivalents {
  coffee_cups: number;      // 咖啡杯数
  jianbing_sets: number;    // 煎饼果子套数
  meal_equivalent: string;  // 餐食等价描述
  hotpot_meals: number;     // 火锅次数
}

/** 时间范围 */
export interface TimePeriod {
  start: string;  // ISO 8601格式: "2024-02-01T00:00:00Z"
  end: string;
  hours: number;
}

/** 项目基本信息 */
export interface ProjectInfo {
  id: string;
  name: string;
  total_requests: number;
  total_cost_usd: number;
  total_cost_cny: number;
  last_activity: string; // ISO 8601
}

// ============================================
// Dashboard API
// ============================================

/** GET /api/dashboard/summary 响应 */
export interface DashboardSummary {
  today: {
    total_cost_usd: number;
    total_cost_cny: number;
    equivalents: CurrencyEquivalents;
    change_percent: number;  // 相比昨天的变化百分比，正数表示上涨
  };
  week: {
    total_cost_usd: number;
    total_cost_cny: number;
    equivalents: CurrencyEquivalents;
    change_percent: number;
  };
  active_projects: number;
  warning_count: number;  // 本周警告次数
}

// ============================================
// 项目统计 API
// ============================================

/** GET /api/projects 响应 */
export interface ProjectList {
  projects: ProjectInfo[];
}

/** GET /api/projects/{id}/stats 响应 */
export interface ProjectStats {
  project_id: string;
  period: TimePeriod;
  total_requests: number;
  total_cost_usd: number;
  total_cost_cny: number;
  equivalents: CurrencyEquivalents;
  model_breakdown: ModelBreakdown[];
  daily_trend: DailyDataPoint[];
}

export interface ModelBreakdown {
  model: string;
  requests: number;
  total_cost_usd: number;
  percentage: number;
  avg_cost: number;
}

export interface DailyDataPoint {
  date: string;           // "2024-02-01"
  total_cost_usd: number;
  breakdown_by_model: {
    [model: string]: number;  // 例: {"gpt-4o": 2.5, "claude-opus": 1.2}
  };
}

// ============================================
// 活动流 API
// ============================================

/** GET /api/activities/recent?limit=10 响应 */
export interface ActivityFeed {
  activities: Activity[];
  has_more: boolean;
}

export interface Activity {
  id: string;
  timestamp: string;  // ISO 8601
  project_id: string;
  level: 0 | 1 | 2 | 3 | 4;  // 警告等级
  message: string;            // 顾问文案
  details: {
    cost_usd: number;
    cost_cny: number;
    similarity_score?: number;  // 仅Level 2+存在
    efficiency_rating?: "A" | "B" | "C" | "D" | "F";  // 仅Level 1存在
    cooldown_seconds?: number;  // 仅Level 4存在
  };
}

// ============================================
// 反馈 API
// ============================================

/** POST /api/feedback 请求 */
export interface FeedbackRequest {
  request_id: string;
  is_accurate: 0 | 1;  // 0: 不准确, 1: 准确
  message?: string;
  project_id: string;
}

/** POST /api/feedback 响应 */
export interface FeedbackResponse {
  success: boolean;
  message: string;
}

// ============================================
// 错误类型
// ============================================

export interface ApiError {
  error: string;
  message: string;
  status_code: number;
}