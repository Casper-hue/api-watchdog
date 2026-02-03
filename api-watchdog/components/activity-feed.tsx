"use client"

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils"
import { useI18n } from '@/contexts/i18n-context';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Bell,
  ChevronRight,
  MessageSquare,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface ActivityItem {
  id: string
  level: 0 | 1 | 2 | 3 | 4
  timestamp: string
  project: string
  message: string
  details: {
    cost?: string
    similarity?: number
    efficiency?: string
    limitDuration?: string
  }
  canFeedback?: boolean
}

interface RecentActivity {
  id: string;
  timestamp: string; // ISO date string
  project_id: string;
  level: 1 | 2 | 3 | 4;
  message: string;
  details: {
    cost_usd?: number;
    similarity_score?: number;
    efficiency_rating?: string;
    rate_limited_duration_min?: number;
  };
}

const levelConfig = {
  0: {
    icon: CheckCircle2,
    ledClass: "led-on-green",
    textClass: "text-success text-glow-green",
    borderColor: "border-success/50",
    bgColor: "bg-success/5",
    label: "LVL-0",
  },
  1: {
    icon: CheckCircle2,
    ledClass: "led-on-green",
    textClass: "text-success text-glow-green",
    borderColor: "border-success/50",
    bgColor: "bg-success/5",
    label: "LVL-1",
  },
  2: {
    icon: Bell,
    ledClass: "led-on-amber",
    textClass: "text-warning text-glow-amber",
    borderColor: "border-warning/50",
    bgColor: "bg-warning/5",
    label: "LVL-2",
  },
  3: {
    icon: AlertTriangle,
    ledClass: "led-on-amber",
    textClass: "text-accent text-glow-amber",
    borderColor: "border-accent/50",
    bgColor: "bg-accent/5",
    label: "LVL-3",
  },
  4: {
    icon: AlertOctagon,
    ledClass: "led-on-red",
    textClass: "text-destructive text-glow-red",
    borderColor: "border-destructive/50",
    bgColor: "bg-destructive/5",
    label: "LVL-4",
  },
}

