'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { APIKey } from '@/types/aegis';

interface APIKeysViewProps {
  keys: APIKey[];
  onRevoke?: (keyId: string) => void;
  onGenerate?: (tenantId: string) => void;
}

export function APIKeysView({ keys, onRevoke, onGenerate }: APIKeysViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawKey, setShowRawKey] = useState<Set<string>>(new Set());

  const handleCopyKey = (keyId: string, rawKey?: string) => {
    if (!rawKey) return;
    navigator.clipboard.writeText(rawKey);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowRawKey = (keyId: string) => {
    const newSet = new Set(showRawKey);
    if (newSet.has(keyId)) {
      newSet.delete(keyId);
    } else {
      newSet.add(keyId);
    }
    setShowRawKey(newSet);
  };

  const formatDate = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    if (status === 'active')
      return 'bg-green-500/10 text-green-500 border-green-500/30';
    return 'bg-red-500/10 text-red-500 border-red-500/30';
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display font-bold mb-1">API Keys</h3>
            <p className="text-sm text-muted-foreground">
              {keys.length} total keys (
              {keys.filter((k) => k.status === 'active').length} active)
            </p>
          </div>
          <Button
            onClick={() => onGenerate?.('new-tenant')}
            className="text-xs h-8"
          >
            Generate Key
          </Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {keys.map((key) => (
            <div
              key={key.id}
              className="p-4 rounded border border-border/50 hover:border-border hover:bg-card/50 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-sm truncate">
                      {key.id}
                    </span>
                    <Badge
                      className={`text-xs border flex-shrink-0 ${getStatusColor(key.status)}`}
                      variant="outline"
                    >
                      {key.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tenant: <span className="font-mono">{key.tenant_id}</span>
                  </p>
                </div>
              </div>

              {/* Key display with show/hide toggle */}
              {key.raw_key && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Raw Key (shown once)
                    </span>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => toggleShowRawKey(key.id)}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                      >
                        {showRawKey.has(key.id) ? 'Hide' : 'Show'}
                      </Button>
                      <Button
                        onClick={() =>
                          handleCopyKey(key.id, key.raw_key)
                        }
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                      >
                        {copiedKey === key.id ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  {showRawKey.has(key.id) ? (
                    <div className="p-2 rounded bg-card/80 border border-border/50 font-mono text-xs break-all text-muted-foreground">
                      {key.raw_key}
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-card/80 border border-border/50 font-mono text-xs text-muted-foreground">
                      {'•'.repeat(32)}
                    </div>
                  )}
                </div>
              )}

              {/* Key hash display */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Hash</div>
                <div className="p-2 rounded bg-card/80 border border-border/50 font-mono text-xs text-muted-foreground">
                  {key.key_hash}
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <div className="font-mono text-muted-foreground">
                    {formatDate(key.created_at)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Used:</span>
                  <div className="font-mono text-muted-foreground">
                    {formatDate(key.last_used_at)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {key.status === 'active' && (
                <div className="pt-2 border-t border-border/50">
                  <Button
                    onClick={() => onRevoke?.(key.id)}
                    variant="destructive"
                    size="sm"
                    className="text-xs h-7 w-full"
                  >
                    Revoke Key
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {keys.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No API keys found
          </div>
        )}
      </div>
    </Card>
  );
}
