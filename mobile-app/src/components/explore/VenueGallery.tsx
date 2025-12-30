/**
 * VenueGallery Component
 *
 * Image gallery for venue detail:
 * - Full-screen modal on tap
 * - Horizontal pagination
 * - Image counter indicator
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';

import { colors, spacing, typeScale, layout } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VenueGalleryProps {
  images: string[];
  featuredImage?: string | null;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/800x600/FAF9F7/9B9590?text=Venue';

export function VenueGallery({ images, featuredImage }: VenueGalleryProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine featured image with gallery images
  const allImages = featuredImage
    ? [featuredImage, ...images.filter((img) => img !== featuredImage)]
    : images.length > 0
    ? images
    : [PLACEHOLDER_IMAGE];

  const handleImagePress = (index: number) => {
    setCurrentIndex(index);
    setModalVisible(true);
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  return (
    <>
      {/* Main Gallery View */}
      <View style={styles.container}>
        <FlatList
          data={allImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item, index) => `gallery-${index}`}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => handleImagePress(index)}
              style={styles.imageWrapper}
            >
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            </Pressable>
          )}
        />

        {/* Image Counter */}
        {allImages.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {allImages.length}
            </Text>
          </View>
        )}

        {/* Dots Indicator */}
        {allImages.length > 1 && allImages.length <= 5 && (
          <View style={styles.dotsContainer}>
            {allImages.map((_, index) => (
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

      {/* Full Screen Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <X size={24} color={colors.neutral.white} />
            </Pressable>
            <Text style={styles.modalCounter}>
              {currentIndex + 1} / {allImages.length}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <FlatList
            data={allImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(item, index) => `modal-${index}`}
            renderItem={({ item }) => (
              <View style={styles.modalImageWrapper}>
                <Image
                  source={{ uri: item }}
                  style={styles.modalImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: 280,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  counter: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.sm,
  },
  counterText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: spacing.md,
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
    backgroundColor: colors.neutral.white,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.primary.black,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCounter: {
    ...typeScale.titleMedium,
    color: colors.neutral.white,
  },
  placeholder: {
    width: 44,
  },
  modalImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});
