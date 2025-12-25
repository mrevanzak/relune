import * as LocalAuthentication from "expo-local-authentication";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	AppState,
	type AppStateStatus,
	Button,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";

interface BiometricLockProps {
	children: ReactNode;
}

/**
 * BiometricLock prompts for FaceID/TouchID when the app resumes from background.
 * On web, it's a no-op and just renders children.
 */
export function BiometricLock({ children }: BiometricLockProps) {
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
			console.error("Biometric authentication failed:", error);
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
					LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
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
			handleAppStateChange,
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
				<Text style={styles.icon}>🔒</Text>
				<Text style={styles.title}>Relune is Locked</Text>
				<Text style={styles.subtitle}>
					{isAuthenticating
						? "Authenticating..."
						: `Use ${biometricType} to unlock`}
				</Text>
				{!isAuthenticating && (
					<View style={styles.buttonContainer}>
						<Button
							title={`Unlock with ${biometricType}`}
							onPress={authenticate}
						/>
					</View>
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
		padding: 20,
		backgroundColor: "#000",
	},
	icon: {
		fontSize: 64,
		marginBottom: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#888",
		marginBottom: 32,
		textAlign: "center",
	},
	buttonContainer: {
		width: "100%",
		maxWidth: 300,
	},
});
