import { useCallback } from "react";
import { Tabs } from "@/components/NativeBottomTabs";
import { Colors } from "@/constants/theme";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
	const colorScheme = useColorScheme();
	const theme = Colors[colorScheme ?? "light"];
	const { isRecording, start, stop } = useAudioRecorder();

	const handleRecordPress = useCallback(async () => {
		if (isRecording) {
			const result = await stop();
			if (result) {
				// TODO: Handle the recording result (upload, save, etc.)
				console.log("Recording stopped:", result);
			}
		} else {
			await start();
		}
	}, [isRecording, start, stop]);

	return (
		<Tabs
			tabBarActiveTintColor={theme.tint}
			screenListeners={{
				tabPress: (e) => {
					// Check if this is the record tab
					if (e.target?.startsWith("record")) {
						e.preventDefault();
						handleRecordPress();
					}
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: () => ({ sfSymbol: "house.fill" }),
				}}
			/>
			<Tabs.Screen
				name="home"
				options={{
					title: "Search",
					tabBarIcon: () => ({ sfSymbol: "magnifyingglass" }),
				}}
			/>
			<Tabs.Screen
				name="record"
				options={{
					title: isRecording ? "Stop" : "Record",
					preventsDefault: true,
					tabBarIcon: () => ({
						sfSymbol: isRecording ? "stop.circle.fill" : "mic.circle.fill",
					}),
				}}
			/>
		</Tabs>
	);
}
