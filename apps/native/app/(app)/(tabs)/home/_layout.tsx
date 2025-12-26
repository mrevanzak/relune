import { Stack } from "expo-router";

export default function HomeLayout() {
	return (
		<Stack
			screenOptions={{
				headerTransparent: true,
				headerSearchBarOptions: {
					placement: "automatic",
					placeholder: "Search",
					onChangeText: () => {},
				},
			}}
		/>
	);
}
