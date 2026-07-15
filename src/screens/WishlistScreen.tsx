import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getWishlist, removeWishlist } from "@/services/wishlist";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { colors } from "@/theme/colors";

export function WishlistScreen() {
  const queryClient = useQueryClient();
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  if (wishlistQuery.isPending) return <LoadingView label="Loading wishlist..." />;
  if (wishlistQuery.isError) {
    return (
      <ErrorState
        message={wishlistQuery.error instanceof Error ? wishlistQuery.error.message : "Failed to load wishlist"}
        onRetry={() => wishlistQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={wishlistQuery.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={wishlistQuery.isRefetching}
            onRefresh={() => wishlistQuery.refetch()}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="Wishlist is empty"
            subtitle="Save products to quickly find them later."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              style={styles.deleteIconButton}
              onPress={() => setDeleteProductId(item.productId)}
              accessibilityRole="button"
              accessibilityLabel="Remove from wishlist"
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
            {item.product.images?.[0]?.imageUrl ? (
              <Image
                source={{ uri: item.product.images[0].imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>No image</Text>
              </View>
            )}
            <Text style={styles.title}>{item.product.title}</Text>
            <Text style={styles.price}>Rs. {Number(item.product.price).toFixed(2)}</Text>
            <Text style={styles.stockText}>
              {Number(item.product.stock ?? 0) > 0
                ? `${item.product.stock} in stock`
                : "Out of stock"}
            </Text>
          </View>
        )}
      />
      <ConfirmModal
        visible={Boolean(deleteProductId)}
        title="Remove from wishlist?"
        message="You can add this product again later."
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeleteProductId(null)}
        onConfirm={() => {
          if (!deleteProductId) return;
          removeMutation.mutate(deleteProductId);
          setDeleteProductId(null);
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    position: "relative",
  },
  deleteIconButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffffdd",
    zIndex: 1,
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: "100%",
    height: 150,
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
    fontWeight: "600",
    color: colors.text,
  },
  price: {
    color: colors.primary,
    fontWeight: "700",
  },
  stockText: {
    color: colors.mutedText,
    fontWeight: "600",
  },
});
