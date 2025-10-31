import { colors } from '@/constants/colors';
import { photoPreviewModalStyles } from '@/constants/style';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { BlurView } from 'expo-blur';
import { CameraCapturedPicture } from 'expo-camera';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface PhotoPreviewModalProps {
  visible: boolean;
  photo: CameraCapturedPicture | null;
  photoNumber: number;
  onKeep: () => void;
  onRetake: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PhotoPreviewModal({
  visible,
  photo,
  photoNumber,
  onKeep,
  onRetake,
}: PhotoPreviewModalProps) {
  const keepButtonScale = useSharedValue(1);
  const retakeButtonScale = useSharedValue(1);

  const keepButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: keepButtonScale.value }],
  }));

  const retakeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: retakeButtonScale.value }],
  }));

  const handleKeepPress = () => {
    keepButtonScale.value = withSpring(0.95, {}, () => {
      keepButtonScale.value = withSpring(1);
    });
    setTimeout(onKeep, 100);
  };

  const handleRetakePress = () => {
    retakeButtonScale.value = withSpring(0.95, {}, () => {
      retakeButtonScale.value = withSpring(1);
    });
    setTimeout(onRetake, 100);
  };

  if (!visible || !photo) return null;

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      statusBarTranslucent
    >
      <Animated.View 
        entering={FadeIn.duration(200)}
        style={photoPreviewModalStyles.container}
      >
        <BlurView intensity={95} style={StyleSheet.absoluteFillObject} />
        
        <Animated.View 
          entering={SlideInUp.duration(300).springify()}
          style={photoPreviewModalStyles.content}
        >
          {/* Header */}
          <View style={photoPreviewModalStyles.header}>
            <View style={photoPreviewModalStyles.photoNumberBadge}>
              <Text style={photoPreviewModalStyles.photoNumberText}>Photo {photoNumber}</Text>
            </View>
            <View style={photoPreviewModalStyles.positionBadge}>
              <FontAwesome6 
                name="user" 
                size={14} 
                color={colors.white} 
              />
              <Text style={photoPreviewModalStyles.positionText}>Front Face</Text>
            </View>
          </View>

          {/* Photo Preview */}
          <Animated.View 
            entering={ZoomIn.delay(100).springify()}
            style={photoPreviewModalStyles.photoContainer}
          >
            <Image
              source={{ uri: photo.uri }}
              style={photoPreviewModalStyles.photo}
              contentFit="cover"
            />
            
            {/* Photo Frame Overlay */}
            <View style={photoPreviewModalStyles.photoFrame}>
              <View style={[photoPreviewModalStyles.frameCorner, photoPreviewModalStyles.frameTopLeft]} />
              <View style={[photoPreviewModalStyles.frameCorner, photoPreviewModalStyles.frameTopRight]} />
              <View style={[photoPreviewModalStyles.frameCorner, photoPreviewModalStyles.frameBottomLeft]} />
              <View style={[photoPreviewModalStyles.frameCorner, photoPreviewModalStyles.frameBottomRight]} />
            </View>
          </Animated.View>

          {/* Review Text */}
          <View style={photoPreviewModalStyles.reviewSection}>
            <Text style={photoPreviewModalStyles.reviewTitle}>Review Your Photo</Text>
            <Text style={photoPreviewModalStyles.reviewSubtitle}>
              Make sure your face is clearly visible
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={photoPreviewModalStyles.actions}>
            <AnimatedPressable
              onPress={handleRetakePress}
              style={[photoPreviewModalStyles.button, photoPreviewModalStyles.retakeButton, retakeButtonStyle]}
            >
              <FontAwesome6 name="camera-rotate" size={20} color={colors.error} />
              <Text style={photoPreviewModalStyles.retakeButtonText}>Retake</Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={handleKeepPress}
              style={[photoPreviewModalStyles.button, photoPreviewModalStyles.keepButton, keepButtonStyle]}
            >
              <LinearGradient
                colors={[colors.success, '#059669']}
                style={photoPreviewModalStyles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <FontAwesome6 name="check" size={20} color={colors.white} />
                <Text style={photoPreviewModalStyles.keepButtonText}>Use This Photo</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
