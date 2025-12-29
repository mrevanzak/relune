import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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

// Grace period in milliseconds (60 seconds)
const GRACE_PERIOD_MS = 5000;
// Initial authentication delay on cold start (allow UI to settle)
const INITIAL_AUTH_DELAY_MS = 400;

/**
 * BiometricLock prompts for FaceID/TouchID on initial app entry and when returning from background.
 * - Grace period: if user returns within 60s, no re-prompt
 * - Privacy shield: renders blur overlay on inactive/background to hide app switcher preview
 * On web, it's a no-op and just renders children.
 */
export function BiometricLock({ children }: BiometricLockProps) {
  // Theme colors
  const tint = useThemeColor({}, "tint");
  const surface = useThemeColor({}, "surface");
  const lilac = useThemeColor({}, "lilac");
  const text = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");

  // Lock state: true = user needs to authenticate before seeing children
  const [isLocked, setIsLocked] = useState(Platform.OS !== "web");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometric");
  // Privacy shield: true = show blur overlay (even if not locked)
  const [showPrivacyShield, setShowPrivacyShield] = useState(false);
  // Current app state
  const [appState, setAppState] = useState(AppState.currentState);

  const isLockedRef = useRef(isLocked);
  const isAuthenticatingRef = useRef(isAuthenticating);
  const autoAuthPendingRef = useRef(false);
  // Track when the app last went inactive/background for grace period calculation
  const lastInactiveAtMsRef = useRef<number | null>(null);
  // Track whether we've done initial auth on cold start
  const hasInitialAuthRef = useRef(false);

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
        setShowPrivacyShield(false);
        hasInitialAuthRef.current = true;
      }
    } catch (error) {
      // Silently handle authentication errors
      console.error(error);
    } finally {
      isAuthenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, []);

  // Initial mount: prompt biometric after a short delay (cold start)
  useEffect(() => {
    if (Platform.OS === "web") return;

    const timer = setTimeout(() => {
      // Only auto-authenticate on initial mount if:
      // 1. We haven't already authenticated
      // 2. We're not currently authenticating
      // 3. We're still locked
      if (
        !(
          hasInitialAuthRef.current ||
          isAuthenticatingRef.current ||
          autoAuthPendingRef.current
        ) &&
        isLockedRef.current
      ) {
        autoAuthPendingRef.current = true;
        authenticate();
      }
    }, INITIAL_AUTH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [authenticate]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Check if biometrics are available and enrolled
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      // If biometrics not available or not enrolled, unlock immediately
      if (!(compatible && enrolled)) {
        console.warn(
          "Biometrics not available or not enrolled - unlocking app"
        );
        hasInitialAuthRef.current = true;
        isLockedRef.current = false;
        setIsLocked(false);
        return;
      }

      // Determine biometric type for display
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
      setAppState(nextState);

      // When going inactive or to background: show privacy shield + record timestamp
      if (nextState === "inactive" || nextState === "background") {
        setShowPrivacyShield(true);
        if (!lastInactiveAtMsRef.current) {
          lastInactiveAtMsRef.current = Date.now();
        }
        return;
      }

      // When coming back to active: check grace period
      if (nextState === "active") {
        const now = Date.now();
        const lastInactiveAt = lastInactiveAtMsRef.current;
        const timeAwayMs = lastInactiveAt ? now - lastInactiveAt : 0;

        // Reset the timestamp
        lastInactiveAtMsRef.current = null;

        // Grace period: if user returned quickly AND already authenticated initially, skip lock
        if (
          timeAwayMs > 0 &&
          timeAwayMs < GRACE_PERIOD_MS &&
          hasInitialAuthRef.current
        ) {
          setShowPrivacyShield(false);
          return;
        }

        // Past grace period or not yet authenticated: need to lock and authenticate
        if (!isLockedRef.current) {
          isLockedRef.current = true;
          setIsLocked(true);
        }

        // Auto-authenticate if locked and not already authenticating
        // Guard against multiple simultaneous auth attempts (eg. biometric prompt causes inactive->active)
        if (
          isLockedRef.current &&
          !autoAuthPendingRef.current &&
          !isAuthenticatingRef.current
        ) {
          autoAuthPendingRef.current = true;
          authenticate();
        }
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

  // Render lock screen if locked
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

  // Render children with optional privacy shield overlay
  return (
    <View style={{ flex: 1 }}>
      {children}

      {/* Privacy shield: show blur overlay when app is inactive/background */}
      {showPrivacyShield && appState !== "active" && (
        <View pointerEvents="box-only" style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={100}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />

          {/* Semi-opaque overlay to further obscure content */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0, 0, 0, 0.3)" },
            ]}
          />
        </View>
      )}
    </View>
  );
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
