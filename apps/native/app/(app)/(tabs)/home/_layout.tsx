import { Stack } from "expo-router";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function HomeLayout() {
	const background = useThemeColor({}, "background");

	return (
		<Stack
			screenOptions={{
				contentStyle: {
					backgroundColor: background,
				},
			}}
		/>
	);
}
