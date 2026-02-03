'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TranslationKeys {
  // Navigation
  dashboard: string;
  statistics: string;
  projects: string;
  settings: string;
  
  // Statistics Page
  modelCostComparison: string;
  breakdownByModelUsage: string;
  model: string;
  requests: string;
  totalCost: string;
  avgCost: string;
  share: string;
  
  // Efficiency Report
  efficiencyReport: string;
  weeklyEfficiencyRating: string;
  monthlyEfficiencyRating: string;
  quarterlyEfficiencyRating: string;
  whatYoureDoingWell: string;
  improvementSuggestions: string;
  
  // Chart Labels
  consumptionTrends: string;
  past7Days: string;
  past30Days: string;
  past90Days: string;
  
  // Time Range
  today: string;
  week: string;
  month: string;
  quarter: string;
  
  // Activity Feed
  recentActivity: string;
  loadingActivities: string;
  latestApiInteractions: string;
  showLess: string;
  viewAll: string;
  costLabel: string;
  warningsCount: string;
  activeProjectsLimit: string;
  dailySpendVsBudget: string;
  weeklySpendVsBudget: string;
  activeProjectsVsLimit: string;
  warningsVsThreshold: string;
  dashboardSettings: string;
  saveSettings: string;
  pricingCurrencySettings: string;
  privacySecuritySettings: string;
  saveAllSettings: string;
  coffeePrice: string;
  jianbingPrice: string;
  mealPrice: string;
  hotpotPrice: string;
  inputPrice: string;
  outputPrice: string;
  storeRequestContent: string;
  similarityDetectionMethod: string;
  loadOfficial: string;
  addModel: string;
  modelName: string;
  price: string;
  action: string;
  apiKey: string;
  baseUrl: string;
  updateAll: string;
  hashBased: string;
  textBased: string;
  cacheTTL: string;
  cacheExpirationTime: string;
  anonymizeProjectIDs: string;
  applySHA256: string;
  coffee: string;
  jianbing: string;
  meal: string;
  hotpot: string;
  todayBudget: string;
  weekBudget: string;
  activeProj: string;
  recording: string;
  similarityLabel: string;
  efficiencyLabel: string;
  rateLimitedLabel: string;

  // Other UI elements
  exportCSV: string;
  loading: string;
  noData: string;
  readyToAnalyze: string;
  startMakingAPICalls: string;
  alerts: string;
  configureBaselineValues: string;
  analyzeAPIPatterns: string;
  sarcasticAccountantAssessment: string;
  efficiencyRoomForImprovement: string;
  configureGlobalSettings: string;
  configureExchangeRatesAndModelPricing: string;
  usdToCnyExchangeRate: string;
  modelPricingConfiguration: string;
  setPricingForModels: string;
  configureDataHandlingPrivacy: string;
  storeRequestContentForAnalysis: string;
  teams: string;
  period: string;
  feedTheMachineMessage: string;
  aiLandlordMessage: string;
  countingCostMessage: string;
  auditingPatriarchyMessage: string;
  manicPixieMessage: string;
  notJudgingMessage: string;
  calculatingDistanceMessage: string;
  anotherDayMessage: string;
  percentProgressMessage: string;
  monitorProjectSpending: string;
  createdDate: string;
  activeStatus: string;
  totalConsumption: string;
  equivalentToCoffeeCups: string;
  monthlyTrend: string;
  usageAnalysis: string;
  equivalentTo: string;
  debugMode: string;
  developmentMode: string;
  optimizationMode: string;
  
  // Model names stay in English (as these are technical terms)
  // gpt4o: string;
  // gpt4omini: string;
  // claude3opus: string;
  // claude3sonnet: string;
  // gpt35turbo: string;
}

