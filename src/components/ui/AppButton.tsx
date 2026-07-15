import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger";
};

export function AppButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: AppButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === "outline" && styles.outline,
        variant === "danger" && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Text
        style={[
          styles.text,
          variant === "outline" && styles.outlineText,
          variant === "danger" && styles.dangerText,
        ]}
      >
        {loading ? "Please wait..." : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  text: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  outline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineText: {
    color: colors.text,
  },
  danger: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  dangerText: {
    color: colors.danger,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
});
