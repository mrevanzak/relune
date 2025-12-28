import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";
import { BiometricLock } from "@/components/BiometricLock";
import { useSession } from "@/context/session";

export default function AppLayout() {
	const { session, isInitialized } = useSession();

	// Show loading while session is being determined
	if (!isInitialized) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<Text>Loading...</Text>
			</View>
		);
	}

	// Redirect to sign-in if not authenticated
	if (!session) {
		return <Redirect href="/sign-in" />;
	}

	return (
		<BiometricLock>
			<Stack initialRouteName="(tabs)">
				<Stack.Screen
					name="(tabs)"
					options={{ headerShown: false, title: "Home" }}
				/>
				<Stack.Screen
					name="import"
					options={{
						presentation: "formSheet",
						headerShown: false,
						sheetGrabberVisible: true,
						sheetAllowedDetents: [0.4],
						contentStyle: {
							backgroundColor: "transparent",
						},
					}}
				/>
				<Stack.Screen
					name="recording/[id]"
					options={{
						title: "",
						headerBackTitle: "",
						headerBackButtonDisplayMode: "minimal",
						headerBackButtonMenuEnabled: false,
						headerTransparent: true,
					}}
				/>
				<Stack.Screen
					name="edit-recording/[id]"
					options={{
						presentation: "formSheet",
						sheetGrabberVisible: true,
						sheetAllowedDetents: "fitToContents",
					}}
				/>
				<Stack.Screen name="index" redirect />
			</Stack>
		</BiometricLock>
	);
}
