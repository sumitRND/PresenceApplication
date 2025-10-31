# Presence - IIT Guwahati Attendance System

![Expo](https://img.shields.io/badge/expo-~54.0.13-blue)
![React Native](https://img.shields.io/badge/react--native-0.81.4-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.9.2-blue)

**A comprehensive mobile attendance tracking system built with React Native & Expo**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#️-configuration)
- [Project Structure](#-project-structure)
- [Running the App](#-running-the-app)
- [Building for Production](#-building-for-production)
- [API Integration](#-api-integration)
- [Key Concepts](#-key-concepts)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Presence** is a modern, feature-rich mobile attendance tracking application designed specifically for IIT Guwahati. The app combines multiple verification methods including photo capture, voice recording, and GPS-based location tracking to ensure accurate and secure attendance marking.

### Why Presence?

- **Multi-Factor Verification**: Combines photo, audio, and location verification
- **Geofencing Technology**: Ensures users are within designated campus/department boundaries
- **Flexible Modes**: Supports both on-campus and field trip attendance
- **Session Management**: Handles forenoon and afternoon sessions with automatic checkout
- **Real-time Tracking**: Live attendance status with calendar view
- **Smart Notifications**: Intelligent reminders based on work sessions

---

## ✨ Features

### 🔐 Authentication & Security

- Secure JWT-based authentication
- Session management with automatic expiry
- Token refresh and auto-logout functionality
- Encrypted local storage

### 📸 Multi-Modal Verification

- **Photo Verification**: Capture front-facing photo with on-screen guides
- **Voice Verification**: Record audio stating today's date
- **Location Verification**: GPS-based geofencing with department-level accuracy
- Real-time validation before submission

### 🗺️ Intelligent Geofencing

- IIT Guwahati campus boundary detection (1.2km radius)
- Department-specific location zones (200m radius)
- Support for 22+ departments across campus
- Interactive map with user position tracking
- Field trip mode for off-campus attendance

### ⏰ Session Management

- **Forenoon Session**: 9:00 AM - 1:00 PM
- **Afternoon Session**: 1:00 PM - 5:30 PM
- Automatic session detection
- Half-day and full-day attendance tracking
- Manual checkout functionality
- Auto-completion after 11:00 PM

### 📅 Attendance Tracking

- Monthly attendance calendar view
- Detailed attendance history with status indicators
- Holiday and weekend marking
- Field trip date tracking
- Statistics and analytics
- Export-ready data format

### 🔔 Smart Notifications

- Morning, afternoon, and evening attendance reminders
- Checkout reminders based on check-in time
- Session expiry warnings
- Customizable notification preferences
- Push notification support

### 👤 Profile Management

- User profile with employee information
- Customizable avatars (15+ styles, 12+ variations)
- Department and project information
- Attendance calendar integration

### 🎨 Modern UI/UX

- Brutalist design aesthetic
- Smooth animations with Reanimated
- Responsive layout for all screen sizes
- Accessibility support
- Dark mode compatible

---

## 🛠️ Tech Stack

### Core Framework

- **React Native** (0.81.4) - Cross-platform mobile framework
- **Expo** (~54.0.13) - Development platform and toolchain
- **TypeScript** (5.9.2) - Type-safe JavaScript

### State Management & Storage

- **Zustand** (5.0.8) - Lightweight state management
- **AsyncStorage** (2.2.0) - Persistent local storage
- **Zustand Persist** - State persistence middleware

### UI & Styling

- **React Native Reanimated** (4.1.1) - Smooth animations
- **Expo Linear Gradient** (15.0.7) - Gradient backgrounds
- **React Native SVG** (15.14.0) - Vector graphics
- **Expo Blur** (15.0.7) - Blur effects

### Camera & Media

- **Expo Camera** (17.0.8) - Photo capture
- **Expo Audio** (1.0.13) - Voice recording
- **Expo Image Manipulator** (14.0.7) - Image processing
- **Expo Image** (3.0.9) - Optimized image component

### Location & Maps

- **Expo Location** (19.0.7) - GPS and geolocation
- **React Native Leaflet View** (1.1.2) - Interactive maps
- **OpenStreetMap** - Map tiles and data

### Notifications & Scheduling

- **Expo Notifications** (0.32.12) - Push notifications
- **Expo Device** (8.0.9) - Device information

### Networking

- **Axios** (1.12.2) - HTTP client
- **React Native WebView** (13.15.0) - Web content rendering

### Calendar & Date

- **React Native Calendars** (1.1313.0) - Calendar component
- Custom date utilities for session management

### Development Tools

- **ESLint** (9.25.0) - Code linting
- **Expo Dev Client** (6.0.15) - Custom development builds
- **Metro Bundler** - JavaScript bundler

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

```bash
Node.js >= 18.x
npm >= 9.x or yarn >= 1.22.x
```

### Development Environment

Choose one or more platforms:

#### For iOS Development

- macOS with Xcode 14+
- CocoaPods (sudo gem install cocoapods)
- iOS Simulator or physical iOS device

#### For Android Development

- Android Studio with Android SDK
- Java Development Kit (JDK) 17+
- Android Emulator or physical Android device

#### For Web Development

- Modern web browser (Chrome, Firefox, Safari)

### Expo CLI

```bash
npm install -g expo-cli
# or
npm install -g eas-cli  # For Expo Application Services
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/presence-attendance.git
cd presence-attendance
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Install iOS Dependencies (macOS only)

```bash
cd ios && pod install && cd ..
```

### 4. Verify Installation

```bash
npx expo doctor
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
EXPO_PUBLIC_API_BASE=http://your-api-server:3000/api

# DiceBear Avatar API
EXPO_PUBLIC_DICEBEAR_API_URL=https://api.dicebear.com/9.x

# OpenStreetMap Configuration
EXPO_PUBLIC_OPENSTREETMAP_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
EXPO_PUBLIC_OPENSTREETMAP_ATTRIBUTION=© [OSM](https://www.openstreetmap.org/copyright)
```

### App Configuration

Edit `app.json` to customize app metadata:

```json
{
  "expo": {
    "name": "presence",
    "slug": "presence",
    "version": "1.0.0",
    "orientation": "portrait"
    // ... other configurations
  }
}
```

### Geofence Configuration

Modify department locations in `constants/geofenceLocation.ts`:

```typescript
export const DEPARTMENTS: GeofenceLocation[] = [
  {
    id: "Dept1",
    label: "Department Name",
    center: { lat: 26.xxxx, lng: 91.xxxx },
    radius: 200, // meters
  },
  // Add more departments...
];
```

---

## 📁 Project Structure

```
presence/
├── app/                          # Main application screens
│   ├── (auth)/                   # Authentication flow
│   │   ├── login.tsx            # Login screen
│   │   └── terms.tsx            # Terms & Conditions
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── index.tsx            # Attendance screen
│   │   └── profile.tsx          # Profile screen
│   └── _layout.tsx              # Root layout with providers
│
├── component/                    # Reusable components
│   ├── attendance/              # Attendance-related components
│   │   ├── AttendanceContainer.tsx
│   │   ├── HomeView.tsx
│   │   ├── PhotoGrid.tsx
│   │   └── AudioSection.tsx
│   ├── camera/                  # Camera components
│   │   ├── CameraView.tsx
│   │   └── CameraControl.tsx
│   ├── audio/                   # Audio recording components
│   │   ├── AudioRecorder.tsx
│   │   └── AudioPlayer.tsx
│   ├── map/                     # Map & geofencing components
│   │   ├── GeofenceMap.tsx
│   │   ├── MapCard.tsx
│   │   └── ExpandedMapView.tsx
│   ├── profile/                 # Profile components
│   │   ├── ProfileContainer.tsx
│   │   ├── AttendanceCalendar.tsx
│   │   └── AvatarPicker.tsx
│   └── ui/                      # Common UI components
│       ├── Button.tsx
│       ├── LoadingScreen.tsx
│       └── TermsAndConditionsScreen.tsx
│
├── services/                     # API & business logic
│   ├── authService.ts           # Authentication
│   ├── attendanceService.ts     # Attendance operations
│   ├── attendanceValidationService.ts
│   ├── attendanceCalendarService.ts
│   ├── profileService.ts        # User profile
│   ├── notificationService.ts   # Push notifications
│   ├── permissionsService.ts    # Device permissions
│   └── avatarStorageService.ts  # Avatar management
│
├── store/                        # State management
│   ├── authStore.ts             # Authentication state
│   └── attendanceStore.ts       # Attendance state
│
├── hooks/                        # Custom React hooks
│   ├── useCamera.ts             # Camera functionality
│   ├── useAudio.ts              # Audio recording
│   ├── useGeofence.ts           # Location tracking
│   ├── useProfile.ts            # Profile management
│   ├── useNotification.ts       # Notification handling
│   └── useAppPermissions.ts     # Permission management
│
├── constants/                    # App constants
│   ├── colors.ts                # Color palette
│   ├── style.ts                 # Shared styles
│   └── geofenceLocation.ts      # Geofence data
│
├── types/                        # TypeScript definitions
│   ├── attendance.ts
│   └── geofence.ts
│
├── utils/                        # Utility functions
│   ├── responsive.ts            # Responsive scaling
│   └── helper.ts                # General helpers
│
├── assets/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── leaflet.html             # Map HTML template
│
├── .env                          # Environment variables
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 🎬 Running the App

### Development Mode

#### Start Expo Development Server

```bash
npm start
# or
npx expo start
```

#### Run on Specific Platform

```bash
# iOS
npm run ios
# or
npx expo start --ios

# Android
npm run android
# or
npx expo start --android

# Web
npm run web
# or
npx expo start --web
```

#### With Cache Clearing

```bash
npm run reset-cache
```

### Development Options

Once the dev server starts, you can:

- Press **i** to open iOS Simulator
- Press **a** to open Android Emulator
- Press **w** to open in web browser
- Scan QR code with Expo Go app on your phone

---

## 📱 Building for Production

### Prerequisites for Production Builds

#### Configure EAS (Expo Application Services)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### iOS Production Build

```bash
# Create iOS App Store build
eas build --platform ios --profile production

# Create iOS Ad Hoc build for testing
eas build --platform ios --profile preview

# Create iOS Simulator build
eas build --platform ios --profile development
```

### Android Production Build

```bash
# Create Android App Bundle (AAB) for Play Store
eas build --platform android --profile production

# Create Android APK for direct distribution
eas build --platform android --profile preview

# Create Android Debug APK
eas build --platform android --profile development
```

### Build Profiles

Configure in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "bundler": "metro"
      }
    }
  }
}
```

### Submit to App Stores

```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play Store
eas submit --platform android
```

---

## 🔌 API Integration

### Backend Requirements

The app requires a REST API backend with the following endpoints:

#### Authentication

```
POST /api/login
Body: { username, password }
Response: { success, token, employeeNumber, username, empClass, projects }
```

#### Attendance

```
POST /api/attendance
Headers: Authorization: Bearer <token>
Body: FormData {
  employeeNumber, username, timestamp,
  location, latitude, longitude,
  photo (file), audio (file), audioDuration
}

GET /api/attendance/today/:employeeNumber
Headers: Authorization: Bearer <token>
Response: { success, data: { checkInTime, checkOutTime, sessionType, ... } }

POST /api/attendance/checkout
Headers: Authorization: Bearer <token>
Body: { employeeNumber }

GET /api/attendance/calendar/:employeeNumber?year&month
Headers: Authorization: Bearer <token>
Response: { success, data: { attendances[], statistics } }
```

#### Profile

```
GET /api/profile/:employeeNumber
Headers: Authorization: Bearer <token>
Response: { success, data: { employeeNumber, username, empClass } }
```

#### Field Trips

```
GET /api/user-field-trips/employee/:employeeNumber
Headers: Authorization: Bearer <token>
Response: { success, data: { fieldTrips[] } }
```

#### Calendar

```
GET /api/calendar?year&month
Response: { success, data: { entries[] } }
```

### API Client Configuration

The app uses Axios with interceptors for:

- Automatic token injection
- Request timeout handling
- Error response handling
- Token expiry detection

### Error Handling

The app handles common API errors:

- 401/403: Session expired → Auto logout
- 404: Resource not found
- 500: Server error
- Network errors: Connection issues

---

## 🧠 Key Concepts

### Attendance Workflow

1. **User Login**
   - Credentials validated via API
   - JWT token stored securely
   - User data cached locally

2. **Location Verification**
   - GPS position acquired
   - Geofence boundaries checked
   - Department proximity validated

3. **Photo Capture**
   - Front-facing camera activated
   - Face detection guidance
   - Image quality validation

4. **Audio Recording**
   - Microphone activated
   - User records date verification
   - Audio waveform visualization

5. **Submission**
   - All data compiled
   - Session type determined
   - Multi-part form upload
   - Server validation

6. **Checkout**
   - Manual or automatic (11 PM)
   - Full-day vs half-day calculation
   - Final attendance confirmation

### Session Management

```
Forenoon Session: 9:00 AM - 1:00 PM
Afternoon Session: 1:00 PM - 5:30 PM

Attendance Types:
- FULL_DAY: Checked in forenoon, checked out afternoon
- HALF_DAY: Single session attendance
- AUTO_COMPLETED: Not checked out by 11 PM
```

### Geofencing Logic

```
Level 1: IIT Guwahati Campus (1.2 km radius)
   └─ Level 2: Department Buildings (200m radius each)

Validation Rules:
1. Must be within campus boundary
2. Must be within department boundary (for CAMPUS mode)
3. Must be within working hours
4. Field trip mode bypasses boundary checks
```

### State Persistence

The app uses Zustand with AsyncStorage for:

- Authentication state (token, user info)
- Attendance records (local cache)
- User preferences
- Field trip settings

State is automatically:

- Saved on changes
- Restored on app restart
- Cleared on logout

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Metro Bundler Won't Start

```bash
# Clear Metro cache
npm run reset-cache

# Kill Metro process
npx kill-port 8081

# Clean install
rm -rf node_modules
npm install
```

#### 2. iOS Build Fails

```bash
# Clean CocoaPods
cd ios
pod deintegrate
pod install
cd ..

# Clean Xcode build
rm -rf ios/build
```

#### 3. Android Build Fails

```bash
# Clean Gradle cache
cd android
./gradlew clean
cd ..

# Clear Android build
rm -rf android/app/build
```

#### 4. Location Not Working

- Ensure location permissions are granted
- Check GPS is enabled on device
- Verify API_BASE URL is correct
- Test on physical device (not simulator)

#### 5. Camera Issues

- Grant camera permissions
- Test on physical device
- Check for other apps using camera
- Restart app

#### 6. API Connection Errors

```bash
# Check network connectivity
# Verify API_BASE in .env
# Test API endpoints with Postman
# Check CORS settings on backend
```

### Debug Mode

Enable detailed logging:

```typescript
// Add to app/_layout.tsx
if (__DEV__) {
  console.log('Running in development mode');
  // Enable additional debugging
}
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**

2. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation

4. **Test thoroughly**
   - Test on iOS and Android
   - Check all user flows
   - Verify edge cases

5. **Commit your changes**

```bash
git commit -m "Add amazing feature"
```

6. **Push to branch**

```bash
git push origin feature/amazing-feature
```

7. **Open a Pull Request**

### Code Style

- Use TypeScript for type safety
- Follow existing naming conventions
- Use functional components with hooks
- Keep components small and focused
- Add PropTypes or TypeScript interfaces
- Write meaningful commit messages

### Commit Message Format

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:

```
feat(attendance): add photo retake functionality

- Allow users to retake individual photos
- Maintain photo position for retakes
- Update UI to show retake button

Closes #123
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 IIT Guwahati

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Authors & Acknowledgments

### Development Team

- **Sumit Sinha** - [YourGitHub](https://github.com/Misenpai)

### Acknowledgments

- IIT Guwahati for project requirements
- Expo team for excellent documentation
- OpenStreetMap for map data
- DiceBear for avatar generation API

---

## 📞 Support

### Documentation

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### Contact

- **Email**: [support@yourproject.com](mailto:support@yourproject.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/presence/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/presence/discussions)

---

## 🗺️ Roadmap

### Upcoming Features

- ✅ Biometric authentication (Face ID/Touch ID)
- ✅ Offline mode with sync
- ✅ Multiple photo angles
- ✅ Leave application system
- ✅ Analytics dashboard
- ✅ Export attendance reports
- ✅ Multi-language support
- ✅ Dark theme
- ✅ Widget support

### Version History

- **v1.0.0** (Current) - Initial release
  - Basic attendance marking
  - Photo and audio verification
  - Geofencing
  - Profile management
  - Calendar view

---

**Made with ❤️ for IIT Guwahati**

[⬆ Back to Top](#presence---iit-guwahati-attendance-system)
