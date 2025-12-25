# Bootstrap/Init Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor app initialization to follow Expo Router best practices with proper SplashScreen management, route-based authentication, and clean separation of concerns.

**Architecture:** 
- `SessionProvider` context wraps app in root layout, handles MMKV init + Zustand rehydration + Supabase setup
- Route-based auth: `(app)` group redirects to `/sign-in` when unauthenticated
- Native SplashScreen stays visible until bootstrap completes

**Tech Stack:** Expo Router, expo-splash-screen, MMKV, Zustand, Supabase

---

## Task 1: Create SessionProvider Context

**Files:**
- Create: `apps/native/context/session.tsx`

**Step 1: Create the session context file**

```tsx
import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { initMmkv } from "@/lib/mmkv";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useUploadQueueStore } from "@/stores/upload-queue";

interface SessionContextValue {
	session: Session | null;
	isLoading: boolean;
	error: Error | null;
	retry: () => void;
	signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
	const context = useContext(SessionContext);
	if (!context) {
		throw new Error("useSession must be used within a SessionProvider");
	}
	return context;
}

interface SessionProviderProps {
	children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const session = useAuthStore.use.session();

	const bootstrap = async () => {
		try {
			setError(null);
			setIsLoading(true);

			// 1. Initialize MMKV storage (on native platforms)
			if (Platform.OS !== "web") {
				await initMmkv();

				// 2. Rehydrate zustand stores after MMKV is ready
				await useAuthStore.persist.rehydrate();
				await useUploadQueueStore.persist.rehydrate();
			}

			// 3. Get Supabase client (will use MMKV storage on native, localStorage on web)
			const supabase = getSupabaseClient();

			// 4. Register AppState listener for token refresh (only on native, only once)
			if (Platform.OS !== "web") {
				AppState.addEventListener("change", (state) => {
					if (state === "active") {
						supabase.auth.startAutoRefresh();
					} else {
						supabase.auth.stopAutoRefresh();
					}
				});
			}

			// 5. Get initial session
			const {
				data: { session: initialSession },
			} = await supabase.auth.getSession();

			useAuthStore.getState().setSession(initialSession);

			// 6. Subscribe to auth state changes
			supabase.auth.onAuthStateChange((_event, newSession) => {
				useAuthStore.getState().setSession(newSession);
			});

			setIsLoading(false);
		} catch (err) {
			console.error("Bootstrap failed:", err);
			setError(err instanceof Error ? err : new Error("Bootstrap failed"));
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void bootstrap();
	}, []);

	const signOut = async () => {
		const supabase = getSupabaseClient();
		await supabase.auth.signOut();
		useAuthStore.getState().signOut();
	};

	return (
		<SessionContext.Provider
			value={{
				session,
				isLoading,
				error,
				retry: bootstrap,
				signOut,
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}
```

**Step 2: Verify file created**

Run: `ls apps/native/context/`
Expected: `session.tsx`

**Step 3: Type check**

Run: `cd apps/native && bunx tsc --noEmit`
Expected: No errors related to session.tsx

**Step 4: Commit**

```bash
git add apps/native/context/session.tsx
git commit -m "feat(native): add SessionProvider context for bootstrap"
```

---

## Task 2: Create Sign-In Screen Route

**Files:**
- Create: `apps/native/app/sign-in.tsx`

**Step 1: Create sign-in route with auth forms**

Extract the auth UI from AuthGate into a standalone route:

