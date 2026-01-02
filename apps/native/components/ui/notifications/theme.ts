// ============ AlertKit Colors ============
// Exact match to upstream AlertKit library colors for iOS16/17 Apple Music styles
// https://github.com/sparrowcode/AlertKit

export const AlertKitColors = {
  light: {
    // rgb(88, 87, 88) - used for text and icons in AlertKit
    content: "#585758",
  },
  dark: {
    // rgb(127, 127, 129) - used for text and icons in AlertKit
    content: "#7F7F81",
  },
};

// ============ SPIndicator Colors ============
// Exact match to upstream SPIndicator library opacity values
// https://github.com/ivanvorobei/SPIndicator

export const SPIndicatorOpacity = {
  // Title label: UIColor.label.withAlphaComponent(0.6)
  title: 0.6,
  // Subtitle label: UIColor.label.withAlphaComponent(0.3)
  subtitle: 0.3,
};

// Label colors for SPIndicator (base colors before opacity)
export const SPIndicatorLabelColors = {
  light: {
    // UIColor.label in light mode is essentially black
    base: "#000000",
    title: "rgba(0, 0, 0, 0.6)",
    subtitle: "rgba(0, 0, 0, 0.3)",
  },
  dark: {
    // UIColor.label in dark mode (matches Colors.dark.text)
    base: "#ECEDEE",
    title: "rgba(236, 237, 238, 0.6)",
    subtitle: "rgba(236, 237, 238, 0.3)",
  },
};
