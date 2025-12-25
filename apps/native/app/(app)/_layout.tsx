import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";
import { BiometricLock } from "@/components/BiometricLock";
import { useSession } from "@/context/session";

export default function AppLayout() {
	const { session, isLoading } = useSession();

	// Show loading while session is being determined
	if (isLoading) {
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
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen
					name="modal"
					options={{ presentation: "modal", title: "Modal" }}
				/>
			</Stack>
		</BiometricLock>
	);
}
