"use client"

import * as React from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  FolderKanban,
  Plus,
  TrendingUp,
  Target,
  Trash2,
  Calendar,
} from "lucide-react"
import { useI18n } from "@/contexts/i18n-context"

// Define TypeScript interfaces
interface Project {
  id: string;
  name: string;
  createdAt: string;
  totalCost: number;
  totalCostCNY: number;
  equivalent: string;
}

interface ProjectStats {
  project_id: string;
  period: string;
  total_requests: number;
  total_cost_usd: number;
  total_cost_cny: number;
  equivalents: {
    coffee_cups: number;
    jianbing_sets: number;
    meal_equivalent: string;
  };
  debug_rate: number;
  top_models: Array<{
    model: string;
    requests: number;
    cost: number;
  }>;
  daily_trend: Array<{
    date: string;
    cost: number;
  }>;
  usage_breakdown: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

interface ChartDataPoint {
  day: string;
  cost: number;
}

const chartConfig = {
  cost: {
    label: "Cost",
    color: "#4fd1c5",
  },
}

export default function ProjectsPage() {
  const { t } = useI18n();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [monthlyData, setMonthlyData] = React.useState<ChartDataPoint[]>([]);
  const [usageData, setUsageData] = React.useState<any[]>([]);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState<boolean>(true); // 添加loading状态
  const lastFetchedProjectId = React.useRef<string | null>(null);

  React.useEffect(() => {
    // Fetch projects data and load stats for the first project in one operation
    const fetchProjectsAndStats = async () => {
      setIsLoading(true); // 开始加载
      try {
        console.log('Fetching projects from:', '/api/projects');
        const response = await fetch('/api/projects');
        
        console.log('Projects response status:', response.status, 'Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Projects API Error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const projectsData = await response.json();
        console.log('Projects API Response data:', projectsData);
        
        // Ensure projectsData is an array
        if (!Array.isArray(projectsData)) {
          console.warn('API returned invalid data for projects:', projectsData);
          setProjects([]);
          setSelectedProject(null);
          setIsLoading(false);
          return;
        }
        
        setProjects(projectsData);
        
        if (projectsData.length > 0) {
          // 获取第一个项目的详细统计数据，然后设置selectedProject
          const firstProject = projectsData[0];
          try {
            const statsResponse = await fetch(`/api/projects/${firstProject.id}/stats?time_range=30d`);
            if (statsResponse.ok) {
              const data: ProjectStats = await statsResponse.json();
              
              // 创建带有完整统计数据的项目对象
              const projectWithStats: Project = {
                ...firstProject,
                totalCost: data.total_cost_usd,
                totalCostCNY: data.total_cost_cny,
                equivalent: `${data.equivalents.coffee_cups} ${t('equivalentToCoffeeCups')}`
              };
              
              setSelectedProject(projectWithStats);
              
              // 更新本地项目列表
              setProjects(prevProjects => prevProjects.map(p => 
                p.id === firstProject.id ? projectWithStats : p
              ));
              
              // 设置图表数据
              const realMonthlyData: ChartDataPoint[] = data.daily_trend.map((trend, index) => ({
                day: trend.date,
                cost: trend.cost
              }));
              
              setMonthlyData(realMonthlyData);
              
              // 设置使用分解数据
              const realUsageData = data.usage_breakdown.map(breakdown => ({
                name: breakdown.name === "Debug" ? t('debugMode') :
                      breakdown.name === "Development" ? t('developmentMode') :
                      breakdown.name === "Optimization" ? t('optimizationMode') :
                      breakdown.name, // Fallback to original name if not one of the three
                value: breakdown.percentage,
                color: breakdown.name === "Debug" ? "#ed8936" : 
                       breakdown.name === "Development" ? "#4fd1c5" : 
                       "#ecc94b"
              }));
              
              setUsageData(realUsageData);
            } else {
              // 如果无法获取统计数据，则使用原始项目数据
              setSelectedProject(firstProject);
            }
          } catch (statsError) {
            console.error('Error fetching first project stats:', statsError);
            // 如果获取统计信息失败，仍然选择第一个项目
            setSelectedProject(firstProject);
          }
        } else {
          // If no projects exist, set to null
          setSelectedProject(null);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        // On error, set to empty array
        setProjects([]);
        setSelectedProject(null);
      } finally {
        setIsLoading(false); // 加载结束
      }
    };

    fetchProjectsAndStats();
  }, []);

  // 新增：当selectedProject改变时，获取该项目的统计数据
  React.useEffect(() => {
    const fetchSelectedProjectStats = async () => {
      if (selectedProject && lastFetchedProjectId.current !== selectedProject.id) {
        try {
          // 标记当前正在获取数据的项目ID
          lastFetchedProjectId.current = selectedProject.id;
          
          const statsResponse = await fetch(`/api/projects/${selectedProject.id}/stats?time_range=30d`);
          if (statsResponse.ok) {
            const data: ProjectStats = await statsResponse.json();
            
            // 更新项目统计信息
            const projectWithStats: Project = {
              ...selectedProject,
              totalCost: data.total_cost_usd,
              totalCostCNY: data.total_cost_cny,
              equivalent: `${data.equivalents.coffee_cups} ${t('equivalentToCoffeeCups')}`
            };
            
            // 更新选中的项目
            setSelectedProject(projectWithStats);
            
            // 更新本地项目列表中的对应项目
            setProjects(prevProjects => prevProjects.map(p => 
              p.id === selectedProject.id ? projectWithStats : p
            ));
            
            // 设置图表数据
            const realMonthlyData: ChartDataPoint[] = data.daily_trend.map((trend, index) => ({
              day: trend.date,
              cost: trend.cost
            }));
            
            setMonthlyData(realMonthlyData);
            
            // 设置使用分解数据
            const realUsageData = data.usage_breakdown.map(breakdown => ({
              name: breakdown.name === "Debug" ? t('debugMode') :
                    breakdown.name === "Development" ? t('developmentMode') :
                    breakdown.name === "Optimization" ? t('optimizationMode') :
                    breakdown.name, // Fallback to original name if not one of the three
              value: breakdown.percentage,
              color: breakdown.name === "Debug" ? "#ed8936" : 
                     breakdown.name === "Development" ? "#4fd1c5" : 
                     "#ecc94b"
            }));
            
            setUsageData(realUsageData);
          }
        } catch (error) {
          console.error('Error fetching selected project stats:', error);
          // 发生错误时，清除当前记录的项目ID以便重试
          lastFetchedProjectId.current = null;
        }
      }
    };

    fetchSelectedProjectStats();
  }, [selectedProject]);

  const handleAddProject = async () => {
    if (newProjectName.trim()) {
      try {
        // In a real implementation, we would send this to the backend
        // For now, we'll just add it locally, but the real implementation would create the project on the backend
        const newProject: Project = {
          id: newProjectName.toLowerCase().replace(/\s+/g, '-'),
          name: newProjectName,
          createdAt: new Date().toISOString().split('T')[0],
          totalCost: 0,
          totalCostCNY: 0,
          equivalent: 'N/A',
        };
        
        setProjects([...projects, newProject]);
        setSelectedProject(newProject);
        
        // Close dialog and reset form
        setIsAddProjectDialogOpen(false);
        setNewProjectName('');
      } catch (error) {
        console.error('Error adding project:', error);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // Call the backend API to delete the project
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove project from the frontend list
        const updatedProjects = projects.filter(project => project.id !== projectId);
        setProjects(updatedProjects);
        
        // If the deleted project was selected, clear selection
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
        }
      } else {
        console.error('Failed to delete project from backend');
        // Still remove from UI as fallback
        const updatedProjects = projects.filter(project => project.id !== projectId);
        setProjects(updatedProjects);
        
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t('projects')}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            {t('monitorProjectSpending')}
          </p>
        </div>

        {/* Project Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <Button
                variant={selectedProject && selectedProject.id === project.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedProject(project)}
                className="font-mono text-xs pr-8"
              >
                {project.name}
              </Button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
                }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 font-mono text-xs bg-transparent"
            onClick={() => setIsAddProjectDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
          
          {/* Add Project Dialog */}
          <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Project</DialogTitle>
                <DialogDescription>
                  Enter a name for your new project
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddProject();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddProjectDialogOpen(false);
                    setNewProjectName('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddProject}
                  disabled={!newProjectName.trim()}
                >
                  Add Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Project Overview */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-mono text-lg">
                    {selectedProject ? selectedProject.name : 'Loading...'}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="font-mono">
                      {t('createdDate')} {selectedProject ? selectedProject.createdAt : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {t('activeStatus')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Info Content */}
            <>
              {/* Cost Summary */}
                <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {t('totalConsumption')}
                  </p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="font-mono text-3xl font-bold text-foreground">
                      {selectedProject ? `$${selectedProject.totalCost.toFixed(2)}` : '$0.00'}
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">
                      {selectedProject ? `(\u00A5${selectedProject.totalCostCNY.toFixed(2)})` : '(\u00A50.00)'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-accent">
                    {t('equivalentTo')}: {selectedProject ? selectedProject.equivalent : 'N/A'}
                  </p>
                </div>

                {/* Charts Row */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Monthly Trend */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm font-medium">
                        {t('monthlyTrend')}
                      </span>
                    </div>
                    <ChartContainer config={chartConfig} className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={monthlyData}
                          margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            opacity={0.3}
                          />
                          <XAxis
                            dataKey="day"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cost"]}
                              />
                            }
                          />
                          <Line
                            type="monotone"
                            dataKey="cost"
                            stroke="#4fd1c5"
                            strokeWidth={2}
                            dot={{ fill: "#4fd1c5", strokeWidth: 0, r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  {/* Usage Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm font-medium">
                        {t('usageAnalysis')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-[180px] w-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={usageData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {usageData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {usageData.map((item) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-sm"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.name}: {item.value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
            </>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
