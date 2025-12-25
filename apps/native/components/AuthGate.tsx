import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Button,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { initMmkv } from "@/lib/mmkv";
import { getSupabaseClient } from "@/lib/supabase";
import { useSignInWithGoogleMutation } from "@/queries/auth";
import { useAuthStore } from "@/stores/auth";

WebBrowser.maybeCompleteAuthSession();

interface AuthGateProps {
	children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
	const [isInitializing, setIsInitializing] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const session = useAuthStore.use.session();
	const setSession = useAuthStore.use.setSession();
	const signInMutation = useSignInWithGoogleMutation();

	useEffect(() => {
		let mounted = true;

		(async () => {
			try {
				// Initialize MMKV storage (on native platforms)
				if (Platform.OS !== "web") {
					await initMmkv();
					// Rehydrate zustand store after MMKV is ready
					useAuthStore.persist.rehydrate();
				}

				// Get Supabase client (will use MMKV storage on native, localStorage on web)
				const supabase = getSupabaseClient();

				// Get initial session
				const {
					data: { session: initialSession },
				} = await supabase.auth.getSession();

				if (mounted) {
					setSession(initialSession);
					setIsLoading(false);
					setIsInitializing(false);
				}

				// Subscribe to auth state changes
				const {
					data: { subscription },
				} = supabase.auth.onAuthStateChange((_event, newSession) => {
					if (mounted) {
						setSession(newSession);
					}
				});

				return () => {
					mounted = false;
					subscription.unsubscribe();
				};
			} catch (error) {
				console.error("Failed to initialize auth:", error);
				if (mounted) {
					setIsInitializing(false);
					setIsLoading(false);
				}
			}
		})();
	}, [setSession]);

	const handleSignIn = () => {
		signInMutation.mutate();
	};

	if (isInitializing || isLoading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (!session) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Rêlune</Text>
				<Text style={styles.subtitle}>Private voice recordings</Text>
				{signInMutation.isError && (
					<Text style={styles.error}>
						{signInMutation.error instanceof Error
							? signInMutation.error.message
							: "Sign in failed"}
					</Text>
				)}
				<View style={styles.buttonContainer}>
					<Button
						title={
							signInMutation.isPending ? "Signing in..." : "Sign in with Google"
						}
						onPress={handleSignIn}
						disabled={signInMutation.isPending}
					/>
				</View>
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
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginBottom: 32,
	},
	buttonContainer: {
		width: "100%",
		maxWidth: 300,
	},
	error: {
		color: "#ff0000",
		marginBottom: 16,
		textAlign: "center",
	},
});
