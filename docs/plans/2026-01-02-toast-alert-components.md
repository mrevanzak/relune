# Toast & Alert Components Implementation Plan

**Date**: 2026-01-02  
**Status**: Ready for Implementation  
**Inspired by**: [SPIndicator](https://github.com/ivanvorobei/SPIndicator), [AlertKit](https://github.com/sparrowcode/AlertKit), [sonner-native](https://github.com/gunnartorfis/sonner-native)

---

## Overview

Building two iOS-style notification components using React Native Reanimated:

| Component | Based On | Visual Style | Use Case |
|-----------|----------|--------------|----------|
| **Toast** | SPIndicator | Small floating pill (top/bottom) | Quick confirmations: "Done", "Error", "Copied" |
| **Alert** | AlertKit | Centered modal-style popup | Prominent feedback: "Added to Library", "Submitted" |

### Why Build This?

The native iOS libraries (SPIndicator, AlertKit) are no longer actively maintained. Existing React Native bridges like [burnt](https://github.com/nandorojo/burnt) and [ting](https://github.com/nicklockwood/ting) depend on these unmaintained upstream libraries. Building with Reanimated gives us full control and cross-platform support.

---

## Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Toast background** | `expo-blur` BlurView | Native iOS feel, matches SPIndicator |
| **Toast width** | Auto-size based on content | Matches SPIndicator behavior |
| **Toast multiline** | Supported (up to 3 lines) | Better for longer messages |
| **Alert overlay** | Dimmed backdrop (rgba(0,0,0,0.4)) | Focus attention on alert |
| **Icons (iOS)** | SF Symbols via `expo-symbols` | Native iOS feel |
| **Icons (Android)** | Reanimated-based fallbacks | Consistent cross-platform |
| **Toast dismiss** | Drag gesture (up for top, down for bottom) | Matches SPIndicator |
| **Alert dismiss** | Tap anywhere | Simple, intuitive |
| **Queue behavior** | Toast: replace, Alert: queue | Appropriate for each use case |

---

## Architecture

### Pattern (Inspired by sonner-native)

```
┌─────────────────────────────────────────────────────────────┐
│  NotificationProvider (wraps app root)                      │
│  ├── State: toasts[], alerts[]                              │
│  ├── Methods: addToast, dismissToast, addAlert, dismissAlert│
│  └── Renders: ToastPositioner + AlertContainer              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Singleton Refs (for imperative API)                        │
│  ├── toast() → calls addToast via singleton ref             │
│  └── alert() → calls addAlert via singleton ref             │
└─────────────────────────────────────────────────────────────┘
```

Key patterns from sonner-native:
- **Imperative API via singleton**: `toast()` function calls into a singleton ref set by `Toaster` component
- **State lives in Provider**: `useState<ToastConfig[]>` manages queue in the provider
- **FullWindowOverlay on iOS**: Uses `react-native-screens` to render above everything
- **Worklet animations**: Custom entering/exiting animations via reanimated

---

## File Structure

```
apps/native/components/ui/notifications/
├── index.ts                    # Public API exports
├── types.ts                    # All TypeScript interfaces
├── context.tsx                 # NotificationContext + singleton refs
├── Provider.tsx                # NotificationProvider component
├── haptics.ts                  # Haptic feedback helper
├── icons/
│   ├── index.tsx               # Icon components (Android)
│   └── index.ios.tsx           # SF Symbol icons (iOS)
├── toast/
│   ├── index.ts                # toast() imperative API
│   ├── Toast.tsx               # Toast UI component
│   ├── ToastContainer.tsx      # Positioning, animations, gestures
│   └── animations.ts           # Entering/exiting worklets
└── alert/
    ├── index.ts                # alert() imperative API
    ├── Alert.tsx               # Alert UI component
    ├── AlertContainer.tsx      # Backdrop, positioning, tap-to-dismiss
    └── animations.ts           # Scale/fade worklets
```

---

## Types Definition

```typescript
// ============ SHARED ============
export type HapticType = 'success' | 'error' | 'warning' | 'none';
export type PresetType = 'done' | 'error' | 'spinner' | 'custom';

// ============ TOAST ============
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  id: string;
  title: string;
  message?: string;
  preset?: PresetType;
  icon?: ReactNode;                    // Custom icon (overrides preset)
  position?: ToastPosition;            // Default: 'top'
  duration?: number;                   // Default: 2000ms, Infinity = no auto-dismiss
  haptic?: HapticType;                 // Default: based on preset
  dismissible?: boolean;               // Default: true (swipe to dismiss)
  onDismiss?: () => void;
  // Styling
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

export type ToastInput = Omit<ToastConfig, 'id'> & { id?: string };

// ============ ALERT ============
export type AlertPreset = 'done' | 'error' | 'heart' | 'spinner' | 'custom';

export interface AlertConfig {
  id: string;
  title: string;
  message?: string;
  preset?: AlertPreset;
  icon?: ReactNode;
  duration?: number;                   // Default: 2500ms
  haptic?: HapticType;
  onDismiss?: () => void;
  // Styling
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

export type AlertInput = Omit<AlertConfig, 'id'> & { id?: string };

// ============ PROVIDER ============
export interface NotificationState {
  toasts: ToastConfig[];
  alerts: AlertConfig[];
}

export interface NotificationContextValue {
  // Toast
  addToast: (config: ToastInput) => string;
  dismissToast: (id?: string) => void;
  // Alert
  addAlert: (config: AlertInput) => string;
  dismissAlert: (id?: string) => void;
}
```

---

## API Design

### Toast API

```typescript
import { toast } from '@/components/ui/notifications';

// Basic usage
toast({ title: "Done", preset: "done" });
toast({ title: "Error", message: "Try again", preset: "error" });

// Convenience methods
toast.done("Saved!");
toast.error("Failed to save");
toast.loading("Processing...");

// Full options
toast({
  title: "Custom Toast",
  message: "With subtitle that can wrap to multiple lines if needed",
  preset: "custom",
  icon: <MyIcon />,
  position: "bottom",
  duration: 3000,
  haptic: "success",
  onDismiss: () => console.log("dismissed"),
});

// Dismiss
toast.dismiss();        // Dismiss current toast
toast.dismiss("id");    // Dismiss specific toast
```

### Alert API

```typescript
import { alert } from '@/components/ui/notifications';

// Basic usage  
alert({ title: "Added to Library", preset: "done" });

// Convenience methods
alert.done("Saved!");
alert.error("Something went wrong");
alert.heart("Added to Favorites");

// Full options
alert({
  title: "Thank You!",
  message: "Your feedback was submitted",
  preset: "done",
  duration: 2500,
  haptic: "success",
  onDismiss: () => console.log("alert dismissed"),
});

// Dismiss
alert.dismiss();
```

---

## Visual Specifications

### Toast (SPIndicator-style)

```
Single line:
┌──────────────────────────────────────────┐
│  [✓]  Title text here                    │  <- Height: ~44px
└──────────────────────────────────────────┘     Pill shape (borderRadius: 1000)

Multiline:
┌────────────────────────────────────────────────────┐
│  [✓]  Title text here                              │
│       This is a longer message that can wrap       │  <- borderRadius: 16px
│       to multiple lines when needed                │
└────────────────────────────────────────────────────┘
```

**Properties:**
- Width: auto (content-based), max-width: screenWidth - 32px
- Background: BlurView (intensity: 80, tint: light/dark based on theme)
- Border radius: 1000 (pill) for single-line, 16px for multiline
- Padding: 12px vertical, 16px horizontal
- Icon size: 20-24px
- Title: 14-16px semibold, numberOfLines={1}
- Message: 13-14px regular, muted color, numberOfLines={3}
- Gap between icon and text: 10px
- Shadow: Shadows.small from theme
- Icon alignment: flex-start (top-aligned when multiline)

### Alert (AlertKit iOS17-style)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                   ░░░░░░░░░░░░░░░░░                         │
│                   ░░░ DIMMED ░░░░░                          │
│                   ░░░ OVERLAY ░░░                           │
│                   ░░░░░░░░░░░░░░░░░                         │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │                         │                    │
│              │       [   ✓   ]         │  <- Icon: 48-56px  │
│              │                         │                    │
│              │    Added to Library     │  <- 17px semibold  │
│              │                         │                    │
│              │   Your feedback was     │  <- 15px regular   │
│              │      submitted          │                    │
│              │                         │                    │
│              └─────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Backdrop:**
- Color: rgba(0, 0, 0, 0.4)
- Tap on backdrop dismisses alert
- Fade in/out animation

**Alert card:**
- Width: 270px (fixed, matches iOS system alerts)
- Border radius: 24px
- Background: surface color (solid)
- Shadow: Shadows.soft from theme
- Padding: 28px
- Center-aligned content
- Gap between icon and title: 16px
- Gap between title and message: 6px

---

## Animation Specifications

### Toast Animations

```typescript
// Entering (top position)
{
  initialValues: {
    opacity: 0,
    transform: [{ scale: 0.9 }, { translateY: -50 }],
  },
  animations: {
    opacity: withTiming(1, { duration: 200, easing: easeOutCirc }),
    transform: [
      { scale: withSpring(1, { damping: 15, stiffness: 150 }) },
      { translateY: withSpring(0, { damping: 15, stiffness: 150 }) },
    ],
  },
}

// Exiting (top position)
{
  initialValues: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  animations: {
    opacity: withTiming(0, { duration: 150, easing: easeInOutCubic }),
    transform: [{ translateY: withTiming(-100, { duration: 200 }) }],
  },
}
```

### Toast Drag-to-Dismiss

```typescript
// Gesture behavior:
// - Top position: drag up to dismiss
// - Bottom position: drag down to dismiss
// - Wrong direction: elastic resistance (Apple-style)
// - Threshold: 40px to trigger dismiss
// - On dismiss: animate out in drag direction
// - On cancel: spring back to origin
```

### Alert Animations

```typescript
// Entering
{
  initialValues: {
    opacity: 0,
    transform: [{ scale: 0.8 }],
  },
  animations: {
    opacity: withTiming(1, { duration: 200 }),
    transform: [{ scale: withSpring(1, { damping: 12, stiffness: 180 }) }],
  },
}

// Exiting
{
  initialValues: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  animations: {
    opacity: withTiming(0, { duration: 150 }),
    transform: [{ scale: withTiming(0.85, { duration: 150 }) }],
  },
}

// Backdrop
// - FadeIn.duration(200) on enter
// - FadeOut.duration(150) on exit
```

---

## Icons

### iOS (SF Symbols via expo-symbols)

| Preset | SF Symbol Name |
|--------|----------------|
| done | `checkmark.circle.fill` |
| error | `xmark.circle.fill` |
| heart | `heart.fill` |
| spinner | ActivityIndicator |

### Android (Fallback)

| Preset | Implementation |
|--------|----------------|
| done | Green checkmark (View-based or MaterialIcons) |
| error | Red X mark |
| heart | Red heart |
| spinner | Animated rotating indicator (Reanimated) |

---

## Queue Behavior

### Toast Queue
- **Max visible**: 1 (only show latest, per SPIndicator behavior)
- **New toast behavior**: Replaces current toast with exit animation, then shows new one
- **Same ID behavior**: Update existing toast content (no re-animation)

### Alert Queue
- **Max visible**: 1
- **New alert behavior**: Queue - wait for current to dismiss, then show next
- **Dismiss triggers**: Tap anywhere, auto-dismiss timer

---

## Integration

### Provider Setup

```typescript
// apps/native/app/_layout.tsx
import { NotificationProvider } from '@/components/ui/notifications';

export default function RootLayout() {
  return (
    <NotificationProvider>
      <QueryProvider>
        <Stack>
          {/* ... screens ... */}
        </Stack>
      </QueryProvider>
    </NotificationProvider>
  );
}
```

### FullWindowOverlay (iOS)

```typescript
// Provider.tsx
import { FullWindowOverlay } from 'react-native-screens';

// Wrap notifications in FullWindowOverlay on iOS
// This ensures toasts/alerts render above modals, sheets, etc.
{Platform.OS === 'ios' ? (
  <FullWindowOverlay>
    <ToastPositioner />
    <AlertContainer />
  </FullWindowOverlay>
) : (
  <>
    <ToastPositioner />
    <AlertContainer />
  </>
)}
```

---

## Implementation Tasks

### Phase 1: Foundation
1. Create `types.ts` with all TypeScript interfaces
2. Create `haptics.ts` helper for consistent haptic feedback
3. Create `icons/index.ios.tsx` with SF Symbol icons
4. Create `icons/index.tsx` with Android fallback icons
5. Create `context.tsx` with NotificationContext and singleton pattern

### Phase 2: Toast
6. Create `toast/animations.ts` with entering/exiting/drag worklets
7. Create `toast/Toast.tsx` UI component with BlurView background
8. Create `toast/ToastContainer.tsx` with gestures and positioning
9. Create `toast/index.ts` with imperative toast() API

### Phase 3: Alert
10. Create `alert/animations.ts` with scale/fade worklets
11. Create `alert/Alert.tsx` UI component
12. Create `alert/AlertContainer.tsx` with backdrop and tap-to-dismiss
13. Create `alert/index.ts` with imperative alert() API

### Phase 4: Integration
14. Create `Provider.tsx` with state management and rendering
15. Create `notifications/index.ts` re-exporting all public APIs
16. Integrate Provider in `apps/native/app/_layout.tsx`

### Phase 5: Polish
17. Add dark mode support throughout
18. Add reduced motion support
19. Test on iOS simulator
20. Test on Android emulator

---

## Dependencies

All dependencies are already available in the project:

- `react-native-reanimated` - Animations
- `react-native-gesture-handler` - Swipe gestures
- `react-native-safe-area-context` - Safe area insets
- `expo-symbols` - SF Symbols on iOS
- `expo-haptics` - Haptic feedback
- `expo-blur` - BlurView for toast background
- `react-native-screens` - FullWindowOverlay for iOS

No new dependencies required.

---

## References

- [SPIndicator](https://github.com/ivanvorobei/SPIndicator) - Original iOS indicator library
- [AlertKit](https://github.com/sparrowcode/AlertKit) - iOS Apple Music-style alerts
- [sonner-native](https://github.com/gunnartorfis/sonner-native) - React Native toast library (architecture reference)
- [burnt](https://github.com/nandorojo/burnt) - React Native bridge for SPIndicator
- [ting](https://github.com/NitrogenZLab/ting) - Another React Native toast library
