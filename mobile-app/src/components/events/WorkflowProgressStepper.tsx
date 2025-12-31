/**
 * WorkflowProgressStepper Component
 *
 * Displays workflow progress as a horizontal stepper.
 * Matches client-portal WorkflowProgressStepper patterns.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { CheckCircle, RadioButton, DotsThree } from 'phosphor-react-native';
import { theme } from '@/theme';
import type { WorkflowProgress, WorkflowStageProgress } from '@/apis/workflows.api';

export interface WorkflowProgressStepperProps {
  progress: WorkflowProgress;
  variant?: 'stepper' | 'compact';
}

export function WorkflowProgressStepper({
  progress,
  variant = 'stepper',
}: WorkflowProgressStepperProps) {
  if (!progress || progress.total_stages === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>Progress</Text>
          <Text style={styles.compactPercentage}>
            {Math.round(progress.progress_percentage)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress.progress_percentage}%` },
            ]}
          />
        </View>
        {progress.current_stage_name && (
          <Text style={styles.compactStage}>
            Current: {progress.current_stage_name}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Progress</Text>
        <Text style={styles.subtitle}>
          {progress.completed_stages} of {progress.total_stages} stages completed
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepsContainer}
      >
        {progress.stages.map((stage, index) => (
          <StepItem
            key={stage.id}
            stage={stage}
            isLast={index === progress.stages.length - 1}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface StepItemProps {
  stage: WorkflowStageProgress;
  isLast: boolean;
}

function StepItem({ stage, isLast }: StepItemProps) {
  const getStepStyles = () => {
    switch (stage.status) {
      case 'completed':
        return {
          iconColor: theme.colors.success[500],
          backgroundColor: theme.colors.success[50],
          textColor: theme.colors.success[700],
          lineColor: theme.colors.success[500],
        };
      case 'current':
        return {
          iconColor: theme.colors.primary[500],
          backgroundColor: theme.colors.primary[50],
          textColor: theme.colors.primary[700],
          lineColor: theme.colors.neutral[200],
        };
      default:
        return {
          iconColor: theme.colors.neutral[400],
          backgroundColor: theme.colors.neutral[100],
          textColor: theme.colors.neutral[500],
          lineColor: theme.colors.neutral[200],
        };
    }
  };

  const stepStyles = getStepStyles();

  return (
    <View style={styles.stepItem}>
      <View style={styles.stepIconContainer}>
        <View
          style={[
            styles.stepCircle,
            { backgroundColor: stepStyles.backgroundColor },
          ]}
        >
          {stage.status === 'completed' ? (
            <CheckCircle
              size={20}
              color={stepStyles.iconColor}
              weight="fill"
            />
          ) : stage.status === 'current' ? (
            <DotsThree
              size={20}
              color={stepStyles.iconColor}
              weight="bold"
            />
          ) : (
            <RadioButton
              size={20}
              color={stepStyles.iconColor}
              weight="regular"
            />
          )}
        </View>
        {!isLast && (
          <View
            style={[
              styles.stepLine,
              { backgroundColor: stepStyles.lineColor },
            ]}
          />
        )}
      </View>
      <Text
        style={[styles.stepLabel, { color: stepStyles.textColor }]}
        numberOfLines={2}
      >
        {stage.name}
      </Text>
      <Text style={styles.stepType}>
        {formatStageType(stage.stage)}
      </Text>
    </View>
  );
}

function formatStageType(type: WorkflowStageProgress['stage']): string {
  switch (type) {
    case 'LEAD':
      return 'Planning';
    case 'PRODUCTION':
      return 'Production';
    case 'POST_PRODUCTION':
      return 'Post-Event';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
  },
  stepsContainer: {
    paddingVertical: theme.spacing.sm,
  },
  stepItem: {
    alignItems: 'center',
    width: 100,
    marginRight: theme.spacing.sm,
  },
  stepIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    height: 2,
    width: 60,
    marginLeft: theme.spacing.xs,
  },
  stepLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
    marginBottom: 2,
  },
  stepType: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[400],
    textAlign: 'center',
  },
  // Compact variant styles
  compactContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  compactTitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  compactPercentage: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 3,
  },
  compactStage: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xs,
  },
});

export default WorkflowProgressStepper;
