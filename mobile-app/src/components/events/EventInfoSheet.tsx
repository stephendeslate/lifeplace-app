/**
 * EventInfoSheet Component
 *
 * Bottom sheet displaying comprehensive event info:
 * - Venue details with image carousel
 * - Package information
 * - Schedule/timing details
 */

import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  MapPin,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  WarningCircle,
  Buildings,
  Package,
  CaretLeft,
  CaretRight,
} from 'phosphor-react-native';
import { theme, spacing } from '@/theme';
import { Card } from '@/components/common';
import type { EventInfo, VenueInfo, PackageInfo, ScheduleInfo } from '@/types/events.types';
import { formatEventDate, formatTime } from '@/utils/formatting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 200;

export interface EventInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  eventInfo: EventInfo | null;
  eventName?: string;
}

// =============================================================================
// IMAGE CAROUSEL COMPONENT
// =============================================================================

interface ImageCarouselProps {
  images: string[];
  fallbackText?: string;
}

function ImageCarousel({ images, fallbackText = 'No images available' }: ImageCarouselProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (SCREEN_WIDTH - spacing.lg * 2));
    setCurrentIndex(index);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (flatListRef.current && index >= 0 && index < images.length) {
      Haptics.selectionAsync();
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  }, [images.length]);

  if (!images || images.length === 0) {
    return (
      <View style={styles.noImageContainer}>
        <Buildings size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.noImageText}>{fallbackText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item, index) => `${index}-${item}`}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={styles.carouselImage}
            resizeMode="cover"
          />
        )}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH - spacing.lg * 2,
          offset: (SCREEN_WIDTH - spacing.lg * 2) * index,
          index,
        })}
      />

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <Pressable
              style={[styles.carouselArrow, styles.carouselArrowLeft]}
              onPress={() => scrollToIndex(currentIndex - 1)}
            >
              <CaretLeft size={24} color={theme.colors.surface} weight="bold" />
            </Pressable>
          )}
          {currentIndex < images.length - 1 && (
            <Pressable
              style={[styles.carouselArrow, styles.carouselArrowRight]}
              onPress={() => scrollToIndex(currentIndex + 1)}
            >
              <CaretRight size={24} color={theme.colors.surface} weight="bold" />
            </Pressable>
          )}
        </>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// VENUE SECTION
// =============================================================================

interface VenueSectionProps {
  venue: VenueInfo;
}

