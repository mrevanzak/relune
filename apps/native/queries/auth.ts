import { useMutation } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

interface AuthCredentials {
	email: string;
	password: string;
}

/**
 * Mutation hook for signing in with email and password.
 * The session will be updated automatically via Supabase's onAuthStateChange subscription.
 */
export function useSignInMutation() {
	return useMutation({
		mutationFn: async ({ email, password }: AuthCredentials) => {
			const supabase = getSupabaseClient();
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (error) {
				throw error;
			}
		},
	});
}

/**
 * Mutation hook for signing up with email and password.
 * The session will be updated automatically via Supabase's onAuthStateChange subscription.
 */
export function useSignUpMutation() {
	return useMutation({
		mutationFn: async ({ email, password }: AuthCredentials) => {
			const supabase = getSupabaseClient();
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
			});
			if (error) {
				throw error;
			}
			// If no session is returned, email confirmation may be required
			if (!data.session) {
				throw new Error(
					"Account created but email confirmation is required. Check your email.",
				);
			}
		},
	});
}

/**
 * Mutation hook for requesting a password reset email.
 */
export function useResetPasswordMutation() {
	return useMutation({
		mutationFn: async (email: string) => {
			const supabase = getSupabaseClient();
			const { error } = await supabase.auth.resetPasswordForEmail(email);
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
