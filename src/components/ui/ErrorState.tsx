import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme/colors";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <AppButton title="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
  },
  message: {
    textAlign: "center",
    color: colors.mutedText,
    lineHeight: 20,
  },
});
