"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Save,
  Coffee,
  Utensils,
  DollarSign,
  Shield,
  Lock,
  Plus,
  Trash2,
  Edit3,
  Download,
  RefreshCw
} from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

export default function SettingsPage() {
  const { t } = useI18n();
  const [pricingConfig, setPricingConfig] = React.useState<{
    exchange_rate_usd_to_cny: number;
    equivalents: {
      coffee: number;
      jianbing: number;
      meal: number;
      hotpot: number;
    };
    models: Record<string, { input: number; output: number }>;
  }>({
    exchange_rate_usd_to_cny: 7.3,
    equivalents: {
      coffee: 15,
      jianbing: 8,
      meal: 50,
      hotpot: 120,
    },
    models: {}
  });

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settingsData = await response.json();
          setPricingConfig(settingsData.pricing || {
            exchange_rate_usd_to_cny: 7.3,
            equivalents: {
              coffee: 15,
              jianbing: 8,
              meal: 50,
              hotpot: 120,
            },
            models: {}
          });
        } else {
          console.error('Failed to fetch settings, using defaults');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const [privacyConfig, setPrivacyConfig] = React.useState({
    store_request_content: false,
    similarity_method: "hash",
    cache_ttl_seconds: 3600,
    anonymize_project_id: true,
  });

  const [notificationConfig, setNotificationConfig] = React.useState({
    email_notifications: false,
    slack_notifications: false,
    webhook_enabled: false,
  });

  const [newModelName, setNewModelName] = React.useState("");
  const [editingModel, setEditingModel] = React.useState<string | null>(null);
  const [tempModelName, setTempModelName] = React.useState("");

  const handleSaveSettings = async () => {
    try {
      // Prepare the data to send, including all configurations
      const settingsToSend = {
        pricing: {
          ...pricingConfig,
          // Ensure models object is properly structured
          models: Object.keys(pricingConfig.models).length > 0 ? pricingConfig.models : {}
        },
        privacy: privacyConfig,
        notification: notificationConfig
      };
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSend),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert("Settings saved successfully!");
      } else {
        console.error('Failed to save settings:', result.message);
        alert(`Failed to save settings: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    }
  };

  const updateModelPrice = (model: string, type: 'input' | 'output', value: string) => {
    setPricingConfig(prev => ({
      ...prev,
      models: {
        ...prev.models,
        [model]: {
          ...prev.models[model as keyof typeof prev.models],
          [type]: parseFloat(value) || 0
        }
      }
    }));
  };

  const addModel = () => {
    const trimmedName = newModelName.trim();
    if (trimmedName && !(trimmedName in pricingConfig.models)) {
      setPricingConfig(prev => ({
        ...prev,
        models: {
          ...prev.models,
          [trimmedName]: { input: 0, output: 0 }
        }
      }));
      setNewModelName("");
      console.log(`Added new model: ${trimmedName}`);
    } else {
      console.log(`Could not add model: "${trimmedName}", exists: ${trimmedName in pricingConfig.models}, valid: ${!!trimmedName}`);
    }
  };

  const deleteModel = (modelName: string) => {
    setPricingConfig(prev => {
      const newModels = { ...prev.models } as Record<string, { input: number; output: number }>;
      delete newModels[modelName];
      return { ...prev, models: newModels };
    });
  };

  const startEditingModel = (modelName: string) => {
    setEditingModel(modelName);
    setTempModelName(modelName);
  };

  const saveModelNameEdit = (oldName: string) => {
    if (tempModelName.trim() && tempModelName !== oldName && !(tempModelName.trim() in pricingConfig.models)) {
      setPricingConfig(prev => {
        const newModels = { ...prev.models } as Record<string, { input: number; output: number }>;
        const modelData = newModels[oldName as keyof typeof newModels];
        delete newModels[oldName];
        newModels[tempModelName.trim() as keyof typeof newModels] = modelData;
        return { ...prev, models: newModels };
      });
    }
    setEditingModel(null);
    setTempModelName("");
  };

  const cancelModelNameEdit = () => {
    setEditingModel(null);
    setTempModelName("");
  };

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t('settings')}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            {t('configureGlobalSettings')}
          </p>
        </div>

        {/* Pricing Configuration */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-mono text-base">
                  {t('pricingCurrencySettings')}
                </CardTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {t('configureExchangeRatesAndModelPricing')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exchange Rate */}
            <div className="space-y-3">
              <Label className="font-mono text-sm">{t('usdToCnyExchangeRate')}</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  step="0.01"
                  value={pricingConfig.exchange_rate_usd_to_cny}
                  onChange={(e) => setPricingConfig(prev => ({
                    ...prev,
                    exchange_rate_usd_to_cny: parseFloat(e.target.value) || 0
                  }))}
                  className="w-32 font-mono"
                />
                <span className="font-mono text-sm text-muted-foreground">
                    USD = 1 CNY
                  </span>
              </div>
            </div>

            {/* Equivalent Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="font-mono text-sm">{t('coffeePrice')}</Label>
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    value={pricingConfig.equivalents.coffee}
                    onChange={(e) => setPricingConfig(prev => ({
                      ...prev,
                      equivalents: {
                        ...prev.equivalents,
                        coffee: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-24 font-mono"
                  />
                  <span className="font-mono text-sm text-muted-foreground">yuan</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="font-mono text-sm">{t('jianbingPrice')}</Label>
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    value={pricingConfig.equivalents.jianbing}
                    onChange={(e) => setPricingConfig(prev => ({
                      ...prev,
                      equivalents: {
                        ...prev.equivalents,
                        jianbing: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-24 font-mono"
                  />
                  <span className="font-mono text-sm text-muted-foreground">yuan</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="font-mono text-sm">{t('mealPrice')}</Label>
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    value={pricingConfig.equivalents.meal}
                    onChange={(e) => setPricingConfig(prev => ({
                      ...prev,
                      equivalents: {
                        ...prev.equivalents,
                        meal: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-24 font-mono"
                  />
                  <span className="font-mono text-sm text-muted-foreground">yuan</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="font-mono text-sm">{t('hotpotPrice')}</Label>
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" />
                  <Input
                    type="number"
                    value={pricingConfig.equivalents.hotpot}
                    onChange={(e) => setPricingConfig(prev => ({
                      ...prev,
                      equivalents: {
                        ...prev.equivalents,
                        hotpot: parseFloat(e.target.value) || 0
                      }
                    }))}
                    className="w-24 font-mono"
                  />
                  <span className="font-mono text-sm text-muted-foreground">yuan</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Pricing Configuration */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="font-mono text-base">
                  {t('modelPricingConfiguration')}
                </CardTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {t('setPricingForModels')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/models/pricing/fetch-official');
                        const result = await response.json();
                        
                        if (result.success) {
                          // Merge official pricing with existing pricing, but don't override existing prices
                          setPricingConfig(prev => {
                            const updatedModels = {...prev.models};
                            
                            // Only add models that don't already exist
                            for (const [model, pricing] of Object.entries(result.data)) {
                              if (!(model in updatedModels)) {
                                // Type assertion to ensure proper typing
                                const typedPricing = pricing as { input: number; output: number };
                                updatedModels[model] = typedPricing;
                              }
                            }
                            
                            return {
                              ...prev,
                              models: updatedModels
                            };
                          });
                          alert("Official pricing loaded (new models only)!");
                        } else {
                          alert("Failed to load official pricing");
                        }
                      } catch (error) {
                        console.error("Error fetching official pricing:", error);
                        alert("Error loading official pricing");
                      }
                    }}
                    className="gap-1 font-mono text-xs h-8"
                  >
                    <Download className="h-3 w-3" />
                    {t('loadOfficial')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/models/pricing/fetch-official');
                        const result = await response.json();
                        
                        if (result.success) {
                          // Replace ALL pricing with official pricing (including existing models)
                          setPricingConfig(prev => ({
                            ...prev,
                            models: result.data as Record<string, { input: number; output: number }> // Type assertion for the models object
                          }));
                          alert("All pricing updated to official prices!");
                        } else {
                          alert("Failed to load official pricing");
                        }
                      } catch (error) {
                        console.error("Error fetching official pricing:", error);
                        alert("Error loading official pricing");
                      }
                    }}
                    className="gap-1 font-mono text-xs h-8"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t('updateAll')}
                  </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Model Form */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1">
                <Label className="font-mono text-sm">{t('addModel')}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Enter model name (e.g., my-custom-model)"
                    className="font-mono text-sm border border-input"
                  />
                  <Button 
                    onClick={addModel} 
                    disabled={!newModelName.trim() || newModelName.trim() in pricingConfig.models}
                    className="gap-1 font-mono text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    {t('addModel')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Models List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(pricingConfig.models).map(([model, pricing]) => (
                <div key={model} className="space-y-3 p-4 border border-border rounded-lg bg-secondary/20">
                  <div className="flex justify-between items-start">
                    {editingModel === model ? (
                      <div className="flex-1 flex gap-1">
                        <Input
                          type="text"
                          value={tempModelName}
                          onChange={(e) => setTempModelName(e.target.value)}
                          className="font-mono text-sm flex-1"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => saveModelNameEdit(model)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={cancelModelNameEdit}
                          className="h-7 w-7 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-mono text-sm font-bold capitalize">{model.replace(/-/g, ' ')}</h3>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEditingModel(model)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteModel(model)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="font-mono text-xs">{t('inputPrice')}</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={pricing.input}
                        onChange={(e) => updateModelPrice(model, 'input', e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="font-mono text-xs">{t('outputPrice')}</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={pricing.output}
                        onChange={(e) => updateModelPrice(model, 'output', e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-mono text-base">
                  {t('privacySecuritySettings')}
                </CardTitle>
                <p className="font-mono text-xs text-muted-foreground">
                  {t('configureDataHandlingPrivacy')}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-4">
                <div className="space-y-1">
                  <Label className="font-mono text-sm">{t('storeRequestContent')}</Label>
                  <p className="font-mono text-xs text-muted-foreground">
                    {t('storeRequestContentForAnalysis')}
                  </p>
                </div>
                <Switch
                  checked={privacyConfig.store_request_content}
                  onCheckedChange={(checked) => setPrivacyConfig(prev => ({ ...prev, store_request_content: checked }))}
                />
              </div>

              <div className="space-y-3">
                <Label className="font-mono text-sm">{t('similarityDetectionMethod')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={privacyConfig.similarity_method === "hash" ? "default" : "outline"}
                    className="font-mono text-xs"
                    onClick={() => setPrivacyConfig(prev => ({ ...prev, similarity_method: "hash" }))}
                  >
                    {t('hashBased')}
                  </Button>
                  <Button
                    variant={privacyConfig.similarity_method === "text" ? "default" : "outline"}
                    className="font-mono text-xs"
                    onClick={() => setPrivacyConfig(prev => ({ ...prev, similarity_method: "text" }))}
                  >
                    {t('textBased')}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-mono text-sm">{t('cacheTTL')}</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={privacyConfig.cache_ttl_seconds}
                    onChange={(e) => setPrivacyConfig(prev => ({
                      ...prev,
                      cache_ttl_seconds: parseInt(e.target.value) || 0
                    }))}
                    className="w-32 font-mono"
                  />
                  <span className="font-mono text-sm text-muted-foreground">
                    {t('cacheExpirationTime')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-4">
                <div className="space-y-1">
                  <Label className="font-mono text-sm">{t('anonymizeProjectIDs')}</Label>
                  <p className="font-mono text-xs text-muted-foreground">
                      {t('applySHA256')}
                    </p>
                </div>
                <Switch
                  checked={privacyConfig.anonymize_project_id}
                  onCheckedChange={(checked) => setPrivacyConfig(prev => ({ ...prev, anonymize_project_id: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            className="gap-2 font-mono text-sm"
            onClick={handleSaveSettings}
          >
            <Save className="h-4 w-4" />
            {t('saveAllSettings')}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}