'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import aegisAPI from '@/lib/aegis-api';

export function DebugTools() {
  const [redisKeyQuery, setRedisKeyQuery] = useState('');
  const [redisResult, setRedisResult] = useState<unknown>(null);
  const [redisLoading, setRedisLoading] = useState(false);
  const [redisError, setRedisError] = useState<string>('');

  const [testApiKey, setTestApiKey] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [testError, setTestError] = useState<string>('');

  const [burstCount, setBurstCount] = useState('10');
  const [burstLoading, setBurstLoading] = useState(false);
  const [burstResults, setBurstResults] = useState<unknown>(null);
  const [burstError, setBurstError] = useState<string>('');

  const handleQueryRedisKey = async () => {
    if (!redisKeyQuery.trim()) {
      setRedisError('Please enter a Redis key pattern');
      return;
    }

    setRedisLoading(true);
    setRedisError('');
    setRedisResult(null);

    try {
      const result = await aegisAPI.queryRedisKey(redisKeyQuery);
      setRedisResult(result);
    } catch (error) {
      setRedisError(
        error instanceof Error ? error.message : 'Failed to query Redis'
      );
    } finally {
      setRedisLoading(false);
    }
  };

  const handleTestRequest = async () => {
    if (!testApiKey.trim()) {
      setTestError('Please enter an API key');
      return;
    }

    setTestLoading(true);
    setTestError('');
    setTestResult(null);

    try {
      const result = await aegisAPI.testRequest(testApiKey);
      setTestResult(result);
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : 'Failed to test request'
      );
    } finally {
      setTestLoading(false);
    }
  };

  const handleSendBurst = async () => {
    if (!testApiKey.trim()) {
      setBurstError('Please enter an API key');
      return;
    }

    const count = parseInt(burstCount, 10);
    if (isNaN(count) || count < 1 || count > 1000) {
      setBurstError('Burst count must be between 1 and 1000');
      return;
    }

    setBurstLoading(true);
    setBurstError('');
    setBurstResults(null);

    try {
      const result = await aegisAPI.sendBurstRequests(testApiKey, count);
      setBurstResults(result);
    } catch (error) {
      setBurstError(
        error instanceof Error ? error.message : 'Failed to send burst'
      );
    } finally {
      setBurstLoading(false);
    }
  };

  const redisKeyExamples = [
    'apikey:*',
    'tenant:plan:*',
    'burst_bucket:tenant-001',
    'sustained_window:tenant-002',
    'quota:*:2024-01',
  ];

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-display font-bold mb-1">Debug Tools</h3>
          <p className="text-sm text-muted-foreground">
            Introspect Redis state and test API behavior
          </p>
        </div>

        <Tabs defaultValue="redis" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="redis" className="text-xs">
              Redis Inspector
            </TabsTrigger>
            <TabsTrigger value="tester" className="text-xs">
              API Simulator
            </TabsTrigger>
          </TabsList>

          {/* Redis Inspector Tab */}
          <TabsContent value="redis" className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Redis Key Pattern
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., apikey:*"
                  value={redisKeyQuery}
                  onChange={(e) => setRedisKeyQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQueryRedisKey();
                    }
                  }}
                  className="text-xs"
                />
                <Button
                  onClick={handleQueryRedisKey}
                  disabled={redisLoading}
                  className="text-xs h-8 px-4 flex-shrink-0"
                >
                  {redisLoading ? 'Loading...' : 'Query'}
                </Button>
              </div>

              {/* Examples */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Examples:</p>
                <div className="flex flex-wrap gap-1">
                  {redisKeyExamples.map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setRedisKeyQuery(example);
                      }}
                      className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Result Display */}
            {redisError && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-500">
                {redisError}
              </div>
            )}

            {redisResult && (
              <div className="p-3 rounded bg-card/80 border border-border/50 font-mono text-xs text-muted-foreground max-h-64 overflow-y-auto">
                <pre>{JSON.stringify(redisResult, null, 2)}</pre>
              </div>
            )}
          </TabsContent>

          {/* API Simulator Tab */}
          <TabsContent value="tester" className="space-y-4">
            {/* Single Request Test */}
            <div className="space-y-3 pb-4 border-b border-border/50">
              <h4 className="text-sm font-bold">Single Request Test</h4>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">API Key</label>
                <Input
                  placeholder="Enter x-api-key value"
                  value={testApiKey}
                  onChange={(e) => setTestApiKey(e.target.value)}
                  className="text-xs"
                  type="password"
                />
              </div>

              <Button
                onClick={handleTestRequest}
                disabled={testLoading}
                className="w-full text-xs h-8"
              >
                {testLoading ? 'Testing...' : 'Send Request'}
              </Button>

              {testError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-500">
                  {testError}
                </div>
              )}

              {testResult && (
                <div className="p-3 rounded bg-card/80 border border-border/50 font-mono text-xs text-muted-foreground max-h-48 overflow-y-auto">
                  <pre>{JSON.stringify(testResult, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Burst Test */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold">Burst Request Test</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Request Count
                  </label>
                  <Input
                    placeholder="10"
                    type="number"
                    min="1"
                    max="1000"
                    value={burstCount}
                    onChange={(e) => setBurstCount(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleSendBurst}
                    disabled={burstLoading}
                    className="w-full text-xs h-8"
                  >
                    {burstLoading ? 'Sending...' : 'Send Burst'}
                  </Button>
                </div>
              </div>

              {burstError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-500">
                  {burstError}
                </div>
              )}

              {burstResults && (
                <div className="p-3 rounded bg-card/80 border border-border/50 font-mono text-xs text-muted-foreground max-h-48 overflow-y-auto">
                  <pre>{JSON.stringify(burstResults, null, 2)}</pre>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}
