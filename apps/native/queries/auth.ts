import { useMutation } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

/**
 * Mutation hook for signing in with Google OAuth.
 * The session will be updated automatically via Supabase's onAuthStateChange subscription.
 */
export function useSignInWithGoogleMutation() {
	return useMutation({
		mutationFn: async () => {
			const supabase = getSupabaseClient();
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: "relune://auth/callback",
				},
			});
			if (error) {
				throw error;
			}
		},
	});
}

/**
 * Mutation hook for signing out.
 * Clears the session in Zustand immediately for snappier UI,
 * then calls Supabase signOut. The session will be updated automatically
 * via Supabase's onAuthStateChange subscription.
 */
export function useSignOutMutation() {
	const signOutStore = useAuthStore.use.signOut();

	return useMutation({
		mutationFn: async () => {
			// Clear Zustand store immediately for snappier UI
			signOutStore();

			const supabase = getSupabaseClient();
			await supabase.auth.signOut();
		},
	});
}