function VenueSection({ venue }: VenueSectionProps) {
  const allImages = [
    ...(venue.featured_image ? [venue.featured_image] : []),
    ...venue.gallery_images,
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MapPin size={20} color={theme.colors.primary[600]} weight="fill" />
        <Text style={styles.sectionTitle}>VENUE</Text>
      </View>

      <ImageCarousel images={allImages} fallbackText="No venue images" />

      <View style={styles.sectionContent}>
        <Text style={styles.venueName}>{venue.name}</Text>

        {venue.description && (
          <Text style={styles.venueDescription}>{venue.description}</Text>
        )}

        {venue.location_description && (
          <View style={styles.infoRow}>
            <MapPin size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>{venue.location_description}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Users size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>
            Capacity: {venue.minimum_capacity}-{venue.maximum_capacity} guests
            {venue.recommended_capacity && ` (recommended: ${venue.recommended_capacity})`}
          </Text>
        </View>

        {/* Amenities */}
        {venue.amenities && venue.amenities.length > 0 && (
          <View style={styles.amenitiesContainer}>
            {venue.amenities.map((amenity, index) => (
              <View key={index} style={styles.amenityChip}>
                <CheckCircle size={14} color={theme.colors.success[600]} weight="fill" />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Venue Rules */}
        {venue.venue_rules && (
          <View style={styles.rulesContainer}>
            <Text style={styles.rulesTitle}>Venue Rules</Text>

            {venue.venue_rules.policies && venue.venue_rules.policies.length > 0 && (
              <View style={styles.rulesList}>
                {venue.venue_rules.policies.map((policy, index) => (
                  <View key={index} style={styles.ruleItem}>
                    <Text style={styles.ruleBullet}>•</Text>
                    <Text style={styles.ruleText}>{policy.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {venue.venue_rules.violation_fees && venue.venue_rules.violation_fees.length > 0 && (
              <View style={styles.rulesList}>
                {venue.venue_rules.violation_fees.map((fee, index) => (
                  <View key={index} style={styles.ruleItem}>
                    <WarningCircle size={14} color={theme.colors.warning[500]} />
                    <Text style={styles.ruleText}>
                      {fee.description} - PHP {fee.fee.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {venue.venue_rules.music_curfew && (
              <View style={styles.ruleItem}>
                <Clock size={14} color={theme.colors.neutral[500]} />
                <Text style={styles.ruleText}>
                  Music curfew: {venue.venue_rules.music_curfew}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// PACKAGE SECTION
// =============================================================================

interface PackageSectionProps {
  packages: PackageInfo[];
}

function PackageSection({ packages }: PackageSectionProps) {
  if (!packages || packages.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Package size={20} color={theme.colors.primary[600]} weight="fill" />
        <Text style={styles.sectionTitle}>YOUR PACKAGE</Text>
      </View>

      {packages.map((pkg, index) => {
        const allImages = [
          ...(pkg.featured_image ? [pkg.featured_image] : []),
          ...pkg.gallery_images,
        ];

        return (
          <View key={pkg.id} style={index > 0 ? styles.packageDivider : undefined}>
            {allImages.length > 0 && (
              <ImageCarousel images={allImages} fallbackText="No package images" />
            )}

            <View style={styles.sectionContent}>
              <Text style={styles.packageName}>{pkg.name}</Text>

              {pkg.description && (
                <Text style={styles.packageDescription}>{pkg.description}</Text>
              )}

              {pkg.num_participants && (
                <View style={styles.infoRow}>
                  <Users size={16} color={theme.colors.neutral[500]} />
                  <Text style={styles.infoText}>
                    Booked for: {pkg.num_participants} guests
                  </Text>
                </View>
              )}

              {pkg.event_days && pkg.event_days > 1 && (
                <View style={styles.infoRow}>
                  <Calendar size={16} color={theme.colors.neutral[500]} />
                  <Text style={styles.infoText}>
                    Duration: {pkg.event_days} Days, {pkg.num_nights || pkg.event_days - 1} Night{(pkg.num_nights || pkg.event_days - 1) > 1 ? 's' : ''}
                  </Text>
                </View>
              )}

              {/* Included Venues for multi-venue packages */}
              {pkg.included_venues && pkg.included_venues.length > 1 && (
                <View style={styles.includedVenuesContainer}>
                  <Text style={styles.includedVenuesTitle}>Included Venues:</Text>
                  {pkg.included_venues.map((venue) => (
                    <View key={venue.id} style={styles.includedVenueItem}>
                      <Buildings size={14} color={theme.colors.neutral[500]} />
                      <Text style={styles.includedVenueName}>
                        {venue.name}
                        {venue.is_primary && ' (Primary)'}
                      </Text>
                      {venue.notes && (
                        <Text style={styles.includedVenueNotes}> - {venue.notes}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// =============================================================================
// SCHEDULE SECTION
// =============================================================================

interface ScheduleSectionProps {
  schedule: ScheduleInfo;
}

function ScheduleSection({ schedule }: ScheduleSectionProps) {
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Clock size={20} color={theme.colors.primary[600]} weight="fill" />
        <Text style={styles.sectionTitle}>SCHEDULE</Text>
      </View>

      <View style={styles.sectionContent}>
        {/* Event Date */}
        <View style={styles.scheduleRow}>
          <Calendar size={18} color={theme.colors.primary[600]} />
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleLabel}>Event Date</Text>
            <Text style={styles.scheduleValue}>
              {formatDate(schedule.start_date)}
              {schedule.end_date && schedule.end_date !== schedule.start_date && (
                ` - ${formatDate(schedule.end_date)}`
              )}
            </Text>
          </View>
        </View>

        {/* Check-in */}
        {schedule.scheduled_check_in_time && (
          <View style={styles.scheduleRow}>
            <Clock size={18} color={theme.colors.success[600]} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleLabel}>Check-in</Text>
              <Text style={styles.scheduleValue}>
                {formatDateTime(schedule.scheduled_check_in_time)}
              </Text>
            </View>
          </View>
        )}

        {/* Program Time */}
        {schedule.program_start_time && (
          <View style={styles.scheduleRow}>
            <Clock size={18} color={theme.colors.primary[600]} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleLabel}>Program</Text>
              <Text style={styles.scheduleValue}>
                {formatDateTime(schedule.program_start_time)}
                {schedule.program_end_time && ` - ${formatDateTime(schedule.program_end_time)}`}
                {schedule.program_duration_hours && ` (${schedule.program_duration_hours} hours)`}
              </Text>
            </View>
          </View>
        )}

        {/* Check-out */}
        {schedule.scheduled_checkout_time && (
          <View style={styles.scheduleRow}>
            <Clock size={18} color={theme.colors.warning[600]} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleLabel}>Check-out</Text>
              <Text style={styles.scheduleValue}>
                {formatDateTime(schedule.scheduled_checkout_time)}
              </Text>
            </View>
          </View>
        )}

        {/* Early Check-in */}
        {schedule.early_checkin_requested && schedule.early_checkin_time && (
          <View style={[styles.scheduleRow, styles.specialTimeRow]}>
            <CheckCircle size={18} color={theme.colors.success[600]} weight="fill" />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleLabel}>Early Check-in</Text>
              <Text style={styles.scheduleValue}>
                {formatDateTime(schedule.early_checkin_time)}
              </Text>
            </View>
          </View>
        )}

        {/* Late Checkout */}
        {schedule.late_checkout_requested && schedule.late_checkout_time && (
          <View style={[styles.scheduleRow, styles.specialTimeRow]}>
            <CheckCircle size={18} color={theme.colors.success[600]} weight="fill" />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleLabel}>Late Check-out</Text>
              <Text style={styles.scheduleValue}>
                {formatDateTime(schedule.late_checkout_time)}
              </Text>
            </View>
          </View>
        )}

        {/* Supplier Access */}
        {schedule.ingress_start_time && (
          <View style={styles.scheduleRow}>
            <Buildings size={18} color={theme.colors.neutral[500]} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleLabel}>Supplier Access</Text>
              <Text style={styles.scheduleValue}>
                {formatDateTime(schedule.ingress_start_time)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EventInfoSheet({
  visible,
  onClose,
  eventInfo,
  eventName,
}: EventInfoSheetProps) {
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  if (!eventInfo) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.neutral[600]} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {eventName || 'Event Details'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Venue Section */}
          {eventInfo.venue && <VenueSection venue={eventInfo.venue} />}

          {/* Divider */}
          {eventInfo.venue && eventInfo.packages.length > 0 && (
            <View style={styles.divider} />
          )}

          {/* Package Section */}
          {eventInfo.packages.length > 0 && (
            <PackageSection packages={eventInfo.packages} />
          )}

          {/* Divider */}
          {(eventInfo.venue || eventInfo.packages.length > 0) && (
            <View style={styles.divider} />
          )}

          {/* Schedule Section */}
          <ScheduleSection schedule={eventInfo.schedule} />

          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
    letterSpacing: 1,
  },
  sectionContent: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: spacing.lg,
  },

  // Carousel
  carouselContainer: {
    position: 'relative',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  carouselImage: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: IMAGE_HEIGHT,
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselArrowLeft: {
    left: spacing.sm,
  },
  carouselArrowRight: {
    right: spacing.sm,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: theme.colors.surface,
  },
  noImageContainer: {
    height: IMAGE_HEIGHT,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noImageText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[400],
  },

  // Venue
  venueName: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.xl,
    color: theme.colors.neutral[800],
    marginBottom: spacing.sm,
  },
  venueDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    lineHeight: 20,
  },

  // Amenities
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.success[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  amenityText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.success[700],
  },

  // Venue Rules
  rulesContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.warning[50],
    borderRadius: theme.borderRadius.md,
  },
  rulesTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning[700],
    marginBottom: spacing.sm,
  },
  rulesList: {
    marginBottom: spacing.sm,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  ruleBullet: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning[700],
  },
  ruleText: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.warning[700],
    lineHeight: 20,
  },

  // Package
  packageDivider: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  packageName: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
    marginBottom: spacing.sm,
  },
  packageDescription: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  includedVenuesContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
  },
  includedVenuesTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
    marginBottom: spacing.sm,
  },
  includedVenueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  includedVenueName: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[700],
  },
  includedVenueNotes: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    fontStyle: 'italic',
  },

  // Schedule
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  specialTimeRow: {
    backgroundColor: theme.colors.success[50],
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: theme.borderRadius.md,
    borderBottomWidth: 0,
    marginBottom: spacing.xs,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginBottom: 2,
  },
  scheduleValue: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },

  bottomPadding: {
    height: spacing.xl,
  },
});

export default EventInfoSheet;
