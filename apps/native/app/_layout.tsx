import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { AppState, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BootstrapErrorScreen } from "@/components/BootstrapErrorScreen";
import { QueryProvider } from "@/components/QueryProvider";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { SessionProvider, useSession } from "@/context/session";
import { useProcessUploadQueue } from "@/features/upload";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
	initialRouteName: "home",
};

function RootLayoutNav() {
	const colorScheme = useColorScheme();
	const { isInitialized, error, retry, session } = useSession();
	const { processQueue } = useProcessUploadQueue();

	// Hide splash screen when bootstrap completes
	const onLayoutRootView = useCallback(async () => {
		if (isInitialized) {
			await SplashScreen.hideAsync();
		}
	}, [isInitialized]);

	// Process queued uploads when app comes to foreground
	useEffect(() => {
		if (!session) return;

		const subscription = AppState.addEventListener("change", (nextAppState) => {
			if (nextAppState === "active") {
				void processQueue();
			}
		});

		// Also process on initial mount
		void processQueue();

		return () => {
			subscription.remove();
		};
	}, [session, processQueue]);

	// Show error screen if bootstrap failed
	if (error) {
		return <BootstrapErrorScreen error={error} onRetry={retry} />;
	}

	// Return null while loading (splash screen stays visible)
	if (!isInitialized) {
		return null;
	}

	return (
		<View style={{ flex: 1 }} onLayout={onLayoutRootView}>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<GradientBackground>
					<Slot />
				</GradientBackground>
				<StatusBar style="auto" />
			</ThemeProvider>
		</View>
	);
}

export default function RootLayout() {
	return (
		<GestureHandlerRootView>
			<KeyboardProvider>
				<QueryProvider>
					<SessionProvider>
						<RootLayoutNav />
					</SessionProvider>
				</QueryProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}
