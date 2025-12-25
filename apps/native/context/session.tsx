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
