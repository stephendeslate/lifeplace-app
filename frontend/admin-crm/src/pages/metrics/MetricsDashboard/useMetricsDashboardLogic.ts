// frontend/admin-crm/src/pages/metrics/MetricsDashboard/useMetricsDashboardLogic.ts
import { useEffect, useState } from 'react';
import { useLayout } from '@/contexts/LayoutContext';

export function useMetricsDashboardLogic() {
  const { setBreadcrumbs } = useLayout();
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    setBreadcrumbs([{ label: 'Metrics' }]);
  }, [setBreadcrumbs]);

  return { tabIndex, setTabIndex };
}
