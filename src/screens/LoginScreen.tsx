import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/auth-context";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme/colors";

const loginSchema = z.object({
  email: z.string().min(1, "Email or mobile is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      await signIn(values);
      Alert.alert("Success", "Logged in successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      Alert.alert("Login failed", message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome back</Text>
      <Text style={styles.subheading}>Sign in to continue to your account</Text>

      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Email or mobile"
              autoCapitalize="none"
              style={styles.input}
            />
            {fieldState.error ? <Text style={styles.error}>{fieldState.error.message}</Text> : null}
          </View>
        )}
      />

      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
            />
            {fieldState.error ? <Text style={styles.error}>{fieldState.error.message}</Text> : null}
          </View>
        )}
      />

      <AppButton
        title={submitting ? "Signing in..." : "Sign in"}
        onPress={onSubmit}
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    paddingTop: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
  },
  subheading: {
    color: colors.mutedText,
    marginTop: 4,
    marginBottom: 20,
  },
  field: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 12,
  },
});
