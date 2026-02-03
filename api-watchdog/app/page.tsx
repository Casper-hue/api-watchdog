"use client"

import * as React from "react";
import { AppShell } from "@/components/app-shell"
import { StatCards } from "@/components/stat-cards"
import { ConsumptionChart } from "@/components/consumption-chart"
import { ActivityFeed } from "@/components/activity-feed"
import { useI18n } from "@/contexts/i18n-context"

export default function DashboardPage() {
  const { t, language } = useI18n();
  const rollingSigns = React.useMemo(() => [
    t('feedTheMachineMessage'),
    t('aiLandlordMessage'),
    t('countingCostMessage'),
    t('auditingPatriarchyMessage'),
    t('manicPixieMessage'),
    t('notJudgingMessage'),
    t('calculatingDistanceMessage'),
    t('anotherDayMessage'),
    t('percentProgressMessage')
  ], [language]); // Only recreate when language changes
  const [randomSign, setRandomSign] = React.useState('');

  // Function to generate a new random sign
  const generateNewRandomSign = React.useCallback(() => {
    const newRandomSign = rollingSigns[Math.floor(Math.random() * rollingSigns.length)];
    setRandomSign(newRandomSign);
  }, [rollingSigns]);

  // Ref to track if we're currently animating/transitioning
  const isUpdatingRef = React.useRef(false);

  const handleRefreshSign = React.useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event bubbling
    }
    
    // If we're already updating, don't trigger another update
    if (isUpdatingRef.current) {
      return;
    }
    
    isUpdatingRef.current = true;
    generateNewRandomSign();
    
    // Reset the flag after a short delay to prevent rapid clicks
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 300);
  }, [generateNewRandomSign]);

  React.useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    generateNewRandomSign();
  }, []); // Empty dependency array to run only once on mount

  return (
    <AppShell onRefreshSign={handleRefreshSign}>
      <div className="space-y-6 lg:space-y-8">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t('dashboard')}
          </h1>
          <p className="font-mono text-sm text-muted-foreground" onClick={handleRefreshSign}>
            {randomSign || rollingSigns[0]} {/* Fallback to first sign during hydration */}
          </p>
        </div>

        {/* Stat Cards */}
        <StatCards />

        {/* Charts and Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ConsumptionChart />
          <ActivityFeed />
        </div>
      </div>
    </AppShell>
  )
}