```tsx
import { Redirect } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSession } from "@/context/session";
import {
	useResetPasswordMutation,
	useSignInMutation,
	useSignUpMutation,
} from "@/queries/auth";

type AuthMode = "signIn" | "signUp" | "forgotPassword";

export default function SignInScreen() {
	const { session, isLoading } = useSession();

	const [authMode, setAuthMode] = useState<AuthMode>("signIn");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [resetEmailSent, setResetEmailSent] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const signInMutation = useSignInMutation();
	const signUpMutation = useSignUpMutation();
	const resetPasswordMutation = useResetPasswordMutation();

	// If already authenticated, redirect to app
	if (session) {
		return <Redirect href="/(app)/(tabs)" />;
	}

	// Show loading while session is being determined
	if (isLoading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	const clearForm = () => {
		setEmail("");
		setPassword("");
		setConfirmPassword("");
		setValidationError(null);
		setResetEmailSent(false);
	};

	const switchMode = (mode: AuthMode) => {
		clearForm();
		signInMutation.reset();
		signUpMutation.reset();
		resetPasswordMutation.reset();
		setAuthMode(mode);
	};

	const handleSignIn = () => {
		setValidationError(null);
		if (!email.trim() || !password) {
			setValidationError("Email and password are required");
			return;
		}
		signInMutation.mutate({ email: email.trim(), password });
	};

	const handleSignUp = () => {
		setValidationError(null);
		if (!email.trim() || !password) {
			setValidationError("Email and password are required");
			return;
		}
		if (password !== confirmPassword) {
			setValidationError("Passwords do not match");
			return;
		}
		if (password.length < 6) {
			setValidationError("Password must be at least 6 characters");
			return;
		}
		signUpMutation.mutate({ email: email.trim(), password });
	};

	const handleResetPassword = () => {
		setValidationError(null);
		if (!email.trim()) {
			setValidationError("Email is required");
			return;
		}
		resetPasswordMutation.mutate(email.trim(), {
			onSuccess: () => setResetEmailSent(true),
		});
	};

	const activeMutation =
		authMode === "signIn"
			? signInMutation
			: authMode === "signUp"
				? signUpMutation
				: resetPasswordMutation;

	const isPending = activeMutation.isPending;

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Relune</Text>
			<Text style={styles.subtitle}>Private voice recordings</Text>

			{(validationError || activeMutation.isError) && (
				<Text style={styles.error}>
					{validationError ||
						(activeMutation.error instanceof Error
							? activeMutation.error.message
							: "An error occurred")}
				</Text>
			)}

			{authMode === "forgotPassword" && resetEmailSent ? (
				<View style={styles.form}>
					<Text style={styles.successText}>
						Check your email for a password reset link.
					</Text>
					<Pressable onPress={() => switchMode("signIn")}>
						<Text style={styles.link}>Back to Sign In</Text>
					</Pressable>
				</View>
			) : (
				<View style={styles.form}>
					<TextInput
						style={styles.input}
						placeholder="Email"
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						autoComplete="email"
						keyboardType="email-address"
						editable={!isPending}
					/>

					{authMode !== "forgotPassword" && (
						<TextInput
							style={styles.input}
							placeholder="Password"
							value={password}
							onChangeText={setPassword}
							secureTextEntry
							autoComplete={
								authMode === "signUp" ? "new-password" : "current-password"
							}
							editable={!isPending}
						/>
					)}

					{authMode === "signUp" && (
						<TextInput
							style={styles.input}
							placeholder="Confirm Password"
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							secureTextEntry
							autoComplete="new-password"
							editable={!isPending}
						/>
					)}

					<Pressable
						style={[styles.button, isPending && styles.buttonDisabled]}
						onPress={
							authMode === "signIn"
								? handleSignIn
								: authMode === "signUp"
									? handleSignUp
									: handleResetPassword
						}
						disabled={isPending}
					>
						<Text style={styles.buttonText}>
							{isPending
								? "Loading..."
								: authMode === "signIn"
									? "Sign In"
									: authMode === "signUp"
										? "Create Account"
										: "Reset Password"}
						</Text>
					</Pressable>

					<View style={styles.links}>
						{authMode === "signIn" && (
							<>
								<Pressable onPress={() => switchMode("signUp")}>
									<Text style={styles.link}>Create an account</Text>
								</Pressable>
								<Pressable onPress={() => switchMode("forgotPassword")}>
									<Text style={styles.link}>Forgot password?</Text>
								</Pressable>
							</>
						)}
						{authMode === "signUp" && (
							<Pressable onPress={() => switchMode("signIn")}>
								<Text style={styles.link}>Already have an account?</Text>
							</Pressable>
						)}
						{authMode === "forgotPassword" && (
							<Pressable onPress={() => switchMode("signIn")}>
								<Text style={styles.link}>Back to Sign In</Text>
							</Pressable>
						)}
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginBottom: 32,
	},
	form: {
		width: "100%",
		maxWidth: 300,
	},
	input: {
		borderWidth: 1,
		borderColor: "#ccc",
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		fontSize: 16,
	},
	button: {
		backgroundColor: "#007AFF",
		borderRadius: 8,
		padding: 14,
		alignItems: "center",
		marginTop: 4,
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	links: {
		marginTop: 16,
		alignItems: "center",
		gap: 12,
	},
	link: {
		color: "#007AFF",
		fontSize: 14,
	},
	error: {
		color: "#ff0000",
		marginBottom: 16,
		textAlign: "center",
	},
	successText: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 16,
		color: "#333",
	},
});
```

