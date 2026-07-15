import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { deleteAddress, getAddresses } from "@/services/addresses";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { colors } from "@/theme/colors";
import type { ProfileStackParamList } from "@/navigation/AppNavigator";

export function AddressesScreen() {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const queryClient = useQueryClient();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });

  if (addressesQuery.isPending) return <LoadingView label="Loading addresses..." />;
  if (addressesQuery.isError) {
    return (
      <ErrorState
        message={addressesQuery.error instanceof Error ? addressesQuery.error.message : "Failed to load addresses"}
        onRetry={() => addressesQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerAction}>
        <AppButton
          title="Add new address"
          onPress={() => navigation.navigate("AddressForm")}
        />
      </View>
      <FlatList
        data={addressesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={addressesQuery.isRefetching}
            onRefresh={() => addressesQuery.refetch()}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="No address saved"
            subtitle="Add your first delivery address to continue checkout."
            actionLabel="Add address"
            onAction={() => navigation.navigate("AddressForm")}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.fullName} {item.isDefault ? "(Default)" : ""}
            </Text>
            <Text style={styles.line}>{item.phone}</Text>
            <Text style={styles.line}>
              {item.addressLine1}
              {item.addressLine2 ? `, ${item.addressLine2}` : ""}
            </Text>
            <Text style={styles.line}>
              {item.city}, {item.state} - {item.pincode}
            </Text>
            <View style={styles.actionsRow}>
              <View style={styles.editBtnWrap}>
                <AppButton
                  title="Edit"
                  variant="outline"
                  onPress={() => navigation.navigate("AddressForm", { addressId: item.id })}
                />
              </View>
              <Pressable
                style={styles.deleteIconButton}
                onPress={() => setDeleteTargetId(item.id)}
                accessibilityRole="button"
                accessibilityLabel="Delete address"
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        )}
      />
      <ConfirmModal
        visible={Boolean(deleteTargetId)}
        title="Delete address?"
        message="This address will be removed from your account."
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (!deleteTargetId) return;
          deleteMutation.mutate(deleteTargetId);
          setDeleteTargetId(null);
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
  list: {
    padding: 16,
    gap: 12,
  },
  headerAction: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  name: {
    color: colors.text,
    fontWeight: "700",
  },
  line: {
    color: colors.mutedText,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  editBtnWrap: {
    flex: 1,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
