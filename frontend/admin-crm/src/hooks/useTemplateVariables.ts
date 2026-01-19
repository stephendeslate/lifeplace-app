// frontend/admin-crm/src/hooks/useTemplateVariables.ts
// Unified hook for fetching variable schemas from either communications or contracts domain

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communicationsApi } from '../apis/communications.api';
import { contractsApi } from '../apis/contracts.api';
import type {
  VariableSchemas,
  TemplateDomain,
  ContextType,
  VariableGroup,
  VariableForInsertion,
} from '../types/templates.types';

/**
 * Unified hook for fetching template variable schemas.
 * Works with both communications and contracts domains.
 *
 * @param domain - The domain to fetch variables for ('communications' or 'contracts')
 * @returns React Query result with variable schemas
 *
 * @example
 * // In communications template form
 * const { data: variableSchemas } = useTemplateVariables('communications');
 *
 * @example
 * // In contracts template form
 * const { data: variableSchemas } = useTemplateVariables('contracts');
 */
export const useTemplateVariables = (domain: TemplateDomain) => {
  return useQuery<VariableSchemas>({
    queryKey: ['template-variables', domain],
    queryFn: async () => {
      if (domain === 'communications') {
        return communicationsApi.getVariableSchemas();
      } else {
        return contractsApi.getVariableSchemas();
      }
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes - variables don't change often
  });
};

/**
 * Hook that returns variables filtered by context type.
 * Use this when you need to show only variables available for a specific context.
 */
export const useFilteredVariables = (
  domain: TemplateDomain,
  contextType?: ContextType
) => {
  const { data: schemas, ...queryResult } = useTemplateVariables(domain);

  const filteredGroups = useMemo(() => {
    if (!schemas?.variable_groups) return {};

    if (!contextType) {
      // Return all groups if no context type specified
      return schemas.variable_groups;
    }

    // Filter groups to only those available for this context type
    const filtered: Record<string, VariableGroup> = {};

    for (const [groupKey, groupData] of Object.entries(schemas.variable_groups)) {
      if (groupData.available_in.includes(contextType)) {
        filtered[groupKey] = groupData;
      }
    }

    return filtered;
  }, [schemas, contextType]);

  return {
    ...queryResult,
    data: schemas,
    filteredGroups,
    contextTypes: schemas?.context_types,
  };
};

/**
 * Get a flat list of variables for a context type, suitable for insertion.
 */
export const getVariablesForContext = (
  schemas: VariableSchemas | undefined,
  contextType: ContextType
): VariableForInsertion[] => {
  if (!schemas?.variable_groups) return [];

  const variables: VariableForInsertion[] = [];

  for (const [groupKey, groupData] of Object.entries(schemas.variable_groups)) {
    if (!groupData.available_in.includes(contextType)) continue;

    for (const [varName, varDef] of Object.entries(groupData.variables)) {
      variables.push({
        name: varName,
        description: varDef.description,
        required: varDef.required,
        group: groupKey,
        groupLabel: groupData.label,
        groupIcon: groupData.icon,
      });
    }
  }

  return variables;
};

/**
 * Helper to get human-readable group titles from group keys
 */
export const getVariableGroupTitle = (groupKey: string): string => {
  const titles: Record<string, string> = {
    // New group names (context-based)
    client: 'Client',
    event: 'Event',
    financial: 'Financial',
    booking: 'Booking',
    quote: 'Quote',
    contract: 'Contract',
    admin: 'Admin',
    notification: 'Notification',
    system: 'System',

    // Legacy group names (for backwards compatibility)
    client_variables: 'Client Information',
    system_variables: 'System Information',
    admin_invitation_variables: 'Admin Invitation',
    manual_template_variables: 'Manual Template',
    event_variables: 'Event Information',
    financial_variables: 'Financial Information',
    contract_variables: 'Contract Information',
    signature_variables: 'Signature Placeholders',
  };

  return titles[groupKey] || groupKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Helper to get color for variable group chips
 */
export const getVariableGroupColor = (
  groupKey: string
): 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' => {
  const colors: Record<string, 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
    // New group names
    client: 'secondary',
    event: 'primary',
    financial: 'success',
    booking: 'info',
    quote: 'warning',
    contract: 'info',
    admin: 'error',
    notification: 'warning',
    system: 'primary',

    // Legacy names
    client_variables: 'secondary',
    system_variables: 'primary',
    admin_invitation_variables: 'info',
    manual_template_variables: 'warning',
    event_variables: 'primary',
    financial_variables: 'success',
    contract_variables: 'info',
    signature_variables: 'warning',
  };

  return colors[groupKey] || 'primary';
};

/**
 * Get icon for variable group
 */
export const getVariableGroupIcon = (groupKey: string): string => {
  const icons: Record<string, string> = {
    client: 'person',
    event: 'event',
    financial: 'payments',
    booking: 'confirmation_number',
    quote: 'request_quote',
    contract: 'description',
    admin: 'admin_panel_settings',
    notification: 'notifications',
    system: 'settings',
  };

  return icons[groupKey] || 'help';
};

/**
 * Convert a variable name to a human-readable label
 * e.g., 'client_first_name' -> 'Client First Name'
 */
export const getVariableLabel = (variableName: string): string => {
  return variableName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Get context type options for select dropdowns
 */
export const getContextTypeOptions = (
  schemas: VariableSchemas | undefined
): Array<{ value: ContextType; label: string; description: string }> => {
  if (!schemas?.context_types) return [];

  return Object.entries(schemas.context_types).map(([key, info]) => ({
    value: key as ContextType,
    label: info.label,
    description: info.description,
  }));
};

export default useTemplateVariables;