**Step 2: Type check**

Run: `cd apps/native && bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/native/app/sign-in.tsx
git commit -m "feat(native): add sign-in route for auth UI"
```

---

## Task 3: Create Bootstrap Error Screen Component

**Files:**
- Create: `apps/native/components/BootstrapErrorScreen.tsx`

**Step 1: Create error screen with retry**

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

interface BootstrapErrorScreenProps {
	error: Error;
	onRetry: () => void;
}

export function BootstrapErrorScreen({
	error,
	onRetry,
}: BootstrapErrorScreenProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Something went wrong</Text>
			<Text style={styles.message}>{error.message}</Text>
			<Pressable style={styles.button} onPress={onRetry}>
				<Text style={styles.buttonText}>Try Again</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#fff",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 12,
		color: "#333",
	},
	message: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		marginBottom: 24,
		paddingHorizontal: 20,
	},
	button: {
		backgroundColor: "#007AFF",
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 32,
	},
	buttonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
});
```

**Step 2: Commit**

```bash
git add apps/native/components/BootstrapErrorScreen.tsx
git commit -m "feat(native): add BootstrapErrorScreen component"
```

---

## Task 4: Create Protected App Layout

**Files:**
- Create: `apps/native/app/(app)/_layout.tsx`
- Move: `apps/native/app/(tabs)` → `apps/native/app/(app)/(tabs)`
- Move: `apps/native/app/modal.tsx` → `apps/native/app/(app)/modal.tsx`

**Step 1: Create directory structure**

```bash
mkdir -p apps/native/app/\(app\)
```

**Step 2: Move existing routes into (app) group**

```bash
mv apps/native/app/\(tabs\) apps/native/app/\(app\)/
mv apps/native/app/modal.tsx apps/native/app/\(app\)/
```

**Step 3: Create protected layout**

```tsx
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
```

**Step 4: Verify structure**

Run: `ls -la apps/native/app/\(app\)/`
Expected: `_layout.tsx`, `(tabs)/`, `modal.tsx`

**Step 5: Commit**

```bash
git add apps/native/app/\(app\)/
git commit -m "feat(native): add protected (app) group with auth redirect"
```

---

## Task 5: Update Root Layout

**Files:**
- Modify: `apps/native/app/_layout.tsx`

**Step 1: Rewrite root layout with SessionProvider and SplashScreen**

```tsx
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from "@react-navigation/native";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { AppState, View } from "react-native";
import "react-native-reanimated";

import { BootstrapErrorScreen } from "@/components/BootstrapErrorScreen";
import { QueryProvider } from "@/components/QueryProvider";
import { SessionProvider, useSession } from "@/context/session";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUploadQueueStore } from "@/stores/upload-queue";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
	initialRouteName: "(app)",
};

