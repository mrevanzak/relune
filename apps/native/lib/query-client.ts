import { QueryClient } from "@tanstack/react-query";

/**
 * Singleton QueryClient instance used throughout the app.
 * This allows the upload queue worker to invalidate queries
 * even when it's not running inside a React component tree.
 */
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
			retry: 1,
		},
	},
});
