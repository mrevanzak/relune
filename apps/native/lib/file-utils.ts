/**
 * Utility functions for converting React Native file URIs to File objects
 * compatible with Eden/FormData uploads.
 */

import { File as ExpoFile } from "expo-file-system";

/**
 * Converts a React Native file URI to a File object compatible with Eden/FormData.
 *
 * Uses expo-file-system's File class which works natively with FormData uploads
 * and avoids the read-only `name` property issue with the standard File polyfill.
 *
 * @param uri - Local file URI (e.g., file:///path/to/recording.m4a)
 * @returns File object ready for upload
 */
export function uriToFile(uri: string): File {
	// expo-file-system's File works with FormData at runtime
	// Cast to standard File type for Eden Treaty compatibility
	return new ExpoFile(uri) as unknown as File;
}
