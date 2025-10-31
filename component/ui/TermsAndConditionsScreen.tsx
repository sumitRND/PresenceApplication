import { colors } from "@/constants/colors";
import { termsAndConditionsScreenStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const { height: screenHeight } = Dimensions.get("window");

interface TermsAndConditionsScreenProps {
  onAccept: () => void;
  isProcessing?: boolean;
}

export function TermsAndConditionsScreen({
  onAccept,
  isProcessing = false,
}: TermsAndConditionsScreenProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    if (isAtBottom && !hasScrolledToEnd) {
      setHasScrolledToEnd(true);
    }
  };

  const handleContentSizeChange = (
    contentWidth: number,
    contentHeight: number,
  ) => {
    const screenContentHeight = screenHeight - 300;
    setIsScrollable(contentHeight > screenContentHeight);
    if (contentHeight <= screenContentHeight) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    if (!hasScrolledToEnd && isScrollable) {
      Alert.alert(
        "PLEASE READ TERMS",
        "Scroll to the bottom and read all terms and conditions before accepting.",
        [{ text: "OK" }],
      );
      return;
    }
    onAccept();
  };

  return (
    <View style={termsAndConditionsScreenStyles.container}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        style={termsAndConditionsScreenStyles.header}
      >
        <View style={termsAndConditionsScreenStyles.headerContent}>
          <View style={termsAndConditionsScreenStyles.logoBox}>
            <FontAwesome6 name="shield-halved" size={40} color={colors.black} />
          </View>
          <Text style={termsAndConditionsScreenStyles.headerTitle}>TERMS & CONDITIONS</Text>
          <Text style={termsAndConditionsScreenStyles.headerSubtitle}>
            PLEASE READ AND ACCEPT OUR TERMS TO CONTINUE
          </Text>
        </View>
      </Animated.View>

      {/* Content */}
      <View style={termsAndConditionsScreenStyles.contentContainer}>
        <ScrollView
          style={termsAndConditionsScreenStyles.scrollView}
          contentContainerStyle={termsAndConditionsScreenStyles.scrollContent}
          showsVerticalScrollIndicator={true}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
        >
          {/* Privacy & Data Protection */}
          <View style={termsAndConditionsScreenStyles.section}>
            <View style={termsAndConditionsScreenStyles.sectionHeader}>
              <FontAwesome6 name="lock" size={20} color={colors.black} />
              <Text style={termsAndConditionsScreenStyles.sectionTitle}>PRIVACY & DATA PROTECTION</Text>
            </View>
            <Text style={termsAndConditionsScreenStyles.sectionText}>
              YOUR PRIVACY IS OUR TOP PRIORITY. THIS IS HOW WE HANDLE YOUR DATA:
            </Text>
            <View style={termsAndConditionsScreenStyles.bulletPoint}>
              <Text style={termsAndConditionsScreenStyles.bulletMarker}>-</Text>
              <Text style={termsAndConditionsScreenStyles.bulletText}>
                <Text style={termsAndConditionsScreenStyles.boldText}>NO MALICIOUS USE:</Text> WE NEVER
                USE YOUR DATA FOR HARMFUL PURPOSES.
              </Text>
            </View>
            <View style={termsAndConditionsScreenStyles.bulletPoint}>
              <Text style={termsAndConditionsScreenStyles.bulletMarker}>-</Text>
              <Text style={termsAndConditionsScreenStyles.bulletText}>
                <Text style={termsAndConditionsScreenStyles.boldText}>SECURE STORAGE:</Text> ALL DATA IS
                ENCRYPTED AND SAFELY STORED.
              </Text>
            </View>
            <View style={termsAndConditionsScreenStyles.bulletPoint}>
              <Text style={termsAndConditionsScreenStyles.bulletMarker}>-</Text>
              <Text style={termsAndConditionsScreenStyles.bulletText}>
                <Text style={termsAndConditionsScreenStyles.boldText}>NO THIRD-PARTY SHARING:</Text>{" "}
                YOUR DATA STAYS WITH US.
              </Text>
            </View>
          </View>

          {/* Data Usage */}
          <View style={termsAndConditionsScreenStyles.section}>
            <View style={termsAndConditionsScreenStyles.sectionHeader}>
              <FontAwesome6 name="database" size={20} color={colors.black} />
              <Text style={termsAndConditionsScreenStyles.sectionTitle}>HOW WE USE YOUR DATA</Text>
            </View>
            <Text style={termsAndConditionsScreenStyles.sectionText}>DATA TYPES AND PURPOSES:</Text>
            <Text style={termsAndConditionsScreenStyles.dataTypeTitle}>📸 PHOTOS & IMAGES</Text>
            <Text style={termsAndConditionsScreenStyles.dataDescription}>
              USED ONLY FOR TRAINING AND IMPROVING ATTENDANCE VERIFICATION.
            </Text>
            <Text style={termsAndConditionsScreenStyles.dataTypeTitle}>🎤 AUDIO RECORDINGS</Text>
            <Text style={termsAndConditionsScreenStyles.dataDescription}>
              USED ONLY FOR VOICE VERIFICATION TRAINING.
            </Text>
            <Text style={termsAndConditionsScreenStyles.dataTypeTitle}>📍 LOCATION DATA</Text>
            <Text style={termsAndConditionsScreenStyles.dataDescription}>
              USED ONLY TO VERIFY ATTENDANCE LOCATION.
            </Text>
            <Text style={termsAndConditionsScreenStyles.dataTypeTitle}>👤 ACCOUNT INFORMATION</Text>
            <Text style={termsAndConditionsScreenStyles.dataDescription}>
              USED ONLY FOR LOGIN AND ATTENDANCE TRACKING.
            </Text>
          </View>

          {/* Agreement */}
          <View style={termsAndConditionsScreenStyles.section}>
            <Text style={termsAndConditionsScreenStyles.sectionText}>
              BY TAPPING &quot;ACCEPT TERMS & CONTINUE&quot;, YOU CONFIRM THAT
              YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS.
            </Text>
          </View>

          {/* Scroll Indicator */}
          {isScrollable && !hasScrolledToEnd && (
            <View style={termsAndConditionsScreenStyles.scrollIndicator}>
              <Text style={termsAndConditionsScreenStyles.scrollIndicatorText}>
                ⇩ SCROLL DOWN TO CONTINUE ⇩
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Accept Button */}
      <Animated.View
        entering={FadeInUp.delay(400).springify()}
        style={termsAndConditionsScreenStyles.buttonContainer}
      >
        <TouchableOpacity
          style={[
            termsAndConditionsScreenStyles.acceptButton,
            ((!hasScrolledToEnd && isScrollable) || isProcessing) &&
              termsAndConditionsScreenStyles.buttonDisabled,
          ]}
          onPress={handleAccept}
          disabled={(!hasScrolledToEnd && isScrollable) || isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={termsAndConditionsScreenStyles.acceptButtonText}>SETTING UP...</Text>
            </>
          ) : (
            <>
              <FontAwesome6
                name="check-circle"
                size={20}
                color={colors.black}
              />
              <Text style={termsAndConditionsScreenStyles.acceptButtonText}>
                ACCEPT TERMS & CONTINUE
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!hasScrolledToEnd && isScrollable && (
          <Text style={termsAndConditionsScreenStyles.buttonHelpText}>
            SCROLL TO THE BOTTOM TO ENABLE BUTTON
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

