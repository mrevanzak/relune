import type { AlertConfig } from "../types";
import { AlertiOS16 } from "./AlertiOS16";
import { AlertiOS17 } from "./AlertiOS17";

interface AlertProps {
  config: AlertConfig;
}

/**
 * Alert component - switches between iOS16 and iOS17 styles
 *
 * Styles:
 * - iOS16AppleMusic (default): Centered modal with large icon, backdrop
 * - iOS17AppleMusic: Bottom-positioned horizontal layout, no backdrop
 */
export function Alert({ config }: AlertProps) {
  const alertStyle = config.alertStyle ?? "iOS16AppleMusic";

  if (alertStyle === "iOS17AppleMusic") {
    return <AlertiOS17 config={config} />;
  }

  return <AlertiOS16 config={config} />;
}
