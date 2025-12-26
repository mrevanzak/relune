import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { AppState, Platform } from "react-native";
import { initMmkv } from "@/lib/mmkv";
import { getSupabaseClient } from "@/lib/supabase";
import { authStore } from "@/stores/auth";
import { uploadQueueStore } from "@/stores/upload-queue";

interface SessionContextValue {
	session: Session | null;
	isInitialized: boolean;
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
	const [isInitialized, setIsInitialized] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const session = authStore.use.session();

	const bootstrap = useCallback(async () => {
		try {
			setError(null);
			// 1. Initialize MMKV storage (on native platforms)
			if (Platform.OS !== "web") {
				await initMmkv();
				// 2. Rehydrate zustand stores after MMKV is ready
				await authStore.persist.rehydrate();
				await uploadQueueStore.persist.rehydrate();
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
			authStore.getState().setSession(initialSession);
			setIsInitialized(true);
		} catch (err) {
			console.error("Bootstrap failed:", err);
			setError(err instanceof Error ? err : new Error("Bootstrap failed"));
			setIsInitialized(false);
		}
	}, []);

	useEffect(() => {
		void bootstrap();
	}, [bootstrap]);

	useEffect(() => {
		if (!isInitialized) return;

		const supabase = getSupabaseClient();
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, newSession) => {
			authStore.getState().setSession(newSession);
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [isInitialized]);

	const signOut = async () => {
		const supabase = getSupabaseClient();
		await supabase.auth.signOut();
		authStore.getState().signOut();
	};

	return (
		<SessionContext.Provider
			value={{
				session,
				isInitialized,
				error,
				retry: bootstrap,
				signOut,
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}
