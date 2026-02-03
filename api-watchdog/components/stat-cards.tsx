"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogFooter } from "@/components/ui/dialog"
import { useI18n } from "@/contexts/i18n-context"

interface StatCardProps {
  title: string
  value: string
  equivalent?: string
  equivalentLabel?: string
  trend?: {
    value: number
    direction: "up" | "down"
  }
  alertCount?: number
  meterValue?: number // 0-100 for the dial
  className?: string
  onEquivalentClick?: () => void
  onClick?: () => void
  t?: (key: keyof TranslationKeys) => string
}

// Industrial meter/dial component
function IndustrialMeter({ value, size = 120 }: { value: number; size?: number }) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));
  
  // Calculate rotation angle: 0% -> -90deg, 50% -> 0deg, 100% -> +90deg
  // Formula: rotation = (percentage / 100) * 180 - 90
  const rotation = (clampedValue / 100) * 180 - 90;
  
  // Define constants for the gauge
  const centerX = 100;
  const centerY = 100;
  const radius = 70; // Further reduced from 75 to 70 to make colored rings smaller
  const strokeWidth = 8; // Reduced from 12 to 8 to make colored rings thinner
  const baseOpacity = 0.6; // Reduced from 0.8 to 0.6 for more transparency
  
  // Calculate start and end angles for arcs (in radians)
  const startAngle = Math.PI; // 180 degrees (left side)
  const endAngle = 0;         // 0 degrees (right side)
  const totalAngle = Math.PI; // 180 degrees in total
  
  // Calculate individual segment angles (each 45 degrees = π/4 radians)
  const segmentAngle = totalAngle / 4; // π/4 radians (45 degrees per segment)
  
  // Outer ring parameters
  const outerRadius = 80; // Fixed outer radius for shadow ring
  const outerStrokeWidth = 6.75; // 3/4 of original stroke width (9 * 0.75)
  
  return (
    <div 
      className="relative industrial-meter"
      style={{ width: size, height: size * 0.55 }}
    >
      <svg 
        viewBox="0 0 200 110" 
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 0 10px oklch(0.8 0.16 85 / 0.3))" }}
      >
        {/* Background - deep dark gray */}
        <rect width="100%" height="100%" fill="oklch(0.15 0.01 250)" rx="10" />
        
        {/* Outer shadow ring - gray, slightly larger radius */}
        <path
          d={`M ${centerX - outerRadius} ${centerY} A ${outerRadius} ${outerRadius} 0 0 1 ${centerX + outerRadius} ${centerY}`}
          fill="none"
          stroke="oklch(0.3 0.01 250)" // Gray color
          strokeWidth={outerStrokeWidth}
          opacity="0.4"
        />
        
        {/* 45° interval tick marks on outer ring */}
        {[0, 45, 90, 135, 180].map((angleDeg) => {
          // Convert angle to radians (0° is at the right side, 180° at left)
          const angleRad = (angleDeg * Math.PI) / 180;
          // Adjust angle to match our gauge orientation (start from left)
          const adjustedAngle = Math.PI - angleRad; // Flip to start from left side
          
          const x = centerX + outerRadius * Math.cos(adjustedAngle);
          const y = centerY + outerRadius * Math.sin(adjustedAngle);
          
          // Short tick length
          const tickLength = 4;
          const innerX = centerX + (outerRadius - tickLength) * Math.cos(adjustedAngle);
          const innerY = centerY + (outerRadius - tickLength) * Math.sin(adjustedAngle);
          
          return (
            <line
              key={angleDeg}
              x1={innerX}
              y1={innerY}
              x2={x}
              y2={y}
              stroke="oklch(0.4 0.01 250)" // Darker gray for tick
              strokeWidth="1.5"
              opacity="0.6"
            />
          );
        })}
        
        {/* Background track (darker gray than background) */}
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="oklch(0.2 0.01 250)" // Darker gray
          strokeWidth={strokeWidth}
          opacity="0.2" // Reduced from 0.3 for more transparency
        />
        
        {/* 0%-25% segment: Green */}
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX - radius * Math.cos(segmentAngle)} ${centerY - radius * Math.sin(segmentAngle)}`}
          fill="none"
          stroke="oklch(0.7 0.2 145)" // Green
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={baseOpacity} // Reduced for more transparency
        />
        
        {/* 25%-50% segment: Yellow */}
        <path
          d={`M ${centerX - radius * Math.cos(segmentAngle)} ${centerY - radius * Math.sin(segmentAngle)} A ${radius} ${radius} 0 0 1 ${centerX - radius * Math.cos(segmentAngle * 2)} ${centerY - radius * Math.sin(segmentAngle * 2)}`}
          fill="none"
          stroke="oklch(0.9 0.18 85)" // Yellow
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={baseOpacity} // Reduced for more transparency
        />
        
        {/* 50%-75% segment: Orange */}
        <path
          d={`M ${centerX - radius * Math.cos(segmentAngle * 2)} ${centerY - radius * Math.sin(segmentAngle * 2)} A ${radius} ${radius} 0 0 1 ${centerX - radius * Math.cos(segmentAngle * 3)} ${centerY - radius * Math.sin(segmentAngle * 3)}`}
          fill="none"
          stroke="oklch(0.9 0.15 60)" // Orange
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={baseOpacity} // Reduced for more transparency
        />
        
        {/* 75%-100% segment: Red */}
        <path
          d={`M ${centerX - radius * Math.cos(segmentAngle * 3)} ${centerY - radius * Math.sin(segmentAngle * 3)} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="oklch(0.6 0.2 25)" // Red
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={baseOpacity} // Reduced for more transparency
        />
        
        {/* Tick marks at 0%, 25%, 50%, 75%, 100% */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const angle = startAngle + (percent / 100) * (endAngle - startAngle);
          const innerRadius = radius - 10;
          const outerRadiusInner = radius + 5;
          
          const x1 = centerX + innerRadius * Math.cos(angle);
          const y1 = centerY + innerRadius * Math.sin(angle);
          const x2 = centerX + outerRadiusInner * Math.cos(angle);
          const y2 = centerY + outerRadiusInner * Math.sin(angle);
          
          // Position for labels
          const labelRadius = radius - 20;
          const labelX = centerX + labelRadius * Math.cos(angle);
          const labelY = centerY + labelRadius * Math.sin(angle);
          
          return (
            <g key={percent}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="oklch(0.9 0.1 85)" // Brighter color for ticks
                strokeWidth="2"
                opacity="0.9"
              />
              <text
                x={labelX}
                y={labelY}
                fill="oklch(0.95 0.15 85)" // Brighter color for labels
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="monospace"
                fontWeight="bold"
                opacity="0.9"
              >
                {percent}
              </text>
            </g>
          );
        })}
        
        {/* Pointer/Neeedle - positioned to point to middle of colored ring */}
        <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
          {/* Needle line - adjusted to point to middle of colored ring */}
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - radius + 5} // Point to middle of colored ring (with radius 70 and stroke 8, this places tip near the ring)
            stroke="oklch(0.95 0.2 85)" // Bright yellow/amber
            strokeWidth="5" // Thickness
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px oklch(0.9 0.16 85))" }}
          />
          {/* Center pivot - two concentric circles (smaller): large light gray, small dark gray */}
          <circle
            cx={centerX}
            cy={centerY}
            r="6" // Smaller radius to be partially covered by border
            fill="oklch(0.4 0.01 250)" // Large浅灰色 circle
            stroke="oklch(0.5 0.01 250)" // Slightly darker border
            strokeWidth="1"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r="2.5" // Smaller radius to be partially covered by border
            fill="oklch(0.2 0.01 250)" // Small深灰色 circle
          />
        </g>
      </svg>
    </div>
  )
}

