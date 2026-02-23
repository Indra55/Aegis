'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RequestPipeline } from '@/components/aegis/request-pipeline';
import { TenantMetrics } from '@/components/aegis/tenant-metrics';
import { TenantOverview } from '@/components/aegis/tenant-overview';
import { RequestLogs } from '@/components/aegis/request-logs';
import { PlansView } from '@/components/aegis/plans-view';
import { APIKeysView } from '@/components/aegis/api-keys-view';
import { DebugTools } from '@/components/aegis/debug-tools';
import { aegisMockData } from '@/data/aegis-mock';
import aegisAPI from '@/lib/aegis-api';
import type {
  Tenant,
  Plan,
  APIKey,
  RequestLog,
  BurstBucketState,
  RateWindowState,
  QuotaState,
  AnimatedRequest,
} from '@/types/aegis';

export default function AegisGatewayDashboard() {
  // State for real data
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Check health first
      await aegisAPI.health();
      setIsConnected(true);

      // Fetch all data in parallel
      const [plansData, tenantsData, apiKeysData, logsData] = await Promise.all([
        aegisAPI.getPlans(),
        aegisAPI.getTenants(),
        aegisAPI.getAPIKeys(),
        aegisAPI.getRequestLogs({ limit: 100 }),
      ]);

      setPlans(plansData);
      setTenants(tenantsData);
      setApiKeys(apiKeysData);
      setRequestLogs(logsData);

      // Set first tenant as selected if none selected
      if (!selectedTenant && tenantsData.length > 0) {
        setSelectedTenant(tenantsData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch data from API:', err);
      setError('Backend not connected. Using mock data.');
      setIsConnected(false);

      // Fallback to mock data
      setPlans(aegisMockData.plans);
      setTenants(aegisMockData.tenants);
      setApiKeys(aegisMockData.apiKeys);
      setRequestLogs(aegisMockData.requestLogs);

      if (!selectedTenant && aegisMockData.tenants.length > 0) {
        setSelectedTenant(aegisMockData.tenants[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTenant]);

  useEffect(() => {
    fetchData();

    // Refresh data every 10 seconds when connected
    const interval = setInterval(() => {
      if (isConnected) {
        fetchData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData, isConnected]);

  // Create Maps for easier lookup
  const plansMap = useMemo(
    () => new Map(plans.map((p) => [p.id, p])),
    [plans]
  );

  // Metrics for each tenant (calculated based on real data or random for mock)
  const metricsMap = useMemo(() => {
    const map = new Map<
      string,
      { burst: number; rate: number; quota: number }
    >();
    tenants.forEach((tenant) => {
      map.set(tenant.id, {
        burst: Math.random() * 100,
        rate: Math.random() * 100,
        quota: Math.random() * 100,
      });
    });
    return map;
  }, [tenants]);

  // Detailed metrics for selected tenant
  const [selectedTenantMetrics, setSelectedTenantMetrics] = useState<{
    burst: BurstBucketState;
    rate: RateWindowState;
    quota: QuotaState;
  } | null>(null);

  useEffect(() => {
    if (!selectedTenant || !isConnected) {
      // Use mock metrics
      if (selectedTenant) {
        const plan = plansMap.get(selectedTenant.plan_id);
        if (plan) {
          setSelectedTenantMetrics({
            burst: {
              tenant_id: selectedTenant.id,
              tokens: Math.floor(Math.random() * plan.burst_rps),
              lastRefill: new Date().toISOString(),
              capacity: plan.burst_rps,
              refill_rate: 10,
            },
            rate: {
              tenant_id: selectedTenant.id,
              curr: Math.floor(Math.random() * (plan.sustained_rpm / 2)),
              prev: Math.floor(Math.random() * (plan.sustained_rpm / 4)),
              windowStart: new Date(Date.now() - Math.random() * 60000).toISOString(),
              capacity: plan.sustained_rpm,
            },
            quota: {
              tenant_id: selectedTenant.id,
              count: Math.floor(Math.random() * plan.monthly_quota),
              month: new Date().toISOString().slice(0, 7),
              quota: plan.monthly_quota,
              enforcement_type: plan.enforcement_type,
            },
          });
        }
      }
      return;
    }

    // Fetch real metrics
    const fetchMetrics = async () => {
      try {
        const [burst, rate, quota] = await Promise.all([
          aegisAPI.getBurstBucketState(selectedTenant.id),
          aegisAPI.getRateWindowState(selectedTenant.id),
          aegisAPI.getQuotaState(selectedTenant.id),
        ]);
        setSelectedTenantMetrics({ burst, rate, quota });
      } catch (err) {
        console.error('Failed to fetch tenant metrics:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [selectedTenant, isConnected, plansMap]);

  // Handlers for API key operations
  const handleRevokeKey = async (keyId: string) => {
    try {
      await aegisAPI.revokeAPIKey(keyId);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Failed to revoke key:', err);
    }
  };

  const handleGenerateKey = async (tenantId: string) => {
    try {
      const newKey = await aegisAPI.generateAPIKey(tenantId);
      // Show the raw key to user (only shown once!)
      if (newKey.raw_key) {
        alert(`New API Key Generated!\n\nSave this key - it won't be shown again:\n\n${newKey.raw_key}`);
      }
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Failed to generate key:', err);
    }
  };

  // Animated requests (for pipeline visualization)
  const animatedRequests = useMemo<AnimatedRequest[]>(() => {
    // Create some animated requests based on recent logs
    return requestLogs.slice(0, 5).map((log, index) => ({
      id: log.id,
      tenant_id: log.tenant_id,
      created_at: Date.now() - index * 2000,
      currentStage: log.decision === 'allowed' ? 5 : 3,
      status: log.decision === 'allowed' ? 'success' : 'failed',
      rejectionType: log.rejection_type,
      rejectionReason: log.reason,
      path: log.decision === 'allowed' ? 'success' : 'rate',
    })) as AnimatedRequest[];
  }, [requestLogs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Connecting to Aegis Gateway...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              Aegis API Gateway
            </h1>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                {isConnected ? 'Connected' : 'Mock Mode'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="text-xs"
              >
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Real-time visualization of the 5-stage middleware pipeline and tenant metrics
          </p>
          {error && (
            <div className="text-sm text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="pipeline" className="text-xs">
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">
              Metrics
            </TabsTrigger>
            <TabsTrigger value="tenants" className="text-xs">
              Tenants
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">
              Logs
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs">
              Plans
            </TabsTrigger>
            <TabsTrigger value="keys" className="text-xs">
              Keys
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-xs">
              Debug
            </TabsTrigger>
          </TabsList>

          {/* Pipeline View */}
          <TabsContent value="pipeline" className="space-y-6">
            <RequestPipeline requests={animatedRequests} />
          </TabsContent>

          {/* Metrics View */}
          <TabsContent value="metrics" className="space-y-6">
            {selectedTenant && selectedTenantMetrics && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <TenantOverview
                    tenants={tenants}
                    plans={plansMap}
                    metrics={metricsMap}
                    onSelectTenant={setSelectedTenant}
                  />
                </div>
                <div className="lg:col-span-2">
                  <TenantMetrics
                    tenantId={selectedTenant.id}
                    plan={plansMap.get(selectedTenant.plan_id)!}
                    burst={selectedTenantMetrics.burst}
                    rate={selectedTenantMetrics.rate}
                    quota={selectedTenantMetrics.quota}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tenants View */}
          <TabsContent value="tenants" className="space-y-6">
            <TenantOverview
              tenants={tenants}
              plans={plansMap}
              metrics={metricsMap}
              onSelectTenant={setSelectedTenant}
            />
          </TabsContent>

          {/* Logs View */}
          <TabsContent value="logs" className="space-y-6">
            <RequestLogs logs={requestLogs} />
          </TabsContent>

          {/* Plans View */}
          <TabsContent value="plans" className="space-y-6">
            <PlansView plans={plans} tenants={tenants} />
          </TabsContent>

          {/* API Keys View */}
          <TabsContent value="keys" className="space-y-6">
            <APIKeysView
              keys={apiKeys}
              onRevoke={isConnected ? handleRevokeKey : (keyId) => {
                console.log('[Mock] Revoking key:', keyId);
              }}
              onGenerate={isConnected ? handleGenerateKey : (tenantId) => {
                console.log('[Mock] Generating key for tenant:', tenantId);
              }}
            />
          </TabsContent>

          {/* Debug Tools */}
          <TabsContent value="debug" className="space-y-6">
            <DebugTools />
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50 p-4">
            <div className="text-xs text-muted-foreground mb-1">Total Tenants</div>
            <div className="text-2xl font-display font-bold">
              {tenants.length}
            </div>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50 p-4">
            <div className="text-xs text-muted-foreground mb-1">Active Plans</div>
            <div className="text-2xl font-display font-bold">
              {plans.length}
            </div>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50 p-4">
            <div className="text-xs text-muted-foreground mb-1">API Keys</div>
            <div className="text-2xl font-display font-bold">
              {apiKeys.filter((k) => k.status === 'active').length}
            </div>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50 p-4">
            <div className="text-xs text-muted-foreground mb-1">
              Requests (24h)
            </div>
            <div className="text-2xl font-display font-bold">
              {requestLogs.length}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
