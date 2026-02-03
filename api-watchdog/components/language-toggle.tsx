'use client';

import React from 'react';
import { useI18n } from '@/contexts/i18n-context';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useI18n();

  return (
    <button
      onClick={toggleLanguage}
      className="industrial-panel flex items-center justify-center p-2 text-muted-foreground hover:text-primary transition-colors"
      aria-label={language === 'en' ? 'Switch to Chinese' : 'Switch to English'}
    >
      <Globe className="h-5 w-5" />
      <span className="sr-only">{t(language === 'en' ? 'statistics' : 'dashboard')}</span>
      <span className="ml-1 text-[10px] font-mono">
        {language === 'en' ? 'EN' : '中'}
      </span>
    </button>
    );
}