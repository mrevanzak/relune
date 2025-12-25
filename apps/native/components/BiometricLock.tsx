import * as LocalAuthentication from "expo-local-authentication";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
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

	const authenticate = useCallback(async () => {
		if (Platform.OS === "web") return;

		setIsAuthenticating(true);
		try {
			const result = await LocalAuthentication.authenticateAsync({
				promptMessage: "Unlock Relune",
				fallbackLabel: "Use passcode",
				disableDeviceFallback: false,
			});

			if (result.success) {
				setIsLocked(false);
			}
		} catch (error) {
			console.error("Biometric authentication failed:", error);
		} finally {
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
				setIsLocked(true);
			}
			// Authenticate when coming back to foreground
			if (nextState === "active" && isLocked) {
				authenticate();
			}
		};

		const subscription = AppState.addEventListener(
			"change",
			handleAppStateChange,
		);

		return () => {
			subscription.remove();
		};
	}, [isLocked, authenticate]);

	// Auto-authenticate when locked state changes to true
	useEffect(() => {
		if (isLocked && !isAuthenticating) {
			authenticate();
		}
	}, [isLocked, isAuthenticating, authenticate]);

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