function RootLayoutNav() {
	const colorScheme = useColorScheme();
	const { isLoading, error, retry, session } = useSession();
	const processQueue = useUploadQueueStore.use.processQueue();

	// Hide splash screen when bootstrap completes
	const onLayoutRootView = useCallback(async () => {
		if (!isLoading) {
			await SplashScreen.hideAsync();
		}
	}, [isLoading]);

	// Process queued uploads when app comes to foreground
	useEffect(() => {
		if (!session) return;

		const subscription = AppState.addEventListener("change", (nextAppState) => {
			if (nextAppState === "active") {
				void processQueue();
			}
		});

		// Also process on initial mount
		void processQueue();

		return () => {
			subscription.remove();
		};
	}, [processQueue, session]);

	// Show error screen if bootstrap failed
	if (error) {
		return <BootstrapErrorScreen error={error} onRetry={retry} />;
	}

	// Return null while loading (splash screen stays visible)
	if (isLoading) {
		return null;
	}

	return (
		<View style={{ flex: 1 }} onLayout={onLayoutRootView}>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<Slot />
				<StatusBar style="auto" />
			</ThemeProvider>
		</View>
	);
}

export default function RootLayout() {
	return (
		<QueryProvider>
			<SessionProvider>
				<RootLayoutNav />
			</SessionProvider>
		</QueryProvider>
	);
}
```

**Step 2: Type check**

Run: `cd apps/native && bunx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/native/app/_layout.tsx
git commit -m "refactor(native): update root layout with SessionProvider and SplashScreen"
```

---

## Task 6: Remove AppState Listener from supabase.ts

**Files:**
- Modify: `apps/native/lib/supabase.ts`

**Step 1: Remove module-level AppState listener**

The listener is now registered inside SessionProvider. Remove lines 44-54 from supabase.ts:

```tsx
import "react-native-url-polyfill/auto";
import { env } from "@relune/env";
import {
	createClient,
	processLock,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { supabaseStorage } from "./supabase-storage";

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let supabaseInstance: SupabaseClient | null = null;

/**
 * Creates and returns the Supabase client instance.
 * Must be called after MMKV storage is initialized (on native platforms).
 * On web, can be called immediately.
 */
export function getSupabaseClient(): SupabaseClient {
	if (supabaseInstance) {
		return supabaseInstance;
	}

	supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			storage: supabaseStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
			lock: processLock,
		},
	});

	return supabaseInstance;
}
```

**Step 2: Commit**

```bash
git add apps/native/lib/supabase.ts
git commit -m "refactor(native): remove module-level AppState listener from supabase"
```

---

## Task 7: Delete Old AuthGate Component

**Files:**
- Delete: `apps/native/components/AuthGate.tsx`

**Step 1: Remove the file**

```bash
rm apps/native/components/AuthGate.tsx
```

**Step 2: Commit**

```bash
git add apps/native/components/AuthGate.tsx
git commit -m "refactor(native): remove deprecated AuthGate component"
```

---

## Task 8: Verify and Test

**Step 1: Run type check**

Run: `cd apps/native && bunx tsc --noEmit`
Expected: No errors

**Step 2: Run lint**

Run: `bun check`
Expected: No errors

**Step 3: Test the app**

Run: `cd apps/native && bun start`
Expected: 
- Splash screen stays visible during init
- If MMKV fails, error screen with retry button appears
- If init succeeds, redirects to sign-in (when logged out) or tabs (when logged in)
- Auth flow works correctly

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(native): cleanup and verify bootstrap refactor"
```

---

## Summary of Changes

| Before | After |
|--------|-------|
| `AuthGate` component handles init + auth UI | `SessionProvider` handles init, `sign-in.tsx` route handles auth UI |
| MMKV init in useEffect (race condition) | MMKV init in SessionProvider before Supabase |
| AppState listener at module import | AppState listener registered after MMKV ready |
| No splash screen management | `SplashScreen.preventAutoHideAsync()` + `hideAsync()` |
| No error recovery for init failure | `BootstrapErrorScreen` with retry button |
| Render-gating auth pattern | Route-based auth with `<Redirect>` (Expo best practice) |
