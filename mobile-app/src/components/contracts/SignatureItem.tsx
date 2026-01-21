/**
 * SignatureItem Component
 *
 * Displays a signature requirement with status.
 * Can be used with either a signature object or just a role for pending signatures.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Clock, User } from 'phosphor-react-native';
import { theme } from '@/theme';
import { formatCardDate } from '@/utils/formatting';
import type { ContractSignature } from '@/apis/contracts.api';

interface SignatureItemProps {
  /** The signature object if this role has been signed */
  signature?: ContractSignature | null;
  /** The role this signature requirement is for */
  role: string;
  /** Whether this is the current user's signature requirement */
  isCurrentUser?: boolean;
}

/** Get display name for a signature role */
function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'CLIENT':
      return 'Client Signature';
    case 'COMPANY_REP':
      return 'LifePlace Representative';
    case 'WITNESS':
      return 'Witness Signature';
    case 'GUARDIAN':
      return 'Legal Guardian';
    case 'PARTNER':
      return 'Business Partner';
    default:
      return role.replace('_', ' ');
  }
}

export function SignatureItem({ signature, role, isCurrentUser = false }: SignatureItemProps) {
  const isSigned = signature?.is_signed ?? false;
  const signerName = signature?.signer_name || getRoleDisplayName(role);
  const roleDisplay = getRoleDisplayName(role);

  return (
    <View style={[styles.container, isCurrentUser && styles.containerHighlighted]}>
      <View style={[styles.iconContainer, isSigned && styles.iconContainerSigned]}>
        {isSigned ? (
          <CheckCircle size={20} color={theme.colors.semantic.success} weight="fill" />
        ) : (
          <User size={20} color={theme.colors.neutral.gray} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{isSigned ? signerName : roleDisplay}</Text>
          {isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>
        <Text style={styles.role}>{isSigned ? roleDisplay : 'Awaiting signature'}</Text>
      </View>

      <View style={styles.status}>
        {isSigned ? (
          <>
            <Text style={styles.signedLabel}>Signed</Text>
            {signature?.signed_at && (
              <Text style={styles.signedDate}>{formatCardDate(signature.signed_at)}</Text>
            )}
          </>
        ) : (
          <>
            <Clock size={14} color={theme.colors.semantic.warning} />
            <Text style={styles.pendingLabel}>Pending</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
  },
  containerHighlighted: {
    backgroundColor: theme.colors.accent.woodSubtle,
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderBottomWidth: 0,
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  iconContainerSigned: {
    backgroundColor: theme.colors.success[50],
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
    fontWeight: '500',
  },
  youBadge: {
    backgroundColor: theme.colors.accent.wood,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.xs,
  },
  youBadgeText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.white,
    fontSize: 10,
    fontWeight: '600',
  },
  role: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  status: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  signedLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.semantic.success,
    fontWeight: '500',
  },
  signedDate: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  pendingLabel: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.semantic.warning,
    fontWeight: '500',
  },
});

export default SignatureItem;
