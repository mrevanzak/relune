import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import "react-native-reanimated";

import { AuthGate } from "@/components/AuthGate";
import { BiometricLock } from "@/components/BiometricLock";
import { QueryProvider } from "@/components/QueryProvider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUploadQueueStore } from "@/stores/upload-queue";

export const unstable_settings = {
	anchor: "(tabs)",
};

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const processQueue = useUploadQueueStore.use.processQueue();

	// Process queued uploads when app comes to foreground
	useEffect(() => {
		const subscription = AppState.addEventListener("change", (nextAppState) => {
			if (nextAppState === "active") {
				// Process queue when app becomes active
				void processQueue();
			}
		});

		// Also process on initial mount if there are queued items
		void processQueue();

		return () => {
			subscription.remove();
		};
	}, [processQueue]);

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<QueryProvider>
				<AuthGate>
					<BiometricLock>
						<Stack>
							<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
							<Stack.Screen
								name="modal"
								options={{ presentation: "modal", title: "Modal" }}
							/>
						</Stack>
						<StatusBar style="auto" />
					</BiometricLock>
				</AuthGate>
			</QueryProvider>
		</ThemeProvider>
	);
}
