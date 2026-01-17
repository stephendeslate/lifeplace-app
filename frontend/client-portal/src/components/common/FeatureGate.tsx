import React from 'react';
import { isFeatureEnabled } from '../../utils/featureFlags';
import type { FeatureFlag } from '../../utils/featureFlags';

interface FeatureGateProps {
  feature: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback = null
}) => {
  return isFeatureEnabled(feature) ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGate;
