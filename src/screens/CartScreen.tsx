import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/auth-context";
import { getCart, removeCartItem, updateCartItem } from "@/services/cart";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme/colors";
import type { CartStackParamList } from "@/navigation/AppNavigator";

export function CartScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<CartStackParamList>>();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: Boolean(user),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update cart.");
    },
  });
  const updateQtyMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update quantity.");
    },
  });

  if (!user) {
    return (
      <EmptyState
        title="Login to access your cart"
        subtitle="Sign in to continue checkout and manage saved cart items."
        actionLabel="Go to account"
        onAction={() => navigation.getParent()?.navigate("ProfileTab")}
      />
    );
  }

  if (cartQuery.isPending) {
    return <LoadingView label="Loading cart..." />;
  }

  if (cartQuery.isError) {
    return (
      <EmptyState
        title="Could not load cart"
        subtitle={cartQuery.error instanceof Error ? cartQuery.error.message : "Please try again."}
        actionLabel="Retry"
        onAction={() => cartQuery.refetch()}
      />
    );
  }

  const cart = cartQuery.data;

  return (
    <View style={styles.container}>
      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="Your cart is empty"
            subtitle="Browse products and add your favorites."
            actionLabel="Continue shopping"
            onAction={() => navigation.getParent()?.navigate("HomeTab")}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {(() => {
              const resolvedStock =
                typeof item.availableStock === "number"
                  ? item.availableStock
                  : typeof item.variant?.stock === "number"
                    ? item.variant.stock
                    : typeof item.product.stock === "number"
                      ? item.product.stock
                      : null;

              const stockLabel =
                resolvedStock == null
                  ? "Stock will be confirmed at checkout"
                  : resolvedStock > 0
                    ? `${resolvedStock} in stock`
                    : item.quantity > 0
                      ? "In cart • stock will be confirmed at checkout"
                      : "Currently unavailable";

              return (
                <>
            <View style={styles.itemRow}>
              {item.product.imageUrl ? (
                <Image
                  source={{ uri: item.product.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No image</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text numberOfLines={2} style={styles.title}>
                  {item.product.title}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.qtyControl}>
                    <Pressable
                      style={styles.qtyButton}
                      onPress={() => {
                        if (item.quantity <= 1) {
                          removeMutation.mutate(item.id);
                          return;
                        }
                        updateQtyMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                      }}
                    >
                      <Text style={styles.qtyButtonText}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyButton}
                      onPress={() => updateQtyMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                      disabled={Boolean(
                        resolvedStock != null && resolvedStock > 0 && item.quantity >= resolvedStock,
                      )}
                    >
                      <Text style={styles.qtyButtonText}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.itemPrice}>Rs. {Number(item.product.price).toFixed(2)}</Text>
                </View>
                <Text style={styles.stockText}>{stockLabel}</Text>
              </View>
            </View>
            <View style={styles.cardActionsRow}>
              <View style={styles.buyNowButton}>
                <AppButton
                  title="Proceed to buy"
                  onPress={() => navigation.navigate("Checkout", { cartItemId: item.id })}
                />
              </View>
              <Pressable
                style={styles.removeIconButton}
                onPress={() => removeMutation.mutate(item.id)}
                disabled={removeMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Remove item"
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
                </>
              );
            })()}
          </View>
        )}
      />

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>Total ({cart?.itemCount ?? 0} items)</Text>
          <Text style={styles.totalValue}>Rs. {Number(cart?.subtotal ?? 0).toFixed(2)}</Text>
        </View>
        <View style={styles.checkoutButton}>
          <AppButton
            title="Checkout"
            onPress={() => navigation.navigate("Checkout")}
            disabled={!cart || cart.items.length === 0}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 120,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  itemRow: {
    flexDirection: "row",
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 8,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  qtyControl: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  qtyButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  qtyButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: -2,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: "center",
    color: colors.text,
    fontWeight: "700",
  },
  itemPrice: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  stockText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "600",
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buyNowButton: {
    flex: 1,
  },
  removeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  checkoutButton: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
