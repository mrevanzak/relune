import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function HomeLayout() {
	const { top } = useSafeAreaInsets();
	const backgroundColor = useThemeColor({}, "background");

	return (
		<Stack
			screenOptions={{
				header: () => null,
				// headerTransparent: true,
				headerTitle: "",
				headerSearchBarOptions: {
					placeholder: "Search...",
					onChangeText: (text) => {
						console.log("text", text);
					},
				},
				contentStyle: {
					paddingTop: top,
					backgroundColor,
				},
			}}
		/>
	);
}