const enTranslations: TranslationKeys = {
  dashboard: 'Dashboard',
  statistics: 'Statistics',
  projects: 'Projects',
  settings: 'Settings',
  modelCostComparison: 'Model Cost Comparison',
  breakdownByModelUsage: 'Breakdown by model usage',
  model: 'Model',
  requests: 'Requests',
  totalCost: 'Total Cost',
  avgCost: 'Avg Cost',
  share: 'Share',
  efficiencyReport: 'Efficiency Report',
  weeklyEfficiencyRating: 'Weekly Efficiency Rating',
  monthlyEfficiencyRating: 'Monthly Efficiency Rating',
  quarterlyEfficiencyRating: 'Quarterly Efficiency Rating',
  whatYoureDoingWell: 'What you\'re doing well',
  improvementSuggestions: 'Improvement suggestions',
  consumptionTrends: 'CONSUMPTION TRENDS',
  past7Days: 'PAST 7 DAYS',
  past30Days: 'PAST 30 DAYS',
  past90Days: 'PAST 90 DAYS',
  today: 'Today',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  // Activity Feed
  recentActivity: 'RECENT ACTIVITY',
  loadingActivities: 'LOADING ACTIVITIES...',
  latestApiInteractions: 'LATEST API INTERACTIONS',
  showLess: 'SHOW LESS',
  viewAll: 'VIEW ALL',
  costLabel: 'COST:',
  warningsCount: 'Warnings',
  activeProjectsLimit: 'Active Projects Limit',
  dailySpendVsBudget: 'Daily Spend vs Budget',
  weeklySpendVsBudget: 'Weekly Spend vs Budget',
  activeProjectsVsLimit: 'Active Projects vs Limit',
  warningsVsThreshold: 'Warnings vs Threshold',
  dashboardSettings: 'Dashboard Settings',
  configureBaselineValues: 'Configure baseline values for dashboard meters',
  teams: 'teams',
  period: 'period',
  feedTheMachineMessage: 'Feed the Machine, or feed yourself. Choose wisely.',
  aiLandlordMessage: 'Your AI landlord is here for the rent.',
  countingCostMessage: 'Counting the cost of digital existence.',
  auditingPatriarchyMessage: 'Auditing the patriarchy, one token at a time.',
  manicPixieMessage: 'Not a manic pixie dream girl, just a broke developer.',
  notJudgingMessage: 'I\'m not judging your spending, the algorithm is.',
  calculatingDistanceMessage: 'Calculating the distance between vibes and bills.',
  anotherDayMessage: 'Another day, another dollar... for Sam Altman.',
  percentProgressMessage: '0% progress, 100% fun.',
  monitorProjectSpending: 'Monitor and configure your project spending.',
  createdDate: 'Created',
  activeStatus: 'Active',
  totalConsumption: 'Total Consumption',
  equivalentToCoffeeCups: 'coffee cups',
  monthlyTrend: 'Monthly Trend',
  usageAnalysis: 'Usage Analysis',
  equivalentTo: 'Equivalent to',
  debugMode: 'Debug',
  developmentMode: 'Development',
  optimizationMode: 'Optimization',
  saveSettings: 'Save Settings',
  pricingCurrencySettings: 'Pricing & Currency Settings',
  privacySecuritySettings: 'Privacy & Security Settings',
  saveAllSettings: 'Save All Settings',
  coffeePrice: 'Coffee Price (CNY)',
  jianbingPrice: 'Jianbing Price (CNY)',
  mealPrice: 'Meal Price (CNY)',
  hotpotPrice: 'Hotpot Price (CNY)',
  inputPrice: 'Input Price ($)',
  outputPrice: 'Output Price ($)',
  storeRequestContent: 'Store Request Content',
  similarityDetectionMethod: 'Similarity Detection Method',
  loadOfficial: 'Load Official',
  addModel: 'Add Model',
  modelName: 'Model Name',
  price: 'Price',
  action: 'Action',
  apiKey: 'API Key',
  baseUrl: 'Base URL',
  updateAll: 'Update All',
  hashBased: 'Hash-based (More Private)',
  textBased: 'Text-based (More Accurate)',
  cacheTTL: 'Cache TTL (seconds)',
  cacheExpirationTime: 'Cache expiration time',
  anonymizeProjectIDs: 'Anonymize Project IDs',
  applySHA256: 'Apply SHA256 hashing to project identifiers',
  coffee: 'COFFEE',
  jianbing: 'JIANBING',
  meal: 'MEAL',
  hotpot: 'HOTPOT',
  todayBudget: "Today's Budget ($)",
  weekBudget: "Week's Budget ($)",
  activeProj: 'ACTIVE PROJ',
  recording: 'RECORDING',
  similarityLabel: 'SIMILARITY:',
  efficiencyLabel: 'EFFICIENCY:',
  rateLimitedLabel: 'RATE LIMITED:',
  exportCSV: 'Export CSV',
  loading: 'Loading...',
  noData: 'No data yet',
  readyToAnalyze: 'Ready to analyze your API usage patterns',
  startMakingAPICalls: 'Start making API calls to get personalized efficiency insights',
  alerts: 'Alerts',
  analyzeAPIPatterns: 'Analyze your API usage patterns and efficiency.',
  sarcasticAccountantAssessment: 'Your sarcastic accountant\'s assessment',
  efficiencyRoomForImprovement: 'Room for improvement, but not bad.',
  configureGlobalSettings: 'Configure global settings for API monitoring and analysis.',
  configureExchangeRatesAndModelPricing: 'Configure exchange rates and model pricing',
  usdToCnyExchangeRate: 'USD to CNY Exchange Rate',
  modelPricingConfiguration: 'Model Pricing Configuration',
  setPricingForModels: 'Set pricing for different AI models (per 1M tokens)',
  configureDataHandlingPrivacy: 'Configure data handling and privacy preferences',
  storeRequestContentForAnalysis: 'Store the actual content of API requests for analysis',
};