// Seven-segment style display
function SegmentDisplay({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn(
      "industrial-meter px-4 py-2 animate-flicker",
      className
    )}>
      <span className="segment-display text-3xl lg:text-4xl text-primary text-glow-amber">
        {value}
      </span>
    </div>
  )
}

function StatCard({
  title,
  value,
  equivalent,
  equivalentLabel,
  trend,
  alertCount,
  meterValue = 50,
  className,
  onEquivalentClick,
  onClick,
  t,
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "industrial-panel p-4 lg:p-5 space-y-4",
        className,
        onClick && "cursor-pointer hover:brightness-110 transition-all duration-200"
      )}
      onClick={onClick}
    >
      {/* Header label */}
      <div className="flex items-center justify-between">
        <div className="embossed-label text-muted-foreground">
          {title}
        </div>
        {alertCount !== undefined && alertCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/20 border border-destructive/50">
            <div className="led-indicator led-on-red w-2 h-2" />
            <span className="text-[10px] font-bold text-destructive text-glow-red">
              {t ? t('alerts') : 'ALERTS'}
            </span>
          </div>
        )}
      </div>
      
      {/* Main value display */}
      <div className="flex items-center justify-between gap-4">
        <SegmentDisplay value={value} />
        
        {/* Trend indicator */}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 border-2",
            trend.direction === "up"
              ? "border-destructive/50 bg-destructive/10"
              : "border-success/50 bg-success/10"
          )}>
            {trend.direction === "up" ? (
              <TrendingUp className="h-4 w-4 text-destructive text-glow-red" />
            ) : (
              <TrendingDown className="h-4 w-4 text-success text-glow-green" />
            )}
            <span className={cn(
              "text-xs font-bold",
              trend.direction === "up" 
                ? "text-destructive text-glow-red" 
                : "text-success text-glow-green"
            )}>
              {trend.value}%
            </span>
          </div>
        )}
      </div>
      
      {/* Meter/Dial */}
      <div className="flex justify-center">
        <IndustrialMeter value={meterValue} size={140} />
      </div>
      
      {/* Equivalent display */}
      {equivalent && (
        <button 
          onClick={onEquivalentClick}
          className={cn(
            "industrial-raised px-3 py-2 text-center w-full transition-all duration-200",
            onEquivalentClick && "cursor-pointer hover:brightness-110 active:scale-95"
          )}
        >
          <span className="text-xs text-muted-foreground">{equivalentLabel}: </span>
          <span className="text-xs font-bold text-accent text-glow-amber">
            {equivalent}
          </span>
        </button>
      )}
    </div>
  )
}

