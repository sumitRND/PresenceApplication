import { avatarDisplayStyles } from "@/constants/style";
import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";

interface AvatarDisplayProps {
  avatarUrl: string;
  size?: number;
  style?: any;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  avatarUrl,
  size = 120,
}) => {
  const [loading, setLoading] = useState(true);

  const borderWidth = 2;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            width: 100%;
            height: 100%;
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        </style>
      </head>
      <body>
        <img src="${avatarUrl}" alt="Avatar" />
      </body>
    </html>`;

  return (
    <View
      style={[
        avatarDisplayStyles.container,
        {
          width: size,
          height: size,
          borderWidth: borderWidth,
        },
      ]}
    >
      {loading && (
        <View style={avatarDisplayStyles.loadingContainer}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      )}
      <WebView
        source={{ html: htmlContent }}
        style={avatarDisplayStyles.webview}
        onLoadEnd={() => setLoading(false)}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};


