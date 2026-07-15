import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { OrdersStackParamList } from "@/navigation/AppNavigator";
import { env } from "@/config/env";
import { openRazorpayCheckout } from "@/lib/razorpay";
import {
  createMobilePaymentOrder,
  verifyMobilePayment,
} from "@/services/checkout";
import {
  cancelOrder,
  downloadOrderInvoice,
  getOrderDetail,
  getOrderTracking,
  requestOrderReturn,
} from "@/services/orders";
import { AppButton } from "@/components/ui/AppButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingView } from "@/components/ui/LoadingView";
import { colors } from "@/theme/colors";

type OrderDetailRoute = RouteProp<OrdersStackParamList, "OrderDetail">;
const REASON_OPTIONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Delivery is too late",
  "Need a different product/variant",
  "Other",
];

export function OrderDetailScreen() {
  const queryClient = useQueryClient();
  const route = useRoute<OrderDetailRoute>();
  const { orderId } = route.params;
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  const orderQuery = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => getOrderDetail(orderId),
  });

  const trackingQuery = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => getOrderTracking(orderId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(orderId, reason || "Cancelled from mobile app"),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] }),
      ]);
    },
  });

  const returnMutation = useMutation({
    mutationFn: () =>
      requestOrderReturn(orderId, reason || "Requesting return from mobile app"),
  });

  const retryPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!env.razorpayKeyId) {
        throw new Error(
          "Set EXPO_PUBLIC_RAZORPAY_KEY_ID in your mobile .env and restart Expo.",
        );
      }

      const payment = await createMobilePaymentOrder(orderId);
      const checkoutResult = await openRazorpayCheckout({
        key: env.razorpayKeyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.order_id,
        name: "INDIASART",
        description: `Order #${payment.orderNumber}`,
        theme: { color: "#a16207" },
      });

      await verifyMobilePayment({
        orderId: payment.orderId,
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });
      return payment.orderNumber;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["order-tracking", orderId] }),
      ]);
    },
  });

  async function handleCancel() {
    try {
      await cancelMutation.mutateAsync();
      Alert.alert("Order cancelled", "Your cancellation request is processed.");
    } catch (error) {
      Alert.alert("Cancel failed", error instanceof Error ? error.message : "Try again");
    }
  }

  async function handleReturn() {
    try {
      await returnMutation.mutateAsync();
      Alert.alert("Return requested", "Your return request has been submitted.");
    } catch (error) {
      Alert.alert(
        "Return failed",
        error instanceof Error ? error.message : "Try again later",
      );
    }
  }

  async function handleRetryPayment() {
    try {
      const orderNumber = await retryPaymentMutation.mutateAsync();
      Alert.alert("Payment successful", `Order #${orderNumber} is confirmed.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not complete payment";
      if (message.toLowerCase().includes("cancel")) {
        Alert.alert("Payment cancelled", "You can retry payment anytime.");
        return;
      }
      Alert.alert("Retry payment failed", message);
    }
  }

  async function handleInvoiceDownload() {
    try {
      await downloadOrderInvoice(orderId);
    } catch (error) {
      Alert.alert(
        "Invoice failed",
        error instanceof Error ? error.message : "Could not open invoice",
      );
    }
  }

  if (orderQuery.isPending) return <LoadingView label="Loading order..." />;
  if (orderQuery.isError) {
    return (
      <ErrorState
        message={
          orderQuery.error instanceof Error
            ? orderQuery.error.message
            : "Failed to load order"
        }
        onRetry={() => orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;
  const tracking = trackingQuery.data;
  const timeline = [
    { key: "PLACED", label: "Order placed", done: true },
    {
      key: "PROCESSING",
      label: "Processing",
      done: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status),
    },
    {
      key: "SHIPPED",
      label: "Shipped",
      done: ["SHIPPED", "DELIVERED"].includes(order.status),
    },
    {
      key: "DELIVERED",
      label: "Delivered",
      done: order.status === "DELIVERED",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Order #{order.orderNumber}</Text>
        <Text style={styles.meta}>Status: {order.status}</Text>
        <Text style={styles.meta}>Payment: {order.paymentStatus}</Text>
        <Text style={styles.total}>Rs. {order.totalAmount.toFixed(2)}</Text>
        {(order.paymentStatus === "SUCCESS" || order.paymentStatus === "REFUNDED") ? (
          <AppButton title="Download invoice" variant="outline" onPress={handleInvoiceDownload} />
        ) : null}
        {order.paymentMethod === "ONLINE" && order.paymentStatus !== "SUCCESS" ? (
          <AppButton
            title="Retry payment"
            loading={retryPaymentMutation.isPending}
            onPress={handleRetryPayment}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Line items</Text>
        {order.items.map((item) => {
          const lineTotal = Number(item.price) * item.quantity;
          return (
            <View key={item.id} style={styles.lineItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineItemTitle}>{item.product.title}</Text>
                <Text style={styles.meta}>Qty {item.quantity} x Rs. {Number(item.price).toFixed(2)}</Text>
              </View>
              <Text style={styles.lineItemTotal}>Rs. {lineTotal.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Tracking</Text>
        <View style={styles.timeline}>
          {timeline.map((step) => (
            <View key={step.key} style={styles.timelineRow}>
              <View style={[styles.timelineDot, step.done && styles.timelineDotDone]} />
              <Text style={[styles.meta, step.done && styles.metaDone]}>{step.label}</Text>
            </View>
          ))}
        </View>
        {trackingQuery.isLoading ? (
          <Text style={styles.meta}>Fetching tracking...</Text>
        ) : trackingQuery.isError ? (
          <Text style={styles.meta}>Tracking unavailable right now.</Text>
        ) : !tracking ? (
          <Text style={styles.meta}>Tracking unavailable right now.</Text>
        ) : (
          <>
            <Text style={styles.meta}>Overall status: {tracking.status}</Text>
            {tracking.shipments.map((shipment, index) => (
              <Text key={`${shipment.storeName}-${index}`} style={styles.meta}>
                {shipment.storeName}: {shipment.status}
                {shipment.trackingNumber ? ` (${shipment.trackingNumber})` : ""}
              </Text>
            ))}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Cancel / Return</Text>
        <Pressable style={styles.reasonPicker} onPress={() => setShowReasonPicker(true)}>
          <Text style={styles.reasonPickerText}>{reason}</Text>
        </Pressable>
        <View style={styles.actions}>
          <AppButton
            title="Cancel order"
            variant="outline"
            loading={cancelMutation.isPending}
            onPress={handleCancel}
          />
          <AppButton
            title="Request return"
            variant="danger"
            loading={returnMutation.isPending}
            onPress={handleReturn}
          />
        </View>
      </View>

      <Modal
        visible={showReasonPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReasonPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowReasonPicker(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.title}>Select reason</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {REASON_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.modalOption,
                    reason === option && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setReason(option);
                    setShowReasonPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      reason === option && styles.modalOptionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
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
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  meta: {
    color: colors.mutedText,
  },
  metaDone: {
    color: colors.text,
    fontWeight: "600",
  },
  total: {
    color: colors.primary,
    fontWeight: "700",
  },
  reasonPicker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  reasonPickerText: {
    color: colors.text,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  timeline: {
    marginBottom: 4,
    gap: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  timelineDotDone: {
    backgroundColor: colors.success,
  },
  lineItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 10,
  },
  lineItemTitle: {
    color: colors.text,
    fontWeight: "600",
  },
  lineItemTotal: {
    color: colors.text,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "65%",
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
  modalOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  modalOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  modalOptionText: {
    color: colors.text,
    fontWeight: "500",
  },
  modalOptionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});
