/**
 * API数据契约
 * 前后端必须严格遵守这个格式
 */

// ============================================
// 通用类型
// ============================================

/** 货币等价物 */
export interface CurrencyEquivalents {
  coffee_cups: number;      // 咖啡杯数
  jianbing_sets: number;    // 煎饼果子套数
  meal_meals: number;       // 正餐次数
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

/** 示例响应 */
export const EXAMPLE_DASHBOARD_SUMMARY: DashboardSummary = {
  today: {
    total_cost_usd: 12.35,
    total_cost_cny: 90.16,
    equivalents: {
    coffee_cups: 6.01,
    jianbing_sets: 11.27,
    meal_meals: 1.80,
    meal_equivalent: "一顿大餐",
    hotpot_meals: 0.75
  },
    change_percent: 15.2
  },
  week: {
    total_cost_usd: 89.20,
    total_cost_cny: 651.16,
    equivalents: {
    coffee_cups: 43.41,
    jianbing_sets: 81.40,
    meal_meals: 13.02,
    meal_equivalent: "一顿海底捞",
    hotpot_meals: 5.43
  },
    change_percent: -8.3
  },
  active_projects: 3,
  warning_count: 5
};

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

/** 示例响应 */
export const EXAMPLE_ACTIVITY_FEED: ActivityFeed = {
  activities: [
    {
      id: "act_abc123",
      timestamp: "2024-02-01T14:23:45Z",
      project_id: "my-app",
      level: 2,
      message: "又是这个错误？已经烧了3个煎饼果子了🥞",
      details: {
        cost_usd: 0.12,
        cost_cny: 0.88,
        similarity_score: 0.78
      }
    },
    {
      id: "act_def456",
      timestamp: "2024-02-01T14:08:30Z",
      project_id: "cursor-project",
      level: 1,
      message: "不错哦，这钱花得有章法 ☕",
      details: {
        cost_usd: 0.08,
        cost_cny: 0.58,
        efficiency_rating: "A"
      }
    }
  ],
  has_more: true
};

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

export const EXAMPLE_API_ERROR: ApiError = {
  error: "NOT_FOUND",
  message: "项目不存在",
  status_code: 404
};