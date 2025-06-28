// frontend/admin-crm/src/hooks/useReportOperations.ts

import { useCallback, useMemo } from 'react';
import { useAnalyticsReports, useReportExecution } from './useAnalytics';
import type {
  AnalyticsReport,
  ReportExecution,
  ScheduleFrequency,
} from '../types/analytics.types';

interface ReportOperationsOptions {
  reportId?: number;
  executionId?: string;
  autoRefreshRunning?: boolean;
}

export const useReportOperations = (options: ReportOperationsOptions = {}) => {
  const { reportId, executionId } = options;

  // Get report data if reportId is provided
  const { useAnalyticsReport, useReportExecutions } = useAnalyticsReports();
  const reportQuery = useAnalyticsReport(reportId || 0);
  const executionsQuery = useReportExecutions(reportId || 0);

  // Get specific execution data if executionId is provided
  const executionQuery = useReportExecution(executionId || '');

  // Report status calculations
  const reportStatus = useMemo(() => {
    const report = reportQuery.data;
    if (!report) return null;

    const now = new Date();
    const lastGenerated = report.last_generated ? new Date(report.last_generated) : null;
    
    let nextScheduled: Date | null = null;
    if (report.schedule_frequency !== 'MANUAL' && report.schedule_time) {
      nextScheduled = calculateNextScheduledTime(report);
    }

    const isOverdue = nextScheduled && nextScheduled < now;
    const hasRunningExecution = executionsQuery.data?.some(e => e.status === 'RUNNING');

    return {
      isActive: report.is_active,
      isOverdue: isOverdue || false,
      hasRunningExecution: hasRunningExecution || false,
      lastGenerated,
      nextScheduled,
      canExecute: report.is_active && !hasRunningExecution,
    };
  }, [reportQuery.data, executionsQuery.data]);

  // Execution statistics
  const executionStats = useMemo(() => {
    const executions = executionsQuery.data || [];
    
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'COMPLETED').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;
    const running = executions.filter(e => e.status === 'RUNNING').length;
    const pending = executions.filter(e => e.status === 'PENDING').length;

    const successRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Calculate average execution time from completed executions
    const completedExecutions = executions.filter(e => 
      e.status === 'COMPLETED' && e.execution_time_seconds
    );
    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.execution_time_seconds || 0), 0) / completedExecutions.length
      : 0;

    const latestExecution = executions.length > 0 ? executions[0] : null;

    return {
      total,
      completed,
      failed,
      running,
      pending,
      successRate,
      avgExecutionTime,
      latestExecution,
    };
  }, [executionsQuery.data]);

  // Report validation
  const reportValidation = useMemo(() => {
    const report = reportQuery.data;
    if (!report) return { isValid: false, errors: [] };

    const errors: string[] = [];

    if (!report.name?.trim()) {
      errors.push('Report name is required');
    }

    if (!report.metrics || report.metrics.length === 0) {
      errors.push('At least one metric must be configured');
    }

    if (report.schedule_frequency !== 'MANUAL') {
      if (!report.schedule_time) {
        errors.push('Schedule time is required for automated reports');
      }

      if (report.schedule_frequency === 'WEEKLY' && report.schedule_day_of_week === null) {
        errors.push('Day of week is required for weekly reports');
      }

      if (report.schedule_frequency === 'MONTHLY' && !report.schedule_day_of_month) {
        errors.push('Day of month is required for monthly reports');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [reportQuery.data]);

  // Helper functions
  const calculateNextScheduledTime = useCallback((report: AnalyticsReport): Date | null => {
    if (report.schedule_frequency === 'MANUAL' || !report.schedule_time) {
      return null;
    }

    const now = new Date();
    const [hours, minutes] = report.schedule_time.split(':').map(Number);
    let nextExecution = new Date();
    nextExecution.setHours(hours, minutes, 0, 0);

    switch (report.schedule_frequency) {
      case 'DAILY':
        if (nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 1);
        }
        break;

      case 'WEEKLY':
        if (report.schedule_day_of_week !== null) {
          const targetDay = report.schedule_day_of_week;
          const currentDay = nextExecution.getDay();
          const mondayBased = currentDay === 0 ? 6 : currentDay - 1; // Convert to Monday = 0
          const daysUntilTarget = (targetDay - mondayBased + 7) % 7;
          
          if (daysUntilTarget === 0 && nextExecution <= now) {
            nextExecution.setDate(nextExecution.getDate() + 7);
          } else {
            nextExecution.setDate(nextExecution.getDate() + daysUntilTarget);
          }
        }
        break;

      case 'MONTHLY':
        if (report.schedule_day_of_month) {
          nextExecution.setDate(report.schedule_day_of_month);
          if (nextExecution <= now) {
            nextExecution.setMonth(nextExecution.getMonth() + 1);
            nextExecution.setDate(report.schedule_day_of_month);
          }
        }
        break;

      case 'QUARTERLY':
        // Find next quarter start
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarterMonth = (currentQuarter + 1) * 3;
        if (nextQuarterMonth >= 12) {
          nextExecution.setFullYear(nextExecution.getFullYear() + 1, 0, 1);
        } else {
          nextExecution.setMonth(nextQuarterMonth, 1);
        }
        break;

      default:
        return null;
    }

    return nextExecution;
  }, []);

  const formatScheduleFrequency = useCallback((frequency: ScheduleFrequency): string => {
    switch (frequency) {
      case 'MANUAL': return 'Manual';
      case 'DAILY': return 'Daily';
      case 'WEEKLY': return 'Weekly';
      case 'MONTHLY': return 'Monthly';
      case 'QUARTERLY': return 'Quarterly';
      default: return frequency;
    }
  }, []);

  const formatExecutionTime = useCallback((seconds: number | null): string => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  const formatFileSize = useCallback((bytes: number | null): string => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  const getExecutionStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'RUNNING': return 'info';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  }, []);

  const isExecutionDownloadable = useCallback((execution: ReportExecution): boolean => {
    return execution.status === 'COMPLETED' && !!execution.file_path;
  }, []);

  return {
    // Data
    report: reportQuery.data,
    executions: executionsQuery.data || [],
    execution: executionQuery.data,
    
    // Status and stats
    reportStatus,
    executionStats,
    reportValidation,
    
    // Loading states
    isLoadingReport: reportQuery.isLoading,
    isLoadingExecutions: executionsQuery.isLoading,
    isLoadingExecution: executionQuery.isLoading,
    
    // Error states
    reportError: reportQuery.error,
    executionsError: executionsQuery.error,
    executionError: executionQuery.error,
    
    // Actions
    refetchReport: reportQuery.refetch,
    refetchExecutions: executionsQuery.refetch,
    refetchExecution: executionQuery.refetch,
    
    // Utility functions
    calculateNextScheduledTime,
    formatScheduleFrequency,
    formatExecutionTime,
    formatFileSize,
    getExecutionStatusColor,
    isExecutionDownloadable,
  };
};