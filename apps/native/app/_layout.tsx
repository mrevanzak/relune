import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AuthGate } from "@/components/AuthGate";
import { BiometricLock } from "@/components/BiometricLock";
import { QueryProvider } from "@/components/QueryProvider";
import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
	anchor: "(tabs)",
};

export default function RootLayout() {
	const colorScheme = useColorScheme();

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
