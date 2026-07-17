import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { ProductListItem } from "@/types/api";
import { colors } from "@/theme/colors";

type ProductGridItemProps = {
  item: ProductListItem;
  isWishlisted: boolean;
  quantityInCart?: number;
  onPressProduct: () => void;
  onToggleWishlist: () => void;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
};

export function ProductGridItem({
  item,
  isWishlisted,
  quantityInCart,
  onPressProduct,
  onToggleWishlist,
  onAdd,
  onIncrease,
  onDecrease,
}: ProductGridItemProps) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPressProduct}>
      <View style={styles.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No image</Text>
          </View>
        )}
        <Pressable style={styles.wishlistIcon} onPress={onToggleWishlist}>
          <Ionicons
            name={isWishlisted ? "heart" : "heart-outline"}
            color={isWishlisted ? colors.primary : colors.text}
            size={20}
          />
        </Pressable>
        {item.hasVariants ? (
          <View style={styles.variantPill}>
            <Text style={styles.variantPillText}>Variants</Text>
          </View>
        ) : null}
      </View>

      <Text numberOfLines={2} style={styles.title}>
        {item.title}
      </Text>
      <Text style={styles.price}>Rs {item.price.toFixed(0)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.stockMeta} numberOfLines={1}>
          {item.stock > 0 ? `${item.stock} available` : "Currently unavailable"}
        </Text>
      </View>

      {item.stock > 0 ? (
        quantityInCart ? (
          <View style={styles.qtyControl}>
            <Pressable style={styles.qtyButton} onPress={onDecrease}>
              <Text style={styles.qtyButtonText}>-</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{quantityInCart}</Text>
            <Pressable style={styles.qtyButton} onPress={onIncrease}>
              <Text style={styles.qtyButtonText}>+</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={onAdd}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        )
      ) : (
        <View style={styles.outOfStockPill}>
          <Text style={styles.outOfStockText}>Out of stock</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: { transform: [{ scale: 0.985 }] },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 162,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 162,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  imagePlaceholderText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    minHeight: 38,
  },
  price: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "700",
  },
  wishlistIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  variantPill: {
    position: "absolute",
    left: 8,
    bottom: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  variantPillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  metaRow: {
    minHeight: 16,
  },
  stockMeta: {
    fontSize: 11,
    color: colors.mutedText,
    fontWeight: "600",
  },
  addButton: {
    alignSelf: "flex-end",
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  qtyControl: {
    alignSelf: "flex-end",
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
    fontSize: 20,
    color: colors.text,
    marginTop: -2,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: "center",
    color: colors.text,
    fontWeight: "700",
  },
  outOfStockPill: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  outOfStockText: {
    color: colors.mutedText,
    fontWeight: "600",
  },
});