const zhTranslations: TranslationKeys = {
  dashboard: '仪表板',
  statistics: '统计',
  projects: '项目',
  settings: '设置',
  modelCostComparison: '模型成本对比',
  breakdownByModelUsage: '按模型使用情况分解',
  model: '模型',
  requests: '请求次数',
  totalCost: '总费用',
  avgCost: '平均费用',
  share: '占比',
  efficiencyReport: '效率报告',
  weeklyEfficiencyRating: '每周效率评级',
  monthlyEfficiencyRating: '每月效率评级',
  quarterlyEfficiencyRating: '每季度效率评级',
  whatYoureDoingWell: '表现良好的方面',
  improvementSuggestions: '改进建议',
  consumptionTrends: '消费趋势',
  past7Days: '过去7天',
  past30Days: '过去30天',
  past90Days: '过去90天',
  today: '今天',
  week: '本周',
  month: '本月',
  quarter: '本季度',
  // Activity Feed
  recentActivity: '近期活动',
  loadingActivities: '正在加载活动...',
  latestApiInteractions: '最新API交互',
  showLess: '收起',
  viewAll: '查看全部',
  costLabel: '费用:',
  warningsCount: '警告',
  activeProjectsLimit: '活跃项目限制',
  dailySpendVsBudget: '每日支出与预算',
  weeklySpendVsBudget: '每周支出与预算',
  activeProjectsVsLimit: '活跃项目与限制',
  warningsVsThreshold: '警告与阈值',
  dashboardSettings: '仪表板设置',
  configureBaselineValues: '配置仪表板计量器的基线值',
  teams: '团队',
  period: '期间',
  feedTheMachineMessage: '喂养机器，或喂养自己。明智选择。',
  aiLandlordMessage: '您的AI房东来收房租了。',
  countingCostMessage: '计算数字存在的代价。',
  auditingPatriarchyMessage: '一次一个token地审查父权制。',
  manicPixieMessage: '不是曼奇派梦女孩，只是一个穷困的开发者。',
  notJudgingMessage: '我不是在评判你的消费，是算法在评判。',
  calculatingDistanceMessage: '计算氛围和账单之间的距离。',
  anotherDayMessage: '又是一天，又是一块钱……给Sam Altman。',
  percentProgressMessage: '0%进度，100%乐趣。',
  monitorProjectSpending: '监控和配置您的项目支出。',
  createdDate: '创建于',
  activeStatus: '活跃',
  totalConsumption: '总消耗量',
  equivalentToCoffeeCups: '杯咖啡',
  monthlyTrend: '月度趋势',
  usageAnalysis: '使用情况分析',
  equivalentTo: '相当于',
  debugMode: '调试',
  developmentMode: '开发',
  optimizationMode: '优化',
  saveSettings: '保存设置',
  pricingCurrencySettings: '定价与货币设置',
  privacySecuritySettings: '隐私与安全设置',
  saveAllSettings: '保存全部设置',
  coffeePrice: '咖啡价格 (人民币)',
  jianbingPrice: '煎饼价格 (人民币)',
  mealPrice: '餐食价格 (人民币)',
  hotpotPrice: '火锅价格 (人民币)',
  inputPrice: '输入价格 ($)',
  outputPrice: '输出价格 ($)',
  storeRequestContent: '存储请求内容',
  similarityDetectionMethod: '相似度检测方法',
  loadOfficial: '加载官方',
  addModel: '添加模型',
  modelName: '模型名称',
  price: '价格',
  action: '操作',
  apiKey: 'API密钥',
  baseUrl: '基础URL',
  updateAll: '更新全部',
  hashBased: '基于哈希（更私密）',
  textBased: '基于文本（更精确）',
  cacheTTL: '缓存TTL（秒）',
  cacheExpirationTime: '缓存过期时间',
  anonymizeProjectIDs: '匿名化项目ID',
  applySHA256: '对项目标识符应用SHA256哈希',
  coffee: '咖啡',
  jianbing: '煎饼',
  meal: '餐食',
  hotpot: '火锅',
  todayBudget: '今日预算（$）',
  weekBudget: '本周预算（$）',
  activeProj: '活跃项目',
  recording: '记录中',
  similarityLabel: '相似度：',
  efficiencyLabel: '效率：',
  rateLimitedLabel: '频率限制：',
  exportCSV: '导出CSV',
  loading: '加载中...',
  noData: '暂无数据',
  readyToAnalyze: '准备分析您的API使用模式',
  startMakingAPICalls: '开始进行API调用以获得个性化的效率洞察',
  alerts: '警报',
  analyzeAPIPatterns: '分析您的API使用模式和效率。',
  sarcasticAccountantAssessment: '您讽刺的会计师的评估',
  efficiencyRoomForImprovement: '还有改进空间，但已经不错了。',
  configureGlobalSettings: '配置API监控和分析的全局设置。',
  configureExchangeRatesAndModelPricing: '配置汇率和模型定价',
  usdToCnyExchangeRate: '美元至人民币汇率',
  modelPricingConfiguration: '模型定价配置',
  setPricingForModels: '设置不同AI模型的价格（每100万tokens）',
  configureDataHandlingPrivacy: '配置数据处理和隐私首选项',
  storeRequestContentForAnalysis: '存储API请求的实际内容以供分析',
};

interface I18nContextType {
  language: 'en' | 'zh';
  t: (key: keyof TranslationKeys) => string;
  toggleLanguage: () => void;
  setLanguage: (lang: 'en' | 'zh') => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<'en' | 'zh'>('en');

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'en' ? 'zh' : 'en');
  };

  const setLanguage = (lang: 'en' | 'zh') => {
    setLanguageState(lang);
  };

  const t = (key: keyof TranslationKeys): string => {
    const translations = language === 'en' ? enTranslations : zhTranslations;
    return translations[key];
  };

  return (
    <I18nContext.Provider value={{ language, t, toggleLanguage, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}