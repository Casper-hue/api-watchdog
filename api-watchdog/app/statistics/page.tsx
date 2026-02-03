"use client"

import * as React from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart3,
  Target,
  Download,
  ThumbsUp,
  Lightbulb,
  TrendingDown,
  Zap,
  CheckCircle2,
  TrendingUp,
  Clock,
} from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"

// Define TypeScript interfaces
interface ModelData {
  model: string;
  requests: number;
  totalCost: number;
  avgCost: number;
  percentage: number;
}

interface TotalStats {
  requests: number;
  totalCost: number;
  avgCost: number;
}

interface Point {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Suggestion {
  text: string;
  savings: string | null;
}

// Default values when no data is available - empty array since we get real data from API
const defaultModelData: ModelData[] = [];

const defaultTotalStats: TotalStats = {
  requests: 0,
  totalCost: 0,
  avgCost: 0,
};

const defaultPositivePoints: Point[] = [
  {
    text: "No data yet - be the first to make an API call!",
    icon: TrendingDown,
  },
];

const defaultSuggestions: Suggestion[] = [
  {
    text: "No usage data yet - start making API calls to get insights",
    savings: null,
  },
];

export default function StatisticsPage() {
  const { t, language } = useI18n();
  const [timeRange, setTimeRange] = React.useState("week");
  const [modelData, setModelData] = React.useState<ModelData[]>(defaultModelData);
  const [totalStats, setTotalStats] = React.useState<TotalStats>(defaultTotalStats);
  const [efficiencyScore, setEfficiencyScore] = React.useState<number>(0);
  const [efficiencyGrade, setEfficiencyGrade] = React.useState<string>("N/A");
  const [positivePoints, setPositivePoints] = React.useState<Point[]>(defaultPositivePoints);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>(defaultSuggestions);

  React.useEffect(() => {
    const fetchStatistics = async () => {
      try {
        console.log('Fetching statistics data...');
        
        // Initialize summaryData with default values
        let summaryData: any = {
          total_spend_usd: 0,
          total_spend_cny: 0,
          active_projects: 0,
          total_requests: 0,
          warnings_count: 0,
          equivalents: {
              coffee_cups: 0,
              jianbing_sets: 0,
            },
          trend: {
            daily_change_pct: 0,
            is_increasing: true
          }
        };
        
        // Enhanced error handling with retry logic
        const fetchWithRetry = async (url: string, retries = 3, delay = 1000, options: RequestInit = {}): Promise<Response> => {
          for (let i = 0; i < retries; i++) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              
              const response = await fetch(url, { 
                signal: controller.signal,
                ...options
              });
              clearTimeout(timeoutId);
              
              if (response.ok) {
                return response;
              }
              
              // If not ok but not a network error, don't retry
              if (response.status >= 400 && response.status < 500) {
                return response;
              }
              
              console.warn(`Attempt ${i + 1} failed for ${url}, retrying...`);
              
              // Wait before retrying
              if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
              }
            } catch (error) {
              console.warn(`Attempt ${i + 1} failed for ${url}:`, error);
              if (i === retries - 1) throw error;
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
            }
          }
          throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
        };
        
        // Fetch dashboard summary for overall stats
        let summaryResponse: Response;
        try {
          // Map timeRange to API-compatible format
          const apiTimeRange = timeRange === 'week' ? '7d' : 
                             timeRange === 'month' ? '30d' : 
                             timeRange === 'quarter' ? '90d' : '7d';
          summaryResponse = await fetchWithRetry(`/api/dashboard/summary?time_range=${apiTimeRange}`);
          console.log('Summary response status:', summaryResponse.status, 'Response ok:', summaryResponse.ok);
          
          if (summaryResponse.ok) {
            try {
              const responseData = await summaryResponse.json();
              console.log('Summary API Response data:', responseData);
              // Merge response data with defaults
              summaryData = { ...summaryData, ...responseData };
            } catch (error) {
              console.error('Error parsing summary response:', error);
              // Keep default values
            }
          }
        } catch (error) {
          console.error('Failed to fetch dashboard summary:', error);
          // Continue with default values
        }
        
        // Initialize projectData with default values
        let projectData: any = {
          top_models: [],
          daily_trend: []
        };
        
        // Initialize projectsDataArray to store projects data for efficiency analysis
        let projectsDataArray = []; // Store projects data separately to use later
        
        // Fetch aggregated stats across all projects to get all model data
        try {
          // Map timeRange to API-compatible format
          const projectApiTimeRange = timeRange === 'week' ? '7d' : 
                                    timeRange === 'month' ? '30d' : 
                                    timeRange === 'quarter' ? '90d' : '7d';
          
          const allProjectsStatsResponse = await fetchWithRetry(`/api/projects/stats?time_range=${projectApiTimeRange}`);
          
          if (allProjectsStatsResponse.ok) {
            const allProjectsStatsData = await allProjectsStatsResponse.json();
            projectData = allProjectsStatsData;  // Use aggregated data instead of defaults
            
            // Also get the list of projects for efficiency analysis
            const projectsResponse = await fetchWithRetry('/api/projects');
            if (projectsResponse.ok) {
              const projectsData = await projectsResponse.json();
              projectsDataArray = Array.isArray(projectsData) ? projectsData : [];
            }
          } else {
            console.error('Failed to fetch all projects stats:', allProjectsStatsResponse.status, allProjectsStatsResponse.statusText);
            
            // Fallback: try to get projects anyway for efficiency analysis
            const projectsResponse = await fetchWithRetry('/api/projects');
            if (projectsResponse.ok) {
              const projectsData = await projectsResponse.json();
              projectsDataArray = Array.isArray(projectsData) ? projectsData : [];
            }
          }
        } catch (error) {
          console.error('Failed to fetch all projects stats:', error);
          // Keep default values and try to get projects for efficiency analysis
          try {
            const projectsResponse = await fetchWithRetry('/api/projects');
            if (projectsResponse.ok) {
              const projectsData = await projectsResponse.json();
              projectsDataArray = Array.isArray(projectsData) ? projectsData : [];
            }
          } catch (projectError) {
            console.error('Failed to fetch projects for efficiency analysis:', projectError);
          }
        }
        
        const topModels = projectData.top_models || [];
        
        // Convert top models to the format needed for the table
        const realModelData: ModelData[] = Array.isArray(topModels) ? topModels.map((model: any, index: number) => {
          return {
            model: model.model || 'Unknown',
            requests: model.requests || 0,
            totalCost: model.cost || 0,
            avgCost: model.requests > 0 ? (model.cost || 0) / model.requests : 0,
            percentage: 0, // Will calculate after all models are processed
          };
        }) : [];
        
        // Calculate percentages after all models are loaded to ensure proper distribution
        if (realModelData.length > 0) {
          // Calculate the total cost from the model data itself rather than relying on summary data
          // This handles cases where summaryData.total_spend_usd might be 0
          const totalModelCost = realModelData.reduce((sum, item) => sum + item.totalCost, 0);
          
          if (totalModelCost > 0) {
            // Calculate raw percentages without rounding first
            const rawPercentages = realModelData.map(item => (item.totalCost / totalModelCost) * 100);
            
            // Apply largest remainder method to ensure percentages sum to 100
            const integerParts = rawPercentages.map(p => Math.floor(p));
            let assignedTotal = integerParts.reduce((sum, val) => sum + val, 0);
            let remaining = 100 - assignedTotal;
            
            // Create array of indices with decimal parts to determine who gets the extra percentage points
            const decimalParts = rawPercentages.map((p, i) => ({
              index: i,
              decimal: p - Math.floor(p)
            })).sort((a, b) => b.decimal - a.decimal);
            
            // Assign remaining percentage points to models with highest decimal parts
            for (let i = 0; i < remaining; i++) {
              const indexToIncrement = decimalParts[i].index;
              integerParts[indexToIncrement]++;
            }
            
            // Update the model data with properly calculated percentages
            realModelData.forEach((item, idx) => {
              item.percentage = integerParts[idx];
            });
          } else {
            // If total model cost is 0, set all percentages to 0
            realModelData.forEach(item => {
              item.percentage = 0;
            });
          }
        }
        
        // Set model data
        setModelData(realModelData);
        
        setTotalStats({
          requests: summaryData.total_requests || 0,
          totalCost: summaryData.total_spend_usd || 0,
          avgCost: (summaryData.total_requests || 0) > 0 ? (summaryData.total_spend_usd || 0) / (summaryData.total_requests || 0) : 0,
        });
        
        // Fetch efficiency analysis from backend
        // Only fetch if we have a valid project ID
        if (projectsDataArray && Array.isArray(projectsDataArray) && projectsDataArray.length > 0) {
          const firstProject = projectsDataArray[0];
          const projectId = firstProject.id;
          
          try {
            // Use the same project ID that we fetched stats from
            const projectApiTimeRange = timeRange === 'week' ? '7d' : 
                                      timeRange === 'month' ? '30d' : 
                                      timeRange === 'quarter' ? '90d' : '7d';
            const efficiencyResponse = await fetchWithRetry(`/api/analyzer/efficiency?project_id=${projectId}&time_range=${projectApiTimeRange}`, 3, 1000, {
              headers: {
                'Accept-Language': typeof window !== 'undefined' ? localStorage.getItem('language') || 'en' : 'en'
              }
            });
            
            if (efficiencyResponse.ok) {
              const efficiencyData = await efficiencyResponse.json();
              
              if (efficiencyData.success && efficiencyData.data) {
                const analysis = efficiencyData.data;
                setEfficiencyScore(analysis.score);
                setEfficiencyGrade(analysis.grade);
                
                // Update suggestions based on real analysis
                const updatedSuggestions: Suggestion[] = [];
                if (analysis.suggestions && Array.isArray(analysis.suggestions)) {
                  analysis.suggestions.forEach((suggestion: any) => {
                    updatedSuggestions.push({
                      text: suggestion.text,
                      savings: suggestion.savings
                    });
                  });
                }
                
                // Update positive points based on real analysis
                const updatedPositivePoints: Point[] = [];
                if (analysis.positive_points && Array.isArray(analysis.positive_points)) {
                  analysis.positive_points.forEach((point: string) => {
                    updatedPositivePoints.push({
                      text: point,
                      icon: ThumbsUp
                    });
                  });
                }
                
                setSuggestions(updatedSuggestions.length > 0 ? updatedSuggestions : defaultSuggestions);
                setPositivePoints(updatedPositivePoints.length > 0 ? updatedPositivePoints : defaultPositivePoints);
              } else {
                // Fallback to default values if analysis fails
                setEfficiencyScore(0);
                setEfficiencyGrade("N/A");
                setSuggestions(defaultSuggestions);
                setPositivePoints(defaultPositivePoints);
              }
            } else {
              // Fallback to default values if API fails
              setEfficiencyScore(0);
              setEfficiencyGrade("N/A");
              setSuggestions(defaultSuggestions);
              setPositivePoints(defaultPositivePoints);
            }
          } catch (error) {
            console.error('Failed to fetch efficiency analysis:', error);
            // Fallback to default values
            setEfficiencyScore(0);
            setEfficiencyGrade("N/A");
            setSuggestions(defaultSuggestions);
            setPositivePoints(defaultPositivePoints);
          }
        } else {
          // If no projects exist, use default values
          setEfficiencyScore(0);
          setEfficiencyGrade("N/A");
          setSuggestions(defaultSuggestions);
          setPositivePoints(defaultPositivePoints);
        }
        
        // Fetch recent activities for suggestions
        let activitiesData: any[] = [];
        try {
          const activitiesResponse = await fetchWithRetry('/api/activities/recent');
          
          if (activitiesResponse.ok) {
            try {
              const responseData = await activitiesResponse.json();
              activitiesData = Array.isArray(responseData) ? responseData : [];
            } catch (error) {
              console.error('Error parsing activities response:', error);
              activitiesData = [];
            }
          }
        } catch (error) {
          console.error('Failed to fetch activities:', error);
          activitiesData = [];
        }
        
        // Only update positive points and suggestions based on available data if we don't have real analysis data
        // Check if we already have analysis data from the efficiency API
        const hasRealAnalysis = efficiencyScore > 0 || (positivePoints.length > 0 && !positivePoints.some(p => p.text === "Ready to analyze your API usage patterns")) || (suggestions.length > 0 && !suggestions.some(s => s.text === "Start making API calls to get personalized efficiency insights"));
        
        if (!hasRealAnalysis) {
          // Generate positive points based on available statistics data when no real analysis exists
          const updatedPositivePoints: Point[] = [];
          const updatedSuggestions: Suggestion[] = [];
          
          // Generate positive points based on actual data
          if (summaryData.total_requests > 0) {
            // Positive point: Total usage
            updatedPositivePoints.push({
              text: `Active usage with ${summaryData.total_requests} requests`,
              icon: Zap,
            });
            
            // Positive point: Cost efficiency if average cost is low
            if (totalStats.avgCost < 0.02) {
              updatedPositivePoints.push({
                text: "Good cost efficiency with low average request cost",
                icon: TrendingDown,
              });
            }
            
            // Positive point: Multiple projects if applicable
            if (summaryData.active_projects > 1) {
              updatedPositivePoints.push({
                text: `Managing ${summaryData.active_projects} projects effectively`,
                icon: Target,
              });
            }
          }
          
          // Generate suggestions based on actual data
          if (summaryData.total_requests > 0) {
            // Suggestion: Cost optimization
            if (totalStats.avgCost > 0.05) {
              updatedSuggestions.push({
                text: "Consider using cheaper models for non-critical tasks",
                savings: `$${(totalStats.avgCost * summaryData.total_requests * 0.2).toFixed(2)}/week`,
              });
            }
            
            // Suggestion: Warning management
            if (summaryData.warning_count > 0) {
              updatedSuggestions.push({
                text: "Review patterns that trigger warnings to improve efficiency",
                savings: null,
              });
            }
            
            // Suggestion: Model optimization
            if (realModelData.length > 0) {
              const expensiveModels = realModelData.filter(model => model.avgCost > 0.03);
              if (expensiveModels.length > 0) {
                updatedSuggestions.push({
                  text: `Consider alternatives to ${expensiveModels.map(m => m.model).join(', ')} for cost-sensitive tasks`,
                  savings: `$${(expensiveModels.reduce((sum, m) => sum + m.totalCost, 0) * 0.15).toFixed(2)}/week`,
                });
              }
            }
          }
          
          // If no data-based points, use default informative messages
          if (updatedPositivePoints.length === 0) {
            updatedPositivePoints.push({
              text: "Ready to analyze your API usage patterns",
              icon: Target,
            });
          }
          
          if (updatedSuggestions.length === 0) {
            updatedSuggestions.push({
              text: "Start making API calls to get personalized efficiency insights",
              savings: null,
            });
          }
          
          // Only set these if we didn't get real analysis data
          setPositivePoints(updatedPositivePoints);
          setSuggestions(updatedSuggestions);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      }
    };

    fetchStatistics();
  }, [timeRange]);

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t('statistics')}
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              {t('analyzeAPIPatterns')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-9 w-[130px] font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week" className="font-mono text-xs">
                  {t('week')}
                </SelectItem>
                <SelectItem value="month" className="font-mono text-xs">
                  {t('month')}
                </SelectItem>
                <SelectItem value="quarter" className="font-mono text-xs">
                  {t('quarter')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 font-mono text-xs bg-transparent"
              onClick={async () => {
                try {
                  // Fetch the data to export with retry logic
                  const fetchWithRetry = async (url: string, retries = 3, delay = 1000, options: RequestInit = {}): Promise<Response> => {
                    for (let i = 0; i < retries; i++) {
                      try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        
                        const response = await fetch(url, { 
                          signal: controller.signal,
                          ...options
                        });
                        clearTimeout(timeoutId);
                        
                        if (response.ok) return response;
                        
                        if (response.status >= 400 && response.status < 500) return response;
                        
                        if (i < retries - 1) {
                          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                        }
                      } catch (error) {
                        if (i === retries - 1) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                      }
                    }
                    throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
                  };
                  
                  const summaryResponse = await fetchWithRetry('/api/dashboard/summary');
                  const projectResponse = await fetchWithRetry('/api/projects/test-project/stats');
                  
                  if (summaryResponse.ok && projectResponse.ok) {
                    let summaryData: any = {};
                    let projectData: any = {};
                    
                    try {
                      summaryData = await summaryResponse.json();
                      projectData = await projectResponse.json();
                    } catch (error) {
                      console.error('Error parsing responses for export:', error);
                      return;
                    }
                    
                    // Combine data for export
                    const exportData = [
                      {
                        metric: 'Total Spend USD',
                        value: summaryData.total_spend_usd || 0,
                        unit: 'USD'
                      },
                      {
                        metric: 'Total Spend CNY',
                        value: summaryData.total_spend_cny || 0,
                        unit: 'CNY'
                      },
                      {
                        metric: 'Active Projects',
                        value: summaryData.active_projects || 0,
                        unit: 'count'
                      },
                      {
                        metric: 'Total Requests',
                        value: summaryData.total_requests || 0,
                        unit: 'count'
                      },
                      {
                        metric: 'Warnings Count',
                        value: summaryData.warnings_count || 0,
                        unit: 'count'
                      },
                      {
                        metric: 'Coffee Cups Equivalent',
                        value: summaryData.equivalents?.coffee_cups || 0,
                        unit: 'cups'
                      },
                      {
                        metric: 'Jianbing Sets Equivalent',
                        value: summaryData.equivalents?.jianbing_sets || 0,
                        unit: 'sets'
                      },
                      {
                        metric: 'Meal Equivalent',
                        value: summaryData.equivalents?.meal_equivalent || 'N/A',
                        unit: 'meal'
                      },
                      ...(Array.isArray(projectData.top_models) ? projectData.top_models.map((model: any) => ({
                        metric: `Model: ${model.model || 'Unknown'}`,
                        value: `Requests: ${model.requests || 0}, Cost: $${model.cost || 0}`,
                        unit: 'usage'
                      })) : [])
                    ];
                    
                    // Export to CSV
                    const { exportToCsv } = await import('@/lib/csv-utils');
                    exportToCsv(`api-statistics-${new Date().toISOString().slice(0, 10)}.csv`, exportData);
                  }
                } catch (error) {
                  console.error('Error exporting CSV:', error);
                }
              }}
            >
              <Download className="h-4 w-4" />
              {t('exportCSV')}
            </Button>
          </div>
        </div>

        {/* Model Comparison Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-mono text-base">
                  {t('modelCostComparison')}
                </CardTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {t('breakdownByModelUsage')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {t('model')}
                    </TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {t('requests')}
                    </TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {t('totalCost')}
                    </TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {t('avgCost')}
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {t('share')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelData.map((row) => (
                    <TableRow
                      key={row.model}
                      className="border-border/50 hover:bg-secondary/30"
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {row.model}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.requests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-accent">
                        ${row.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        ${row.avgCost.toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={row.percentage}
                            className="h-2 w-20"
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {row.percentage}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="border-t-2 border-border bg-secondary/20 hover:bg-secondary/30">
                    <TableCell className="font-mono text-sm font-bold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">
                      {totalStats.requests}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-accent">
                      ${totalStats.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-muted-foreground">
                      ${totalStats.avgCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold">
                      100%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Report */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-mono text-base">
                  {t('efficiencyReport')}
                </CardTitle>
                <p className="font-mono text-xs text-muted-foreground">
                {t('sarcasticAccountantAssessment')}
              </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-secondary/30 p-6 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  {timeRange === 'week' ? t('weeklyEfficiencyRating') : timeRange === 'month' ? t('monthlyEfficiencyRating') : t('quarterlyEfficiencyRating')}
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono text-5xl font-bold text-accent">
                    {efficiencyGrade}
                  </span>
                  <span className="font-mono text-lg text-muted-foreground">
                    {efficiencyScore}/100
                  </span>
                </div>
              </div>
              <div className="w-full max-w-xs">
                <Progress value={efficiencyScore} className="h-3" />
                <p className="mt-2 text-center font-mono text-xs text-muted-foreground sm:text-right">
                {t('efficiencyRoomForImprovement')}
              </p>
              </div>
            </div>

            {/* Positive Points */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-success" />
                <span className="font-mono text-sm font-medium text-foreground">
                  {t('whatYoureDoingWell')}
                </span>
              </div>
              <div className="space-y-2">
                {positivePoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3"
                  >
                    <point.icon className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="font-mono text-sm text-foreground">
                      {point.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-accent" />
                <span className="font-mono text-sm font-medium text-foreground">
                  {t('improvementSuggestions')}
                </span>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 rounded-lg border border-accent/20 bg-accent/5 p-3"
                  >
                    <span className="font-mono text-sm text-foreground">
                      {suggestion.text}
                    </span>
                    {suggestion.savings && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-success/30 font-mono text-xs text-success"
                      >
                        Save {suggestion.savings}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
