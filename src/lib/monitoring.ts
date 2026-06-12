/**
 * Monitoring dashboard configuration
 * Configurez vos dashboards de monitoring (Grafana, Datadog, etc.)
 */

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface DashboardConfig {
  metrics: Metric[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
}

export const defaultMetrics: Metric[] = [
  { name: 'active_users', value: 0, unit: 'count', timestamp: Date.now() },
  { name: 'messages_per_minute', value: 0, unit: 'msg/min', timestamp: Date.now() },
  { name: 'error_rate', value: 0, unit: '%', timestamp: Date.now() },
  { name: 'response_time', value: 0, unit: 'ms', timestamp: Date.now() },
];

export const defaultAlerts: Alert[] = [
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    condition: 'error_rate > 5',
    threshold: 5,
    severity: 'critical',
  },
  {
    id: 'slow_response',
    name: 'Slow Response Time',
    condition: 'response_time > 1000',
    threshold: 1000,
    severity: 'warning',
  },
];

export const sendMetric = (metric: Metric) => {
  // Intégrez avec votre service de monitoring (Prometheus, Datadog, etc.)
  console.log('Metric:', metric);
};

export const checkAlerts = (metrics: Metric[], alerts: Alert[]) => {
  const triggeredAlerts: Alert[] = [];

  alerts.forEach(alert => {
    const metric = metrics.find(m => m.name === alert.condition.split(' ')[0]);
    if (metric && metric.value > alert.threshold) {
      triggeredAlerts.push(alert);
    }
  });

  return triggeredAlerts;
};
