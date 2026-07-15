import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "@/theme/colors";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
};

export function Skeleton({ width = "100%", height = 14, radius = 8 }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius, opacity },
      ]}
    />
  );
}

export function ProductGridSkeleton() {
  return (
    <View style={styles.gridWrap}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} style={styles.productCard}>
          <Skeleton height={150} radius={12} />
          <Skeleton height={14} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={18} />
        </View>
      ))}
    </View>
  );
}

export function OrdersListSkeleton() {
  return (
    <View style={styles.ordersWrap}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.orderCard}>
          <Skeleton height={120} radius={10} />
          <Skeleton width="55%" />
          <Skeleton width="85%" />
          <Skeleton width="40%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  gridWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  productCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 8,
    gap: 8,
  },
  ordersWrap: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
});
