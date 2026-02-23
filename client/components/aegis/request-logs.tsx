'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { RequestLog } from '@/types/aegis';

interface RequestLogsProps {
  logs: RequestLog[];
}

export function RequestLogs({ logs }: RequestLogsProps) {
  const [filterTenant, setFilterTenant] = useState('');
  const [filterDecision, setFilterDecision] = useState<'all' | 'allowed' | 'blocked'>(
    'all'
  );
  const [filterEndpoint, setFilterEndpoint] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const tenantMatch =
        !filterTenant || log.tenant_id.includes(filterTenant);
      const decisionMatch =
        filterDecision === 'all' || log.decision === filterDecision;
      const endpointMatch =
        !filterEndpoint || log.endpoint.includes(filterEndpoint);

      return tenantMatch && decisionMatch && endpointMatch;
    });
  }, [logs, filterTenant, filterDecision, filterEndpoint]);

  const getDecisionColor = (decision: 'allowed' | 'blocked'): string => {
    if (decision === 'allowed')
      return 'bg-green-500/10 text-green-500 border-green-500/30';
    return 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  const getRejectionColor = (type?: number): string => {
    if (!type) return '';
    if (type === 401) return 'bg-blue-500/10 text-blue-500';
    if (type === 404) return 'bg-gray-500/10 text-gray-500';
    if (type === 429) return 'bg-red-500/10 text-red-500';
    return '';
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-display font-bold mb-2">
            Request Logs Stream
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredLogs.length} of {logs.length} requests
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Tenant ID
            </label>
            <Input
              placeholder="Filter by tenant..."
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Decision
            </label>
            <select
              value={filterDecision}
              onChange={(e) =>
                setFilterDecision(e.target.value as 'all' | 'allowed' | 'blocked')
              }
              className="w-full h-8 px-2 rounded border border-border bg-card text-xs"
            >
              <option value="all">All</option>
              <option value="allowed">Allowed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Endpoint
            </label>
            <Input
              placeholder="Filter by endpoint..."
              value={filterEndpoint}
              onChange={(e) => setFilterEndpoint(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded border border-border/50 hover:border-border hover:bg-card/50 transition-all space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-muted-foreground">
                    {formatTime(log.created_at)}
                  </div>
                  <Badge
                    className={`text-xs border ${getDecisionColor(log.decision)}`}
                    variant="outline"
                  >
                    {log.decision}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-muted-foreground">
                    {log.tenant_id}
                  </span>
                  <span className="text-muted-foreground">{log.endpoint}</span>
                </div>

                {log.decision === 'blocked' && log.reason && (
                  <div className="flex items-center gap-2">
                    {log.rejection_type && (
                      <Badge
                        className={`text-xs font-mono ${getRejectionColor(log.rejection_type)}`}
                        variant="outline"
                      >
                        {log.rejection_type}
                      </Badge>
                    )}
                    <span className="text-muted-foreground">{log.reason}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No logs match your filters
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
