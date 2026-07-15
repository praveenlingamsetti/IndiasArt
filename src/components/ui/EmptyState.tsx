import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme/colors";

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton title={actionLabel} onPress={onAction} variant="outline" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    textAlign: "center",
    color: colors.mutedText,
    lineHeight: 20,
  },
  action: {
    width: 180,
    marginTop: 8,
  },
});
