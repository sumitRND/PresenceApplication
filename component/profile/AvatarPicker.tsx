import { brutalistColors } from "@/constants/colors";
import { avatarPickerStyles } from "@/constants/style";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SvgXml } from "react-native-svg";

interface AvatarPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (avatarData: { style: string; seed: string; url: string }) => void;
  currentAvatar?: { style: string; seed: string };
}

const AVATAR_STYLES = [
  { id: "adventurer", name: "Adventurer", description: "Cartoon-style characters" },
  { id: "avataaars", name: "Avataaars", description: "Sketch-style avatars" },
  { id: "big-ears", name: "Big Ears", description: "Characters with big ears" },
  { id: "big-smile", name: "Big Smile", description: "Happy characters" },
  { id: "bottts", name: "Bottts", description: "Robot avatars" },
  { id: "croodles", name: "Croodles", description: "Doodle-style characters" },
  { id: "fun-emoji", name: "Fun Emoji", description: "Emoji-style avatars" },
  { id: "identicon", name: "Identicon", description: "Geometric patterns" },
  { id: "lorelei", name: "Lorelei", description: "Minimalist characters" },
  { id: "micah", name: "Micah", description: "Illustrated characters" },
  { id: "miniavs", name: "Miniavs", description: "Pixel-style avatars" },
  { id: "notionists", name: "Notionists", description: "Notion-style avatars" },
  { id: "open-peeps", name: "Open Peeps", description: "Hand-drawn style" },
  { id: "personas", name: "Personas", description: "Abstract characters" },
  { id: "pixel-art", name: "Pixel Art", description: "8-bit style avatars" },
];

const SEED_OPTIONS = [
  "happy",
  "cool",
  "awesome",
  "amazing",
  "wonderful",
  "fantastic",
  "brilliant",
  "excellent",
  "marvelous",
  "superb",
  "outstanding",
  "remarkable",
];

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  visible,
  onClose,
  onSelect,
  currentAvatar,
}) => {
  const [selectedStyle, setSelectedStyle] = useState(
    currentAvatar?.style || "adventurer"
  );
  const [selecting, setSelecting] = useState(false);

  const generateAvatarUrl = (style: string, seed: string) => {
    return `${process.env.EXPO_PUBLIC_DICEBEAR_API_URL}/${style}/svg?seed=${encodeURIComponent(
      seed
    )}&size=120`
  };

  const handleAvatarSelect = async (style: string, seed: string) => {
    setSelecting(true);
    const url = generateAvatarUrl(style, seed);
    
    // Small delay to show feedback
    setTimeout(() => {
      onSelect({ style, seed, url });
      setSelecting(false);
      onClose();
    }, 300);
  };

  const AvatarOption = ({ style, seed }: { style: string; seed: string }) => {
    const url = generateAvatarUrl(style, seed);
    const [svgXml, setSvgXml] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      setLoading(true);
      fetch(url)
        .then((res) => res.text())
        .then((xml) => {
          setSvgXml(xml);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error loading avatar:', err);
          setLoading(false);
        });
    }, [url]);

    const isSelected =
      currentAvatar?.style === style && currentAvatar?.seed === seed;

    return (
      <TouchableOpacity
        style={[
          avatarPickerStyles.avatarOption,
          isSelected && avatarPickerStyles.selectedAvatarOption,
        ]}
        onPress={() => handleAvatarSelect(style, seed)}
        disabled={selecting || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <View style={{ padding: 10 }}>
            <ActivityIndicator size="small" color={brutalistColors.black} />
          </View>
        ) : svgXml ? (
          <SvgXml xml={svgXml} width={60} height={60} />
        ) : (
          <View style={{
            width: 60,
            height: 60,
            backgroundColor: brutalistColors.lightGray,
            borderWidth: 2,
            borderColor: brutalistColors.black,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <FontAwesome6 name="image" size={20} color={brutalistColors.gray} />
          </View>
        )}

        {isSelected && (
          <View style={avatarPickerStyles.selectedBadge}>
            <FontAwesome6 name="check" size={12} color="white" />
          </View>
        )}
        
        {selecting && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={avatarPickerStyles.container}>
        {/* Header */}
        <View style={avatarPickerStyles.header}>
          <TouchableOpacity 
            onPress={onClose} 
            style={avatarPickerStyles.closeButton}
            disabled={selecting}
          >
            <FontAwesome6 name="xmark" size={20} color="#000" />
          </TouchableOpacity>
          <Text style={avatarPickerStyles.headerTitle}>CHOOSE AVATAR</Text>
          <View style={avatarPickerStyles.placeholder} />
        </View>

        {selecting && (
          <View style={{
            backgroundColor: brutalistColors.lightGray,
            padding: 12,
            borderBottomWidth: 3,
            borderColor: brutalistColors.black,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}>
            <ActivityIndicator size="small" color={brutalistColors.black} />
            <Text style={{
              fontSize: 14,
              fontWeight: '700',
              color: brutalistColors.black,
              textTransform: 'uppercase',
            }}>
              SELECTING AVATAR...
            </Text>
          </View>
        )}

        <ScrollView style={avatarPickerStyles.content} showsVerticalScrollIndicator={false}>
          {/* Style Selector */}
          <View style={avatarPickerStyles.section}>
            <Text style={avatarPickerStyles.sectionTitle}>AVATAR STYLE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {AVATAR_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    avatarPickerStyles.styleOption,
                    selectedStyle === style.id && avatarPickerStyles.selectedStyleOption,
                  ]}
                  onPress={() => setSelectedStyle(style.id)}
                  disabled={selecting}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      avatarPickerStyles.styleName,
                      selectedStyle === style.id && avatarPickerStyles.selectedStyleName,
                    ]}
                  >
                    {style.name}
                  </Text>
                  <Text style={avatarPickerStyles.styleDescription}>{style.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Avatar Grid */}
          <View style={avatarPickerStyles.section}>
            <Text style={avatarPickerStyles.sectionTitle}>SELECT AVATAR</Text>
            <View style={avatarPickerStyles.avatarGrid}>
              {SEED_OPTIONS.map((seed) => (
                <AvatarOption key={seed} style={selectedStyle} seed={seed} />
              ))}
            </View>
          </View>
          
          {/* Info Text */}
          <View style={{
            marginTop: 20,
            marginBottom: 40,
            padding: 16,
            backgroundColor: brutalistColors.lightGray,
            borderWidth: 2,
            borderColor: brutalistColors.black,
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: brutalistColors.black,
              textAlign: 'center',
            }}>
              Tap any avatar to select it
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};