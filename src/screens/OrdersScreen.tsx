import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getOrders } from "@/services/orders";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrdersListSkeleton } from "@/components/ui/Skeleton";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { colors } from "@/theme/colors";
import type { OrdersStackParamList } from "@/navigation/AppNavigator";

type OrderFilter = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";

export function OrdersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });
  const filteredOrders = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    if (filter === "ALL") return orders;
    if (filter === "DELIVERED") return orders.filter((item) => item.status === "DELIVERED");
    if (filter === "CANCELLED") {
      return orders.filter((item) =>
        ["CANCELLED", "REFUNDED", "RETURN_REQUESTED", "RETURN_APPROVED"].includes(item.status),
      );
    }
    return orders.filter((item) =>
      ["PLACED", "PAID", "PROCESSING", "SHIPPED"].includes(item.status),
    );
  }, [filter, ordersQuery.data]);

  if (ordersQuery.isPending) return <OrdersListSkeleton />;
  if (ordersQuery.isError) {
    return (
      <ErrorState
        message={ordersQuery.error instanceof Error ? ordersQuery.error.message : "Failed to load orders"}
        onRetry={() => ordersQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <AppTopHeader />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {[
          { key: "ALL", label: "All" },
          { key: "ACTIVE", label: "Active" },
          { key: "DELIVERED", label: "Delivered" },
          { key: "CANCELLED", label: "Cancelled/Returns" },
        ].map((item) => (
          <Pressable
            key={item.key}
            style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
            onPress={() => setFilter(item.key as OrderFilter)}
          >
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={ordersQuery.isRefetching}
            onRefresh={() => ordersQuery.refetch()}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="No orders yet"
            subtitle="Your successful purchases will appear here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
          >
            {item.items[0]?.product?.images?.[0]?.imageUrl ? (
              <Image
                source={{ uri: item.items[0].product.images[0].imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>No image</Text>
              </View>
            )}
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            <Text style={styles.meta}>
              Status: {item.status} • Payment: {item.paymentStatus}
            </Text>
            <Text style={styles.total}>Rs. {item.totalAmount.toFixed(2)}</Text>
            <Text style={styles.meta}>Items: {item.items.length}</Text>
          </Pressable>
        )}
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
    paddingTop: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  filterTextActive: {
    color: colors.primary,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  image: {
    width: "100%",
    height: 130,
    borderRadius: 10,
    marginBottom: 2,
  },
  imagePlaceholder: {
    width: "100%",
    height: 130,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  imagePlaceholderText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  total: {
    color: colors.primary,
    fontWeight: "700",
  },
  meta: {
    color: colors.mutedText,
  },
});
