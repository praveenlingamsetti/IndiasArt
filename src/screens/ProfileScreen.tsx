import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/auth-context";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { colors } from "@/theme/colors";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "@/navigation/AppNavigator";

type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, "ProfileHome">;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const { user, signOut } = useAuth();
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);

  if (!user) {
    return (
      <View style={styles.container}>
        <AppTopHeader />
        <View style={styles.center}>
          <Text>Please sign in.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppTopHeader />
      <View style={styles.content}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.meta}>Role: {user.role}</Text>

        <View style={styles.actions}>
          <AppButton
            title="My addresses"
            variant="outline"
            onPress={() => navigation.navigate("Addresses")}
          />
          <AppButton
            title="Wishlist"
            variant="outline"
            onPress={() => navigation.navigate("Wishlist")}
          />
          <AppButton
            title="Support"
            variant="outline"
            onPress={() => navigation.navigate("Support")}
          />
        </View>

        <AppButton
          title="Sign out"
          variant="danger"
          onPress={() => setConfirmLogoutVisible(true)}
        />
      </View>

      <ConfirmModal
        visible={confirmLogoutVisible}
        title="Sign out?"
        message="You will need to log in again to access your account and orders."
        confirmLabel="Sign out"
        destructive
        onCancel={() => setConfirmLogoutVisible(false)}
        onConfirm={async () => {
          setConfirmLogoutVisible(false);
          await signOut();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  email: {
    color: colors.text,
  },
  meta: {
    color: colors.mutedText,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
});
