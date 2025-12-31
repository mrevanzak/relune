import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { SoftButton } from "@/components/ui/SoftButton";
import {
  pickWhatsAppExportFile,
  useImportWhatsAppMutation,
  usePreviewWhatsAppMutation,
} from "@/features/import";
import { useThemeColor } from "@/hooks/use-theme-color";

type ImportState =
  | "initial"
  | "picking"
  | "previewing"
  | "importing"
  | "success"
  | "error";

export default function ImportScreen() {
  const params = useLocalSearchParams<{
    senderMappings?: string;
    saveMappings?: string;
    fileBase64?: string;
  }>();

  const [importState, setImportState] = useState<ImportState>("initial");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewMutation = usePreviewWhatsAppMutation();
  const importMutation = useImportWhatsAppMutation();

  const textSecondary = useThemeColor({}, "textSecondary");
  const tint = useThemeColor({}, "tint");
  const success = useThemeColor({}, "success");
  const errorColor = useThemeColor({}, "error");

  // Handle returning from mapping screen with mappings
  // Use a ref to track if we've already processed these params
  const processedParamsRef = useRef<string | null>(null);

  useEffect(() => {
    if (params.fileBase64 && params.senderMappings) {
      // Prevent double-processing
      const paramsKey = `${params.fileBase64}-${params.senderMappings}`;
      if (processedParamsRef.current === paramsKey) return;
      processedParamsRef.current = paramsKey;

      const senderMappings = JSON.parse(params.senderMappings) as Record<
        string,
        string
      >;
      const saveMappings = params.saveMappings === "true";

      setImportState("importing");
      importMutation.mutate(
        {
          file: params.fileBase64,
          senderMappings,
          saveMappings,
        },
        {
          onSuccess: () => {
            setImportState("success");
          },
          onError: (error) => {
            setErrorMessage(error.message);
            setImportState("error");
          },
        }
      );
    }
  }, [
    params.fileBase64,
    params.senderMappings,
    params.saveMappings,
    importMutation,
  ]);

  const handleSelectFile = useCallback(async () => {
    setImportState("picking");

    const pickedFile = await pickWhatsAppExportFile();
    if (!pickedFile) {
      setImportState("initial");
      return;
    }

    setImportState("previewing");

    previewMutation.mutate(
      { file: pickedFile.base64 },
      {
        onSuccess: (data) => {
          // If there are multiple senders, navigate to mapping screen
          if (data.senderNames.length > 1) {
            router.replace({
              pathname: "/import-mapping",
              params: {
                senderNames: JSON.stringify(data.senderNames),
                fileBase64: pickedFile.base64,
              },
            });
            setImportState("initial"); // Reset state for when user comes back
          } else {
            // Single sender or no senders - proceed with direct import
            setImportState("importing");
            importMutation.mutate(
              { file: pickedFile.base64 },
              {
                onSuccess: () => {
                  setImportState("success");
                },
                onError: (error) => {
                  setErrorMessage(error.message);
                  setImportState("error");
                },
              }
            );
          }
        },
        onError: (error) => {
          setErrorMessage(error.message);
          setImportState("error");
        },
      }
    );
  }, [previewMutation, importMutation]);

  const handleDone = useCallback(() => {
    // Navigate back to home
    router.back();
  }, []);

  const handleRetry = useCallback(() => {
    setImportState("initial");
    setErrorMessage(null);
    previewMutation.reset();
    importMutation.reset();
  }, [previewMutation, importMutation]);

  const result = importMutation.data;
  const isLoading =
    importState === "picking" ||
    importState === "previewing" ||
    importState === "importing";

  const renderContent = () => {
    if (importState === "success" && result) {
      const hasErrors = result.failed.length > 0;
      const hasImports = result.imported > 0;
      const hasSkips = result.skipped > 0;

      // Decide main icon and color
      let iconName: keyof typeof Ionicons.glyphMap = "checkmark-circle";
      let iconColor = success;
      let titleText = "Import Complete";

      if (!(hasImports || hasSkips) && hasErrors) {
        iconName = "alert-circle";
        iconColor = errorColor;
        titleText = "Import Failed";
      } else if (!hasImports && hasSkips && !hasErrors) {
        iconName = "information-circle";
        iconColor = tint;
        titleText = "No New Recordings";
      } else if (!(hasImports || hasSkips || hasErrors)) {
        iconName = "alert-circle";
        iconColor = textSecondary;
        titleText = "No Files Found";
      }

      return (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.contentContainer}
        >
          <View style={styles.iconContainer}>
            <Ionicons color={iconColor} name={iconName} size={64} />
          </View>

          <ThemedText style={styles.title} type="subtitle">
            {titleText}
          </ThemedText>

          <View style={{ alignItems: "center", gap: 4 }}>
            {hasImports && (
              <ThemedText style={{ textAlign: "center", fontSize: 16 }}>
                {result.imported} recording{result.imported !== 1 ? "s" : ""}{" "}
                imported
              </ThemedText>
            )}
            {hasSkips && (
              <ThemedText style={{ color: textSecondary, textAlign: "center" }}>
                {result.skipped} duplicate{result.skipped !== 1 ? "s" : ""}{" "}
                skipped
              </ThemedText>
            )}
            {hasErrors && (
              <ThemedText style={{ color: errorColor, textAlign: "center" }}>
                {result.failed.length} failed
              </ThemedText>
            )}
            {!(hasImports || hasSkips || hasErrors) && (
              <ThemedText style={{ color: textSecondary, textAlign: "center" }}>
                No audio files found in export
              </ThemedText>
            )}
          </View>
        </Animated.View>
      );
    }

    if (importState === "error" && errorMessage) {
      return (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.contentContainer}
        >
          <Ionicons color={errorColor} name="alert-circle" size={48} />
          <ThemedText style={{ color: errorColor, textAlign: "center" }}>
            {errorMessage}
          </ThemedText>
        </Animated.View>
      );
    }

    // Initial or loading state
    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.contentContainer}
      >
        <View style={styles.iconContainer}>
          <Ionicons color={tint} name="logo-whatsapp" size={64} />
        </View>
        <ThemedText style={styles.title} type="subtitle">
          Import from WhatsApp
        </ThemedText>
        <ThemedText style={[styles.instructions, { color: textSecondary }]}>
          Select a WhatsApp chat export (.zip) to import your voice notes into
          Relune.
        </ThemedText>
      </Animated.View>
    );
  };

  const renderButton = () => {
    if (importState === "success") {
      return <SoftButton onPress={handleDone} title="Done" />;
    }

    if (importState === "error") {
      return <SoftButton onPress={handleRetry} title="Try Again" />;
    }

    const buttonTitle = isLoading
      ? importState === "importing"
        ? "Importing..."
        : "Processing..."
      : "Select Export File";

    return (
      <SoftButton
        disabled={isLoading}
        loading={isLoading}
        onPress={handleSelectFile}
        title={buttonTitle}
      />
    );
  };

  return (
    <View style={[styles.container]}>
      <View style={styles.contentWrapper}>{renderContent()}</View>
      <View style={styles.footer}>{renderButton()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
  },
  contentWrapper: {
    marginBottom: 32,
    minHeight: 180,
    justifyContent: "center",
  },
  contentContainer: {
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    marginBottom: 8,
  },
  instructions: {
    textAlign: "center",
    lineHeight: 24,
    fontSize: 16,
  },
  footer: {},
});