function ActivityItemCard({ item }: { item: ActivityItem }) {
  const { t } = useI18n();
  // Safe config access with fallback
  const config = levelConfig[item.level] || levelConfig[0]
  const Icon = config.icon
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          "industrial-raised p-4 space-y-3 border-l-4",
          config.borderColor
        )}
      >
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* LED and Icon */}
          <div className="flex items-center gap-2">
            <div className={cn("led-indicator", config.ledClass)} />
            <Icon className={cn("h-4 w-4", config.textClass)} />
          </div>
          
          {/* Timestamp */}
          <span className="embossed-label">{item.timestamp}</span>
          
          {/* Project badge */}
          <div className="industrial-meter px-2 py-0.5">
            <span className="text-[10px] font-bold tracking-wider text-primary">
              {item.project}
            </span>
          </div>
          
          {/* Level badge */}
          <div className={cn(
            "px-2 py-0.5 border-2 text-[10px] font-bold tracking-wider",
            config.borderColor,
            config.bgColor,
            config.textClass
          )}>
            {config.label}
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground leading-relaxed pl-6">
          {item.message}
        </p>

        {/* Details row */}
        <div className="flex flex-wrap items-center gap-4 pl-6">
          {item.details.cost && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t('costLabel')}</span>
              <span className="text-xs font-bold text-accent text-glow-amber">
                {item.details.cost}
              </span>
            </div>
          )}
          {item.details.similarity !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t('similarityLabel')}</span>
              <span className="text-xs font-bold text-warning text-glow-amber">
                {item.details.similarity}%
              </span>
            </div>
          )}
          {item.details.efficiency && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t('efficiencyLabel')}</span>
              <span className="text-xs font-bold text-success text-glow-green">
                {item.details.efficiency}
              </span>
            </div>
          )}
          {item.details.limitDuration && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{t('rateLimitedLabel')}</span>
              <span className="text-xs font-bold text-destructive text-glow-red">
                {item.details.limitDuration}
              </span>
            </div>
          )}
        </div>

        {/* Feedback button */}
        {item.canFeedback && (
          <button 
            className="industrial-button ml-6 px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              setIsReportDialogOpen(true); // Open the dialog
            }}
          >
            <MessageSquare className="h-3 w-3" />
            REPORT FALSE POSITIVE
          </button>
        )}
      </div>

      {/* Report False Positive Dialog */}
      {item.canFeedback && (
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report False Positive</DialogTitle>
              <DialogDescription>
                Confirm that you want to report this activity as a false positive.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-foreground mb-2">Activity: {item.message}</p>
              <p className="text-xs text-muted-foreground">ID: {item.id}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                className="industrial-button px-3 py-1.5 text-xs"
                onClick={() => setIsReportDialogOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="industrial-button-primary px-3 py-1.5 text-xs"
                onClick={async () => {
                  try {
                    // Send feedback to backend API
                    const response = await fetch('/api/feedback', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        request_id: item.id,
                        is_accurate: 0, // 0 for false positive
                        message: `False positive reported for: ${item.message}`,
                        project_id: item.project
                      })
                    });
                    
                    if (response.ok) {
                      console.log(`Successfully reported false positive for activity: ${item.id}`);
                      // Optionally update UI to reflect submission
                    } else {
                      console.error('Failed to submit false positive report');
                    }
                    
                    setIsReportDialogOpen(false);
                  } catch (error) {
                    console.error('Failed to submit false positive report:', error);
                  }
                }}
              >
                Confirm Report
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export function ActivityFeed() {
  const { t, language } = useI18n();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Pass the current language to the backend API
        const response = await fetch(`/api/activities/recent`, {
          headers: {
            'Accept-Language': language
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        // Check if data is valid before mapping
        if (!responseData || !responseData.activities || !Array.isArray(responseData.activities)) {
          console.warn('Invalid data received from /api/activities/recent:', responseData);
          setActivities([]);
          return;
        }
        
        // Transform the API data to match the expected ActivityItem format
        const transformedActivities: ActivityItem[] = responseData.activities.map((item: any) => ({
          id: item.id,
          level: item.level,
          timestamp: item.timestamp,
          project: item.project_id,
          message: item.message,
          details: {
            cost: item.details.cost_usd ? `$${item.details.cost_usd.toFixed(2)}` : undefined,
            similarity: item.details.similarity_score,
            efficiency: item.details.efficiency_rating,
            limitDuration: item.details.cooldown_seconds ? `${Math.round(item.details.cooldown_seconds / 60)} MIN` : undefined
          },
          canFeedback: item.level >= 2 // Level 2+ activities can be reported as false positives
        }));
        
        setActivities(transformedActivities);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        // Show empty array if API fails
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Calculate pagination
  const defaultItemsToShow = 3;
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Get activities to display based on current state
  const displayedActivities = showAll 
    ? activities.slice(startIndex, endIndex)
    : activities.slice(0, defaultItemsToShow);

  if (loading) {
    return (
      <div className="industrial-panel p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="industrial-meter p-2">
              <Clock className="h-5 w-5 text-primary text-glow-amber" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider text-primary text-glow-amber">
          {t('recentActivity')}
        </h3>
        <p className="embossed-label inline-block mt-1">
          {t('loadingActivities')}
        </p>
            </div>
          </div>
          <div className="industrial-button px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1">
            <div className="h-3 w-3"></div>
          </div>
        </div>
        
        <div className="space-y-3 relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border hidden lg:block" />
          
          {[...Array(4)].map((_, i) => (
            <div key={i} className="industrial-raised p-4 space-y-3 border-l-4 border-success/50">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="led-indicator led-on-green" />
                  <div className="h-4 w-4 bg-gray-700 rounded"></div>
                </div>
                <div className="embossed-label h-4 bg-gray-700 rounded w-16"></div>
                <div className="industrial-meter px-2 py-0.5">
                  <div className="h-3 bg-gray-700 rounded w-12"></div>
                </div>
                <div className="px-2 py-0.5 border-2 text-[10px] font-bold tracking-wider bg-success/5 text-success text-glow-green border-success/50">
                  LVL-1
                </div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-3/4 pl-6"></div>
              <div className="flex flex-wrap items-center gap-4 pl-6">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">COST:</span>
                  <span className="text-xs font-bold text-accent text-glow-amber">$0.12</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="industrial-panel p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="industrial-meter p-2">
            <Clock className="h-5 w-5 text-primary text-glow-amber" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider text-primary text-glow-amber">
              {t('recentActivity')}
            </h3>
            <p className="embossed-label inline-block mt-1">
              {t('latestApiInteractions')}
            </p>
          </div>
        </div>
        <button 
          className="industrial-button px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1"
          onClick={() => {
            if (!showAll) {
              // Show all activities with pagination
              setShowAll(true);
              setCurrentPage(1);
            } else {
              // Collapse back to default view
              setShowAll(false);
            }
          }}
        >
          {showAll ? t('showLess') : t('viewAll')}
          <ChevronRight className={`h-3 w-3 transition-transform ${showAll ? 'rotate-90' : ''}`} />
        </button>
      </div>
      
      {/* Activity timeline */}
      <div className="space-y-3 relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-border hidden lg:block" />
        
        {displayedActivities.map((item: ActivityItem) => (
          <ActivityItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Pagination controls (only show when viewing all) */}
      {showAll && activities.length > itemsPerPage && (
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <button
            className="industrial-button px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronRight className="h-3 w-3 rotate-180" />
            PREV
          </button>
          
          <span className="font-mono text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            className="industrial-button px-3 py-1.5 text-[10px] font-bold tracking-wider text-muted-foreground flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            NEXT
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
