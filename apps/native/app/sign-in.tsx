import { Redirect } from "expo-router";
import { PressableScale } from "pressto";
import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { SoftButton } from "@/components/ui/SoftButton";
import { SoftInput } from "@/components/ui/SoftInput";
import { Fonts } from "@/constants/theme";
import { useSession } from "@/context/session";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
	useResetPasswordMutation,
	useSignInMutation,
	useSignUpMutation,
} from "@/queries/auth";

type AuthMode = "signIn" | "signUp" | "forgotPassword";

export default function SignInScreen() {
	const { session, isInitialized } = useSession();

	// Theme colors
	const tint = useThemeColor({}, "tint");
	const text = useThemeColor({}, "text");
	const textSecondary = useThemeColor({}, "textSecondary");
	const error = useThemeColor({}, "error");
	const errorLight = useThemeColor({}, "errorLight");
	const successLight = useThemeColor({}, "successLight");

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
		return <Redirect href="/home" />;
	}

	// Show loading while session is being determined
	if (!isInitialized) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={tint} />
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

	const getButtonTitle = () => {
		if (isPending) return "Loading...";
		if (authMode === "signIn") return "Sign In";
		if (authMode === "signUp") return "Create Account";
		return "Reset Password";
	};

	const handleSubmit = () => {
		if (authMode === "signIn") handleSignIn();
		else if (authMode === "signUp") handleSignUp();
		else handleResetPassword();
	};

	return (
		<GradientBackground>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={styles.container}
			>
				<View style={styles.content}>
					{/* Brand header */}
					<View style={styles.header}>
						<Text style={[styles.title, { color: tint }]}>Relune</Text>
						<Text style={[styles.subtitle, { color: textSecondary }]}>
							Private voice recordings
						</Text>
					</View>

					{/* Error message */}
					{(validationError || activeMutation.isError) && (
						<View
							style={[styles.errorContainer, { backgroundColor: errorLight }]}
						>
							<Text style={[styles.error, { color: error }]}>
								{validationError ||
									(activeMutation.error instanceof Error
										? activeMutation.error.message
										: "An error occurred")}
							</Text>
						</View>
					)}

					{/* Form */}
					{authMode === "forgotPassword" && resetEmailSent ? (
						<View style={styles.form}>
							<View
								style={[
									styles.successContainer,
									{ backgroundColor: successLight },
								]}
							>
								<Text style={[styles.successText, { color: text }]}>
									Check your email for a password reset link.
								</Text>
							</View>
							<SoftButton
								title="Back to Sign In"
								variant="ghost"
								onPress={() => switchMode("signIn")}
							/>
						</View>
					) : (
						<View style={styles.form}>
							<SoftInput
								placeholder="Email"
								value={email}
								onChangeText={setEmail}
								autoCapitalize="none"
								autoComplete="email"
								keyboardType="email-address"
								editable={!isPending}
							/>

							{authMode !== "forgotPassword" && (
								<SoftInput
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
								<SoftInput
									placeholder="Confirm Password"
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									secureTextEntry
									autoComplete="new-password"
									editable={!isPending}
								/>
							)}

							<SoftButton
								title={getButtonTitle()}
								onPress={handleSubmit}
								disabled={isPending}
								loading={isPending}
								style={styles.submitButton}
							/>

							{/* Links */}
							<View style={styles.links}>
								{authMode === "signIn" && (
									<>
										<PressableScale onPress={() => switchMode("signUp")}>
											<Text style={[styles.link, { color: tint }]}>
												Create an account
											</Text>
										</PressableScale>
										<PressableScale
											onPress={() => switchMode("forgotPassword")}
										>
											<Text style={[styles.link, { color: tint }]}>
												Forgot password?
											</Text>
										</PressableScale>
									</>
								)}
								{authMode === "signUp" && (
									<PressableScale onPress={() => switchMode("signIn")}>
										<Text style={[styles.link, { color: tint }]}>
											Already have an account?
										</Text>
									</PressableScale>
								)}
								{authMode === "forgotPassword" && (
									<PressableScale onPress={() => switchMode("signIn")}>
										<Text style={[styles.link, { color: tint }]}>
											Back to Sign In
										</Text>
									</PressableScale>
								)}
							</View>
						</View>
					)}
				</View>
			</KeyboardAvoidingView>
		</GradientBackground>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		justifyContent: "center",
		alignItems: "center",
	},
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	header: {
		alignItems: "center",
		marginBottom: 40,
	},
	title: {
		fontSize: 42,
		fontWeight: "300",
		fontFamily: Fonts?.serif || "serif",
		letterSpacing: 2,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		fontFamily: Fonts?.rounded || "System",
	},
	form: {
		width: "100%",
		maxWidth: 320,
		gap: 12,
	},
	submitButton: {
		marginTop: 8,
	},
	links: {
		marginTop: 16,
		alignItems: "center",
		gap: 16,
	},
	link: {
		fontSize: 14,
		fontWeight: "500",
	},
	errorContainer: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginBottom: 16,
		width: "100%",
		maxWidth: 320,
	},
	error: {
		textAlign: "center",
		fontSize: 14,
	},
	successContainer: {
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderRadius: 12,
		marginBottom: 8,
	},
	successText: {
		fontSize: 15,
		textAlign: "center",
		lineHeight: 22,
	},
});
