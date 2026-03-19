// frontend/admin-crm/src/pages/metrics/MetricsDashboard/utils.ts

export const classificationColor = (
  classification: string,
): 'success' | 'info' | 'warning' | 'error' | 'default' => {
  switch (classification) {
    case 'Elite':
      return 'success';
    case 'High':
      return 'info';
    case 'Medium':
      return 'warning';
    case 'Low':
      return 'error';
    default:
      return 'default';
  }
};

export function humanizeSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours < 24) return `${hours}h ${minutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export const formatCurrency = (val: number): string => {
  if (val >= 1_000_000) return `\u20B1${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `\u20B1${(val / 1_000).toFixed(1)}K`;
  return `\u20B1${val.toFixed(0)}`;
};
