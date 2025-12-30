import RNSegmentedControl from "@react-native-segmented-control/segmented-control";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({
  segments,
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  const colorScheme = useColorScheme();
  const tint = useThemeColor({}, "tint");
  const text = useThemeColor({}, "text");

  return (
    <RNSegmentedControl
      activeFontStyle={{ color: text, fontWeight: "600" }}
      appearance={colorScheme === "dark" ? "dark" : "light"}
      fontStyle={{ fontWeight: "500" }}
      onChange={(event) => onChange(event.nativeEvent.selectedSegmentIndex)}
      selectedIndex={selectedIndex}
      style={{ height: 42 }}
      tintColor={tint}
      values={segments}
    />
  );
}
