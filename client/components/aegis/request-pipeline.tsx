'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { AnimatedRequest } from '@/types/aegis';

const STAGES = [
  { id: 0, label: 'Auth Keeper', color: 'from-blue-500' },
  { id: 1, label: 'Plan Oracle', color: 'from-purple-500' },
  { id: 2, label: 'Burst Breaker', color: 'from-pink-500' },
  { id: 3, label: 'Rate Warden', color: 'from-orange-500' },
  { id: 4, label: 'Quota Arbiter', color: 'from-red-500' },
];

interface RequestPipelineProps {
  requests: AnimatedRequest[];
  onStageProgress?: (requestId: string, stage: number) => void;
}

export function RequestPipeline({
  requests,
  onStageProgress,
}: RequestPipelineProps) {
  const [animatingRequests, setAnimatingRequests] = useState<AnimatedRequest[]>(
    requests
  );

  useEffect(() => {
    setAnimatingRequests(requests);
  }, [requests]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatingRequests((prev) =>
        prev.map((req) => {
          if (req.status === 'in-flight' && req.currentStage < 5) {
            const nextStage = req.currentStage + 1;
            onStageProgress?.(req.id, nextStage);

            // Randomly decide if this request will be blocked (simulate failures)
            if (nextStage < 5 && Math.random() > 0.7) {
              return {
                ...req,
                currentStage: nextStage,
                status: 'failed',
                rejectionType: [401, 404, 429][Math.floor(Math.random() * 3)] as 401 | 404 | 429,
              };
            }

            if (nextStage === 5) {
              return {
                ...req,
                currentStage: nextStage,
                status: 'success',
              };
            }

            return {
              ...req,
              currentStage: nextStage,
            };
          }
          return req;
        })
      );
    }, 800);

    return () => clearInterval(interval);
  }, [onStageProgress]);

  const getStageColor = (
    stage: number,
    isBlocked: boolean
  ): string => {
    if (isBlocked) return 'bg-red-500/20 border-red-500';
    return `${STAGES[stage]?.color || 'from-gray-500'} bg-gradient-to-r to-transparent bg-opacity-20 border-${STAGES[stage]?.color.split('-')[1]}-500`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50 p-6">
      <div className="space-y-2 mb-6">
        <h3 className="text-lg font-display font-bold">Request Pipeline</h3>
        <p className="text-sm text-muted-foreground">
          5-stage middleware flow with {animatingRequests.length} active requests
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2 items-end mb-8 min-w-max">
          {STAGES.map((stage, idx) => (
            <div
              key={stage.id}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className="text-xs font-mono text-muted-foreground text-center w-20">
                Stage {idx + 1}
              </div>
              <div className="w-20 h-12 rounded border border-border/50 bg-card flex items-center justify-center relative overflow-hidden">
                <div className={`absolute inset-0 ${stage.color} to-transparent opacity-10`} />
                <span className="text-xs font-bold text-center px-2 relative z-10">
                  {stage.label}
                </span>
              </div>

              {/* Request particles in this stage */}
              <div className="flex flex-col gap-1 mt-4 min-h-[60px]">
                {animatingRequests.map((req) => {
                  if (
                    req.currentStage === idx &&
                    (req.status === 'in-flight' || req.status === 'failed')
                  ) {
                    return (
                      <div
                        key={req.id}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold animate-pulse ${
                          req.status === 'failed'
                            ? 'border-red-500 bg-red-500/20'
                            : `border-${stage.color.split('-')[1]}-500 bg-${stage.color.split('-')[1]}-500/10`
                        }`}
                      >
                        {req.tenant_id.slice(-2)}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {/* Success exit */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="text-xs font-mono text-muted-foreground text-center w-20">
              Exit
            </div>
            <div className="w-20 h-12 rounded border border-border/50 bg-green-500/5 border-green-500/50 flex items-center justify-center">
              <span className="text-xs font-bold text-green-500">200 OK</span>
            </div>

            {/* Success particles */}
            <div className="flex flex-col gap-1 mt-4 min-h-[60px]">
              {animatingRequests.map((req) => {
                if (req.status === 'success') {
                  return (
                    <div
                      key={req.id}
                      className="w-6 h-6 rounded-full border-2 border-green-500 bg-green-500/20 flex items-center justify-center text-xs font-bold animate-pulse"
                    >
                      {req.tenant_id.slice(-2)}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Rejection summary */}
      {animatingRequests.some((r) => r.status === 'failed') && (
        <div className="mt-6 pt-4 border-t border-border/50 space-y-2">
          <h4 className="text-xs font-bold text-destructive">Rejections</h4>
          {animatingRequests
            .filter((r) => r.status === 'failed')
            .map((req) => (
              <div
                key={req.id}
                className="text-xs text-muted-foreground flex items-center gap-2"
              >
                <span className="w-6 h-6 rounded-full border border-red-500/50 bg-red-500/10 flex items-center justify-center text-xs font-bold">
                  {req.rejectionType}
                </span>
                <span>{req.rejectionReason}</span>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
