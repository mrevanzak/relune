import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SoftButton } from "@/components/ui/SoftButton";
import { Fonts } from "@/constants/theme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface BiometricLockProps {
  children: ReactNode;
}

/**
 * BiometricLock prompts for FaceID/TouchID when the app resumes from background.
 * On web, it's a no-op and just renders children.
 */
export function BiometricLock({ children }: BiometricLockProps) {
  // Theme colors
  const tint = useThemeColor({}, "tint");
  const surface = useThemeColor({}, "surface");
  const lilac = useThemeColor({}, "lilac");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometric");

  const isLockedRef = useRef(isLocked);
  const isAuthenticatingRef = useRef(isAuthenticating);
  const autoAuthPendingRef = useRef(false);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    isAuthenticatingRef.current = isAuthenticating;
  }, [isAuthenticating]);

  const authenticate = useCallback(async () => {
    if (Platform.OS === "web") return;

    // Update the ref synchronously to avoid race conditions with AppState events
    // (eg. biometric prompt causing `inactive -> active` while state updates flush).
    isAuthenticatingRef.current = true;
    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Relune",
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        autoAuthPendingRef.current = false;
        isLockedRef.current = false;
        setIsLocked(false);
      }
    } catch (error) {
      // Silently handle authentication errors
      void error;
    } finally {
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Check available biometric types
    (async () => {
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (
        types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        setBiometricType("Face ID");
      } else if (
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        setBiometricType("Touch ID");
      }
    })();

    // Listen for app state changes
    const handleAppStateChange = (nextState: AppStateStatus) => {
      // Lock when going to background
      if (nextState === "background") {
        autoAuthPendingRef.current = true;
        isLockedRef.current = true;
        setIsLocked(true);
        return;
      }
      // Authenticate when coming back to foreground
      if (
        nextState === "active" &&
        isLockedRef.current &&
        autoAuthPendingRef.current &&
        !isAuthenticatingRef.current
      ) {
        // Only auto-auth once per "lock session" to avoid infinite reprompt loops
        // (biometric prompts can themselves trigger `inactive -> active`).
        autoAuthPendingRef.current = false;
        void authenticate();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [authenticate]);

  // On web, just render children
  if (Platform.OS === "web") {
    return <>{children}</>;
  }

  if (isLocked) {
    return (
      <View style={styles.container}>
        {/* Lock icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: surface, shadowColor: lilac },
          ]}
        >
          <Ionicons color={tint} name="lock-closed" size={48} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: text }]}>Relune is Locked</Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          {isAuthenticating
            ? "Authenticating..."
            : `Use ${biometricType} to unlock`}
        </Text>

        {/* Unlock button */}
        {!isAuthenticating && (
          <SoftButton
            onPress={authenticate}
            style={styles.button}
            title={`Unlock with ${biometricType}`}
          />
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "300",
    marginBottom: 8,
    fontFamily: Fonts?.serif || "serif",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    width: "100%",
    maxWidth: 280,
  },
});
