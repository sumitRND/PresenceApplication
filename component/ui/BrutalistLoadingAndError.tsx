// component/ui/BrutalistLoadingAndError.tsx
// Reusable Neobrutalism Loading and Error Components

import { brutalistColors, colors } from '@/constants/colors';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============= LOADING COMPONENT =============

interface BrutalistLoadingProps {
  text?: string;
  subtext?: string;
  size?: 'small' | 'large';
}

export const BrutalistLoading: React.FC<BrutalistLoadingProps> = ({
  text = 'LOADING...',
  subtext,
  size = 'large',
}) => (
  <View style={styles.loadingContainer}>
    <View style={styles.loadingCard}>
      <ActivityIndicator size={size} color={brutalistColors.black} />
      <Text style={styles.loadingText}>{text}</Text>
      {subtext && <Text style={styles.loadingSubtext}>{subtext}</Text>}
    </View>
  </View>
);

// ============= ERROR COMPONENT =============

interface BrutalistErrorProps {
  title?: string;
  message?: string;
  icon?: string;
  onRetry?: () => void;
  retryText?: string;
}

export const BrutalistError: React.FC<BrutalistErrorProps> = ({
  title = 'ERROR',
  message = 'Something went wrong',
  icon = 'exclamation-triangle',
  onRetry,
  retryText = 'RETRY',
}) => (
  <View style={styles.errorContainer}>
    <View style={styles.errorCard}>
      <FontAwesome6 name={icon as any} size={48} color={brutalistColors.error} />
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <FontAwesome6 name="arrows-rotate" size={16} color={brutalistColors.black} />
          <Text style={styles.retryButtonText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ============= INLINE LOADING =============

interface InlineLoadingProps {
  text?: string;
  color?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = 'Loading...',
  color = brutalistColors.black,
}) => (
  <View style={styles.inlineContainer}>
    <ActivityIndicator size="small" color={color} />
    <Text style={[styles.inlineText, { color }]}>{text}</Text>
  </View>
);

// ============= BUTTON LOADING =============

interface ButtonLoadingProps {
  text?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const BrutalistButton: React.FC<ButtonLoadingProps> = ({
  text = 'SUBMIT',
  loading = false,
  disabled = false,
  onPress,
  variant = 'primary',
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'danger':
        return styles.dangerButton;
      case 'secondary':
        return styles.secondaryButton;
      default:
        return styles.primaryButton;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        (disabled || loading) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color={brutalistColors.black} />
          <Text style={styles.buttonText}>LOADING...</Text>
        </>
      ) : (
        <Text style={styles.buttonText}>{text}</Text>
      )}
    </TouchableOpacity>
  );
};

// ============= EMPTY STATE =============

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export const BrutalistEmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title = 'NOTHING HERE',
  message = 'No data available',
  actionText,
  onAction,
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyCard}>
      <FontAwesome6 name={icon as any} size={48} color={brutalistColors.gray} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionText && onAction && (
        <TouchableOpacity style={styles.emptyButton} onPress={onAction} activeOpacity={0.8}>
          <Text style={styles.emptyButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ============= STYLES =============

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.offwhite,
    padding: 20,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    minWidth: 250,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: brutalistColors.gray,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.offwhite,
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    maxWidth: 320,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: brutalistColors.error,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 3,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
  },

  // Inline Loading
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  inlineText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 3,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: colors.lightGreen,
  },
  secondaryButton: {
    backgroundColor: '#fff',
  },
  dangerButton: {
    backgroundColor: brutalistColors.errorBg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.offwhite,
    padding: 20,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#000',
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    maxWidth: 320,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: brutalistColors.gray,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
  },
});

// ============= USAGE EXAMPLES =============

/*

// 1. Full Screen Loading
<BrutalistLoading text="LOADING PROFILE..." subtext="Please wait" />

// 2. Error Screen with Retry
<BrutalistError 
  title="LOAD FAILED"
  message="Unable to fetch data. Please try again."
  onRetry={() => refetch()}
/>

// 3. Inline Loading
<View>
  <InlineLoading text="Updating..." />
</View>

// 4. Button with Loading
<BrutalistButton
  text="SAVE"
  loading={isSaving}
  onPress={handleSave}
  variant="primary"
/>

// 5. Empty State
<BrutalistEmptyState
  icon="calendar"
  title="NO RECORDS"
  message="No attendance records found for this month"
  actionText="REFRESH"
  onAction={() => refetch()}
/>

*/