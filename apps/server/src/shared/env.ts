/**
 * Environment variable helpers for server
 */

export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function getEnv(name: string, defaultValue = ""): string {
	return process.env[name] || defaultValue;
}

export function getEnvList(name: string): string[] {
	return getEnv(name)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}
