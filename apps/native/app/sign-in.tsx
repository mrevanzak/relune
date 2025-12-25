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
		return <Redirect href="/" />;
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
