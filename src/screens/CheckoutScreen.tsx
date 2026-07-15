import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from "@react-navigation/native";
import { useAuth } from "@/context/auth-context";
import { env } from "@/config/env";
import { getCart } from "@/services/cart";
import { getAddresses } from "@/services/addresses";
import {
  createMobileOrder,
  createMobilePaymentOrder,
  getCheckoutEstimate,
  verifyMobilePayment,
} from "@/services/checkout";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme/colors";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { CartStackParamList } from "@/navigation/AppNavigator";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function CheckoutScreen() {
  const navigation = useNavigation<NavigationProp<CartStackParamList>>();
  const route = useRoute<RouteProp<CartStackParamList, "Checkout">>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const cartItemId = route.params?.cartItemId;
  const cartQuery = useQuery({ queryKey: ["cart"], queryFn: getCart });
  const addressQuery = useQuery({ queryKey: ["addresses"], queryFn: getAddresses });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("COD");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string>("");
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const [stockIssueVisible, setStockIssueVisible] = useState(false);
  const [stockIssueMessage, setStockIssueMessage] = useState("");
  const previousAddressIdsRef = useRef<string[]>([]);

  const estimateQuery = useQuery({
    queryKey: ["checkout-estimate", cartItemId, appliedCoupon],
    queryFn: () =>
      getCheckoutEstimate({
        cartItemId,
        couponCode: appliedCoupon || undefined,
      }),
  });

  const createOrderMutation = useMutation({
    mutationFn: createMobileOrder,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ]);
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: createMobilePaymentOrder,
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: verifyMobilePayment,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
      ]);
    },
  });

  const cart = cartQuery.data;
  const addresses = addressQuery.data ?? [];
  const defaultAddress = addresses.find((item) => item.isDefault) ?? addresses[0] ?? null;

  useEffect(() => {
    if (!selectedAddressId && defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    }
  }, [defaultAddress, selectedAddressId]);

  useEffect(() => {
    const ids = addresses.map((item) => item.id);
    const previous = previousAddressIdsRef.current;
    if (previous.length > 0 && ids.length > previous.length) {
      const newlyAdded = ids.find((id) => !previous.includes(id));
      if (newlyAdded) {
        setSelectedAddressId(newlyAdded);
      }
    }
    previousAddressIdsRef.current = ids;
  }, [addresses]);

  const selectedAddress = useMemo(
    () => addresses.find((item) => item.id === selectedAddressId) ?? defaultAddress,
    [addresses, selectedAddressId, defaultAddress],
  );

  if (cartQuery.isPending || addressQuery.isPending) {
    return <LoadingView label="Preparing checkout..." />;
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyState title="Cart is empty" subtitle="Add items before checkout." />;
  }

  if (!selectedAddress) {
    return (
      <EmptyState
        title="No address found"
        subtitle="Add a delivery address from profile to continue checkout."
        actionLabel="Add address"
        onAction={() => navigation.navigate("AddressForm")}
      />
    );
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId) return;

    try {
      if (paymentMethod === "ONLINE" && !env.razorpayKeyId) {
        Alert.alert(
          "Missing Razorpay key",
          "Set EXPO_PUBLIC_RAZORPAY_KEY_ID in your mobile .env and restart Expo.",
        );
        return;
      }

      const order = await createOrderMutation.mutateAsync({
        addressId: selectedAddressId,
        paymentMethod,
        cartItemId,
        couponCode: appliedCoupon || undefined,
      });

      if (paymentMethod === "COD") {
        Alert.alert("Order placed", `Order #${order.orderNumber} placed successfully.`);
        return;
      }

      const payment = await createPaymentMutation.mutateAsync(order.id);
      const checkoutResult = await openRazorpayCheckout({
        key: env.razorpayKeyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.order_id,
        name: "INDIASART",
        description: `Order #${payment.orderNumber}`,
        prefill: {
          name: user?.name ?? selectedAddress.fullName,
          email: user?.email,
          contact: selectedAddress.phone,
        },
        theme: { color: "#a16207" },
      });

      await verifyPaymentMutation.mutateAsync({
        orderId: payment.orderId,
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });

      Alert.alert(
        "Payment successful",
        `Order #${payment.orderNumber} has been confirmed.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to place order";
      if (message.toLowerCase().includes("cancel")) {
        Alert.alert("Payment cancelled", "You can retry payment from checkout.");
        return;
      }
      if (message.toLowerCase().includes("stock")) {
        setStockIssueMessage(message);
        setStockIssueVisible(true);
        return;
      }
      Alert.alert("Checkout failed", message);
    }
  }

  const estimatedTotal = estimateQuery.data?.totalAmount ?? cart.subtotal;
  const shippingAmount = estimateQuery.data?.shippingAmount ?? 0;
  const taxAmount = estimateQuery.data?.taxAmount ?? 0;
  const discountAmount = estimateQuery.data?.discountAmount ?? 0;
  const codEnabled = estimateQuery.data?.codEnabled ?? true;
  const codMaxOrderAmount = estimateQuery.data?.codMaxOrderAmount ?? 0;
  const couponError = estimateQuery.data?.couponError ?? null;

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    setAppliedCoupon(code);
  }

  function removeCoupon() {
    setAppliedCoupon("");
    setCouponInput("");
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.heading}>Deliver to</Text>
          <View style={[styles.addressRow, styles.addressRowActive]}>
            <Text style={styles.lineStrong}>{selectedAddress.fullName}</Text>
            <Text style={styles.line}>
              {selectedAddress.addressLine1}
              {selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ""}
            </Text>
            <Text style={styles.line}>
              {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
            </Text>
          </View>
          <View style={styles.addressActions}>
            <View style={styles.addressActionButton}>
              <AppButton
                title="Change address"
                variant="outline"
                onPress={() => setAddressPickerVisible(true)}
              />
            </View>
            <View style={styles.addressActionButton}>
              <AppButton
                title="+ Add address"
                variant="outline"
                onPress={() => navigation.navigate("AddressForm")}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Order summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.line}>Items</Text>
            <Text style={styles.lineStrong}>{cart.itemCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.line}>Subtotal</Text>
            <Text style={styles.lineStrong}>Rs. {Number(estimateQuery.data?.subtotal ?? cart.subtotal).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.line}>Shipping</Text>
            <Text style={styles.lineStrong}>Rs. {shippingAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.line}>Tax (GST)</Text>
            <Text style={styles.lineStrong}>Rs. {taxAmount.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.line}>Discount</Text>
              <Text style={styles.discountText}>- Rs. {discountAmount.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.line}>Estimated total</Text>
            <Text style={styles.total}>Rs. {estimatedTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              value={couponInput}
              onChangeText={setCouponInput}
              placeholder="Coupon code"
              autoCapitalize="characters"
            />
            <View style={styles.couponButton}>
              <Pressable
                style={[
                  styles.applyCouponBtn,
                  !couponInput.trim() && styles.applyCouponBtnDisabled,
                ]}
                onPress={applyCoupon}
                disabled={!couponInput.trim()}
              >
                <Text style={styles.applyCouponBtnText}>Apply</Text>
              </Pressable>
            </View>
          </View>
          {appliedCoupon ? (
            <View style={styles.appliedRow}>
              <Text style={styles.appliedText}>Applied: {appliedCoupon}</Text>
              <Pressable onPress={removeCoupon}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ) : null}
          {couponError ? <Text style={styles.errorText}>{couponError}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Payment method</Text>
          <View style={styles.paymentRow}>
            <Pressable
              onPress={() => setPaymentMethod("COD")}
              style={[
                styles.methodChip,
                paymentMethod === "COD" && styles.methodChipActive,
                (!codEnabled || (codMaxOrderAmount > 0 && estimatedTotal > codMaxOrderAmount)) &&
                  styles.methodChipDisabled,
              ]}
              disabled={!codEnabled || (codMaxOrderAmount > 0 && estimatedTotal > codMaxOrderAmount)}
            >
              <Text
                style={[
                  styles.methodChipText,
                  paymentMethod === "COD" && styles.methodChipTextActive,
                ]}
              >
                Cash on Delivery
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPaymentMethod("ONLINE")}
              style={[
                styles.methodChip,
                paymentMethod === "ONLINE" && styles.methodChipActive,
              ]}
            >
              <Text
                style={[
                  styles.methodChipText,
                  paymentMethod === "ONLINE" && styles.methodChipTextActive,
                ]}
              >
                Online (Razorpay)
              </Text>
            </Pressable>
          </View>
          {!codEnabled ? (
            <Text style={styles.errorText}>Cash on delivery is currently unavailable.</Text>
          ) : codMaxOrderAmount > 0 && estimatedTotal > codMaxOrderAmount ? (
            <Text style={styles.errorText}>
              COD available up to Rs. {codMaxOrderAmount.toFixed(2)}.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={addressPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddressPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAddressPickerVisible(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.heading}>Choose address</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {addresses.map((address) => (
                <Pressable
                  key={address.id}
                  onPress={() => {
                    setSelectedAddressId(address.id);
                    setAddressPickerVisible(false);
                  }}
                  style={[
                    styles.addressRow,
                    selectedAddressId === address.id && styles.addressRowActive,
                  ]}
                >
                  <Text style={styles.lineStrong}>{address.fullName}</Text>
                  <Text style={styles.line}>
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                  </Text>
                  <Text style={styles.line}>
                    {address.city}, {address.state} - {address.pincode}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={stockIssueVisible}
        title="Out of stock"
        message={stockIssueMessage || "One or more items are out of stock."}
        confirmLabel="Okay"
        cancelLabel="Close"
        onCancel={() => setStockIssueVisible(false)}
        onConfirm={() => setStockIssueVisible(false)}
      />

      <View style={styles.footer}>
        <View>
          <Text style={styles.line}>Payable amount</Text>
          <Text style={styles.total}>Rs. {estimatedTotal.toFixed(2)}</Text>
        </View>
        <View style={styles.footerButton}>
          <AppButton
            title={paymentMethod === "COD" ? "Place order" : "Pay now"}
            loading={
              createOrderMutation.isPending ||
              createPaymentMutation.isPending ||
              verifyPaymentMutation.isPending
            }
            onPress={handlePlaceOrder}
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
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 140,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  addressRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    backgroundColor: colors.background,
  },
  addressRowActive: {
    borderColor: colors.primary,
    backgroundColor: "#fff8f1",
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  line: {
    color: colors.mutedText,
  },
  lineStrong: {
    color: colors.text,
    fontWeight: "600",
  },
  total: {
    fontWeight: "700",
    color: colors.primary,
    marginTop: 2,
    fontSize: 17,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  discountText: {
    color: colors.success,
    fontWeight: "700",
  },
  couponRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "stretch",
  },
  couponInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  couponButton: {
    width: 90,
  },
  applyCouponBtn: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  applyCouponBtnDisabled: {
    opacity: 0.55,
  },
  applyCouponBtnText: {
    color: colors.text,
    fontWeight: "700",
  },
  addressActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  addressActionButton: {
    flex: 1,
  },
  appliedRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appliedText: {
    color: colors.success,
    fontWeight: "700",
  },
  removeText: {
    color: colors.primary,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    marginTop: 6,
  },
  paymentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  methodChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#fff8f1",
  },
  methodChipDisabled: {
    opacity: 0.5,
  },
  methodChipText: {
    color: colors.mutedText,
    fontWeight: "600",
    fontSize: 12,
  },
  methodChipTextActive: {
    color: colors.primary,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  footerButton: {
    flex: 1,
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
    maxHeight: "70%",
    backgroundColor: colors.surface,
    padding: 16,
    gap: 8,
  },
});