import { DashboardSummary } from "@/lib/api.types"
import { TranslationKeys } from '@/contexts/i18n-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock, AlertOctagon } from "lucide-react"

type EquivalentType = "coffee" | "jianbing" | "meal" | "hotpot"

interface WarningItem {
  id: string
  timestamp: string
  project_id: string
  level: number
  message: string
  details: {
    cost_usd: number
    cost_cny: number
    similarity_score?: number
    cooldown_seconds?: number
  }
}

const getEquivalentConfig = (t: (key: keyof TranslationKeys) => string) => ({
  coffee: { label: t('coffee'), unit: "cups", key: "coffee_cups" as keyof DashboardSummary["today"]["equivalents"] },
  jianbing: { label: t('jianbing'), unit: "pcs", key: "jianbing_sets" as keyof DashboardSummary["today"]["equivalents"] },
  meal: { label: t('meal'), unit: "meals", key: "meal_meals" as keyof DashboardSummary["today"]["equivalents"] },
  hotpot: { label: t('hotpot'), unit: "meals", key: "hotpot_meals" as keyof DashboardSummary["today"]["equivalents"] }
})

export function StatCards() {
  const { t } = useI18n();
  const equivalentConfig = getEquivalentConfig(t);
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayEquivalent, setTodayEquivalent] = useState<EquivalentType>("coffee");
  const [weekEquivalent, setWeekEquivalent] = useState<EquivalentType>("jianbing");
  const [showWarningsDialog, setShowWarningsDialog] = useState(false);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState({
    today_budget: 50.0,
    week_budget: 300.0,
    active_proj_limit: 10,
    warning_threshold: 20
  });
  const [userPrefsVersion, setUserPrefsVersion] = useState(0); // Track version to force re-render
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const fetchStats = async () => {
    try {
      console.log('Fetching dashboard summary from:', '/api/dashboard/summary');
      const response = await fetch('/api/dashboard/summary');
      
      console.log('Response status:', response.status, 'Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DashboardSummary = await response.json();
      console.log('Dashboard data:', data);
      
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setError('Failed to load dashboard data');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        if (response.ok) {
          const data = await response.json();
          setUserPreferences(data);
          setUserPrefsVersion(prev => prev + 1); // Force re-render
        }
      } catch (error) {
        console.error('Failed to fetch user preferences:', error);
      }
    };

    fetchStats();
    fetchUserPreferences(); // Also fetch user preferences
  }, []);

  const fetchWarnings = async () => {
    setWarningsLoading(true);
    try {
      const response = await fetch('/api/warnings');
      if (response.ok) {
        const data = await response.json();
        setWarnings(data.warnings || []);
      }
    } catch (error) {
      console.error('Failed to fetch warnings:', error);
      setWarnings([]);
    } finally {
      setWarningsLoading(false);
    }
  };

  const handleWarningsClick = async () => {
    if (stats?.warning_count && stats.warning_count > 0) {
      await fetchWarnings();
      setShowWarningsDialog(true);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data);
        setUserPrefsVersion(prev => prev + 1); // Force re-render
      }
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
    }
  };

  const updateUserPreferences = async (newPreferences: any) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data.preferences);
        setUserPrefsVersion(prev => prev + 1); // Force re-render
        setShowSettingsDialog(false);
        // Refresh stats to reflect new preferences
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to update user preferences:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="industrial-panel p-4 lg:p-5 space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-24 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="industrial-panel p-4 lg:p-5 space-y-4 text-center">
            <div className="text-muted-foreground">{error || 'Failed to load data'}</div>
          </div>
        ))}
      </div>
    );
  }

  // Format stats based on new contract format with equivalent switching
  const formattedStats = stats ? [
    {
      title: t('dailySpendVsBudget'),
      value: `$${stats.today.total_cost_usd.toFixed(2)}`,
      equivalent: `${stats.today.equivalents[equivalentConfig[todayEquivalent].key]} ${equivalentConfig[todayEquivalent].unit}`,
      equivalentLabel: equivalentConfig[todayEquivalent].label,
      trend: { 
        value: Math.abs(Math.round((stats.today.total_cost_usd / userPreferences.today_budget) * 100)), 
        direction: (stats.today.total_cost_usd / userPreferences.today_budget) >= 1 ? "up" as const : "down" as const 
      },
      meterValue: Math.min(100, Math.round((stats.today.total_cost_usd / userPreferences.today_budget) * 100)),
      onEquivalentClick: () => {
        const equivalents: EquivalentType[] = ["coffee", "jianbing", "meal", "hotpot"]
        const currentIndex = equivalents.indexOf(todayEquivalent)
        const nextIndex = (currentIndex + 1) % equivalents.length
        setTodayEquivalent(equivalents[nextIndex])
      }
    },
    
    {
      title: t('weeklySpendVsBudget'),
      value: `$${stats.week.total_cost_usd.toFixed(2)}`,
      equivalent: `${stats.week.equivalents[equivalentConfig[weekEquivalent].key]} ${equivalentConfig[weekEquivalent].unit}`,
      equivalentLabel: equivalentConfig[weekEquivalent].label,
      trend: { 
        value: Math.abs(Math.round((stats.week.total_cost_usd / userPreferences.week_budget) * 100)), 
        direction: (stats.week.total_cost_usd / userPreferences.week_budget) >= 1 ? "up" as const : "down" as const 
      },
      meterValue: Math.min(100, Math.round((stats.week.total_cost_usd / userPreferences.week_budget) * 100)),
      onEquivalentClick: () => {
        const equivalents: EquivalentType[] = ["coffee", "jianbing", "meal", "hotpot"]
        const currentIndex = equivalents.indexOf(weekEquivalent)
        const nextIndex = (currentIndex + 1) % equivalents.length
        setWeekEquivalent(equivalents[nextIndex])
      }
    },
    
    {
      title: t('activeProjectsVsLimit'),
      value: `${stats.active_projects}`,
      equivalent: `${stats.active_projects} ${t('teams')}`,
      equivalentLabel: t('teams').toUpperCase(),
      meterValue: Math.min(100, Math.round((stats.active_projects / userPreferences.active_proj_limit) * 100)),
    },
    
    {
      title: t('warningsVsThreshold'),
      value: `${stats.warning_count}`,
      equivalent: t('week'),
      equivalentLabel: t('period').toUpperCase(),
      alertCount: stats.warning_count,
      meterValue: Math.min(100, Math.round((stats.warning_count / userPreferences.warning_threshold) * 100)),
      onClick: handleWarningsClick,
    }
  ] : [];

  // Force re-render when userPrefsVersion changes
  const _ = userPrefsVersion;

  return (
    <div className="space-y-6">
      {/* Header with settings button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowSettingsDialog(true)}
          className="industrial-button px-4 py-2 text-xs font-medium tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          {t('settings').toUpperCase()}
        </button>
      </div>
      
      {/* Grid of stat cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {formattedStats.map((stat, i) => (
          <StatCard
            key={i}
            title={stat.title}
            value={stat.value}
            equivalent={stat.equivalent}
            equivalentLabel={stat.equivalentLabel}
            trend={stat.trend}
            alertCount={stat.alertCount}
            meterValue={stat.meterValue}
            onEquivalentClick={stat.onEquivalentClick}
            onClick={stat.onClick}
            t={t}
          />
        ))}
      </div>

      {/* Warnings Dialog */}
      <Dialog open={showWarningsDialog} onOpenChange={setShowWarningsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {t?.('warningsCount') || 'Warnings'} ({stats?.warning_count || 0})
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Last 24 hours - Click on any warning to view details
            </p>
          </DialogHeader>
          
          <div className="space-y-3">
            {warningsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading warnings...</p>
              </div>
            ) : warnings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
                <p className="text-lg font-semibold">No warnings found</p>
                <p className="text-sm text-muted-foreground">Great job! All API usage looks efficient.</p>
              </div>
            ) : (
              warnings.map((warning) => (
                <div key={warning.id} className="industrial-raised p-4 space-y-3 border-l-4 border-warning/50">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="led-indicator led-on-amber" />
                      {warning.level >= 4 ? (
                        <AlertOctagon className="h-4 w-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    
                    <span className="embossed-label">{new Date(warning.timestamp).toLocaleTimeString()}</span>
                    
                    <div className="industrial-meter px-2 py-0.5">
                      <span className="text-[10px] font-bold tracking-wider text-primary">
                        {warning.project_id}
                      </span>
                    </div>
                    
                    <div className="px-2 py-0.5 border-2 text-[10px] font-bold tracking-wider bg-warning/5 text-warning text-glow-amber border-warning/50">
                      LVL-{warning.level}
                    </div>
                  </div>

                  <p className="text-sm text-foreground leading-relaxed pl-6">
                    {warning.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pl-6">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{t?.('costLabel') || 'COST:'}</span>
                      <span className="text-xs font-bold text-accent text-glow-amber">
                        ${warning.details.cost_usd.toFixed(2)}
                      </span>
                    </div>
                    
                    {warning.details.similarity_score !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">SIMILARITY:</span>
                        <span className="text-xs font-bold text-warning text-glow-amber">
                          {Math.round(warning.details.similarity_score * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {warning.details.cooldown_seconds !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">COOLDOWN:</span>
                        <span className="text-xs font-bold text-destructive text-glow-red">
                          {Math.round(warning.details.cooldown_seconds / 60)} MIN
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">{t('dashboardSettings')}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {t('configureBaselineValues')}
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-mono">{t('todayBudget')}</Label>
              <Input
                type="number"
                value={userPreferences.today_budget}
                onChange={(e) => {
                  setUserPreferences({
                    ...userPreferences,
                    today_budget: Number(e.target.value)
                  });
                  setUserPrefsVersion(prev => prev + 1); // Force re-render
                }}
                className="font-mono"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Baseline for TODAY SPEND meter calculation
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-mono">{t('weekBudget')}</Label>
              <Input
                type="number"
                value={userPreferences.week_budget}
                onChange={(e) => {
                  setUserPreferences({
                    ...userPreferences,
                    week_budget: Number(e.target.value)
                  });
                  setUserPrefsVersion(prev => prev + 1); // Force re-render
                }}
                className="font-mono"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Baseline for WEEK TOTAL meter calculation
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-mono">{t?.('activeProjectsLimit') || 'Active Projects Limit'}</Label>
              <Input
                type="number"
                value={userPreferences.active_proj_limit}
                onChange={(e) => {
                  setUserPreferences({
                    ...userPreferences,
                    active_proj_limit: Number(e.target.value)
                  });
                  setUserPrefsVersion(prev => prev + 1); // Force re-render
                }}
                className="font-mono"
                step="1"
              />
              <p className="text-xs text-muted-foreground">
                Baseline for {t('activeProj')} meter calculation
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-mono">Warning Threshold</Label>
              <Input
                type="number"
                value={userPreferences.warning_threshold}
                onChange={(e) => {
                  setUserPreferences({
                    ...userPreferences,
                    warning_threshold: Number(e.target.value)
                  });
                  setUserPrefsVersion(prev => prev + 1); // Force re-render
                }}
                className="font-mono"
                step="1"
              />
              <p className="text-xs text-muted-foreground">
                Baseline for WARNINGS meter calculation
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateUserPreferences(userPreferences)}>
              {t?.('saveSettings') || 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
