import { useState } from 'react';
import { useVIPSettings } from '@/hooks/useVIP';

export function useVIPProgramLogic() {
  const [activeTab, setActiveTab] = useState(0);
  const { settings } = useVIPSettings();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return {
    activeTab,
    settings,
    handleTabChange,
  };
}
