export interface Metrics {
  tunnels: {
    active: number;
    total: number;
    byToken: Map<string, number>;
  };
  requests: {
    total: number;
    pending: number;
    succeeded: number;
    failed: number;
    rateLimited: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  errors: {
    total: number;
    byType: Map<string, number>;
  };
}

export class MetricsCollector {
  private metrics: Metrics = {
    tunnels: {
      active: 0,
      total: 0,
      byToken: new Map(),
    },
    requests: {
      total: 0,
      pending: 0,
      succeeded: 0,
      failed: 0,
      rateLimited: 0,
    },
    performance: {
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
    },
    errors: {
      total: 0,
      byType: new Map(),
    },
  };

  private responseTimes: number[] = [];
  private readonly MAX_RESPONSE_TIMES = 1000;

  recordTunnelRegistered(token: string): void {
    this.metrics.tunnels.active++;
    this.metrics.tunnels.total++;

    const count = this.metrics.tunnels.byToken.get(token) || 0;
    this.metrics.tunnels.byToken.set(token, count + 1);
  }

  recordTunnelClosed(token: string): void {
    this.metrics.tunnels.active--;

    const count = this.metrics.tunnels.byToken.get(token) || 0;
    if (count > 0) {
      this.metrics.tunnels.byToken.set(token, count - 1);
    }
  }

  recordRequest(): void {
    this.metrics.requests.total++;
    this.metrics.requests.pending++;
  }

  recordRequestCompleted(durationMs: number, success: boolean): void {
    this.metrics.requests.pending--;

    if (success) {
      this.metrics.requests.succeeded++;
    } else {
      this.metrics.requests.failed++;
    }

    this.responseTimes.push(durationMs);
    if (this.responseTimes.length > this.MAX_RESPONSE_TIMES) {
      this.responseTimes.shift();
    }

    this.updatePerformanceMetrics();
  }

  recordRateLimitExceeded(): void {
    this.metrics.requests.rateLimited++;
  }

  recordError(errorType: string): void {
    this.metrics.errors.total++;

    const count = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, count + 1);
  }

  private updatePerformanceMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    this.metrics.performance.avgResponseTime = sum / sorted.length;
    this.metrics.performance.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)];
    this.metrics.performance.p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)];
  }

  getMetrics(): Metrics {
    return {
      ...this.metrics,
      tunnels: {
        ...this.metrics.tunnels,
        byToken: new Map(this.metrics.tunnels.byToken),
      },
      errors: {
        ...this.metrics.errors,
        byType: new Map(this.metrics.errors.byType),
      },
    };
  }

  getMetricsSummary(): string {
    const m = this.metrics;
    return `
📊 Metrics Summary
==================
Tunnels:
  Active: ${m.tunnels.active}
  Total: ${m.tunnels.total}

Requests:
  Total: ${m.requests.total}
  Pending: ${m.requests.pending}
  Succeeded: ${m.requests.succeeded}
  Failed: ${m.requests.failed}
  Rate Limited: ${m.requests.rateLimited}

Performance:
  Avg Response Time: ${m.performance.avgResponseTime.toFixed(2)}ms
  P95 Response Time: ${m.performance.p95ResponseTime.toFixed(2)}ms
  P99 Response Time: ${m.performance.p99ResponseTime.toFixed(2)}ms

Errors:
  Total: ${m.errors.total}
`;
  }

  reset(): void {
    this.metrics.requests.total = 0;
    this.metrics.requests.succeeded = 0;
    this.metrics.requests.failed = 0;
    this.metrics.requests.rateLimited = 0;
    this.responseTimes = [];
  }
}

export const metrics = new MetricsCollector();
