import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { addToCart } from "@/services/cart";
import { getCart, removeCartItem, updateCartItem } from "@/services/cart";
import { getProductBySlug, getProducts } from "@/services/products";
import type { HomeStackParamList, RootTabParamList } from "@/navigation/AppNavigator";
import { ApiRequestError } from "@/lib/http";
import { addWishlist, getWishlist, removeWishlist } from "@/services/wishlist";
import { getReviewEligibility, submitProductReview } from "@/services/reviews";
import { AppButton } from "@/components/ui/AppButton";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/theme/colors";
import type { ProductListItem } from "@/types/api";
import { useAuth } from "@/context/auth-context";

type ProductRoute = RouteProp<HomeStackParamList, "ProductDetail">;

export function ProductDetailScreen() {
  const tabNavigation = useNavigation<NavigationProp<RootTabParamList>>();
  const stackNavigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const route = useRoute<ProductRoute>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { width: viewportWidth } = useWindowDimensions();
  const slug = route.params.slug;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug(slug),
  });

  const addToCartMutation = useMutation({
    mutationFn: (payload: { productId: string; variantId?: string }) =>
      addToCart({ productId: payload.productId, variantId: payload.variantId, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      const message =
        error instanceof ApiRequestError ? error.message : "Could not add item to cart";
      Alert.alert("Error", message);
    },
  });
  const updateCartMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (error) => {
      const message =
        error instanceof ApiRequestError ? error.message : "Could not update cart quantity";
      Alert.alert("Error", message);
    },
  });
  const removeCartMutation = useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (error) => {
      const message = error instanceof ApiRequestError ? error.message : "Could not remove item";
      Alert.alert("Error", message);
    },
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: async ({
      productId,
      shouldAdd,
    }: {
      productId: string;
      shouldAdd: boolean;
    }) => {
      if (shouldAdd) {
        await addWishlist(productId);
        return;
      }
      await removeWishlist(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onError: (error) => {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : "Could not update wishlist";
      Alert.alert("Error", message);
    },
  });

  const reviewEligibilityQuery = useQuery({
    queryKey: ["review-eligibility", slug],
    queryFn: () => getReviewEligibility(slug),
  });
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: Boolean(user),
  });
  const wishlistQuery = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
    enabled: Boolean(user),
  });

  const similarProductsQuery = useQuery({
    queryKey: ["similar-products", productQuery.data?.id, productQuery.data?.category?.slug],
    enabled: Boolean(productQuery.data?.id && productQuery.data?.category?.slug),
    queryFn: async () => {
      const result = await getProducts({
        category: productQuery.data?.category?.slug,
        limit: 12,
        sort: "popularity",
      });
      return result.products.filter((item) => item.id !== productQuery.data?.id).slice(0, 8);
    },
  });

  const artistProductsQuery = useQuery({
    queryKey: ["artist-products", productQuery.data?.id, productQuery.data?.vendor?.storeSlug],
    enabled: Boolean(productQuery.data?.id && productQuery.data?.vendor?.storeSlug),
    queryFn: async () => {
      const result = await getProducts({
        artist: productQuery.data?.vendor?.storeSlug,
        limit: 12,
        sort: "newest",
      });
      return result.products.filter((item) => item.id !== productQuery.data?.id).slice(0, 8);
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: () =>
      submitProductReview(slug, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      }),
    onSuccess: async () => {
      setReviewComment("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product", slug] }),
        queryClient.invalidateQueries({ queryKey: ["review-eligibility", slug] }),
      ]);
      Alert.alert("Thanks!", "Your review was submitted.");
    },
    onError: (error) => {
      const message =
        error instanceof ApiRequestError ? error.message : "Could not submit review";
      Alert.alert("Review failed", message);
    },
  });

  const product = productQuery.data;
  const variants = product?.variants ?? [];
  const selectedVariant = useMemo(
    () => variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );
  const rating = useMemo(
    () => (product ? Number(product.avgRating || 0).toFixed(1) : "0.0"),
    [product],
  );

  useEffect(() => {
    if (!product) return;
    if (variants.length > 0) {
      const firstInStock = variants.find((variant) => variant.stock > 0)?.id ?? variants[0]?.id;
      setSelectedVariantId((prev) => prev ?? firstInStock ?? null);
    } else {
      setSelectedVariantId(null);
    }
  }, [product, variants]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [slug]);

  if (productQuery.isPending) {
    return <LoadingView label="Loading product..." />;
  }

  if (!product) {
    return <EmptyState title="Product not found" />;
  }

  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
  const displayStock = selectedVariant ? selectedVariant.stock : product.stock;
  const reviews = product.reviews ?? [];
  const canReview = reviewEligibilityQuery.data?.canReview ?? false;
  const isWishlisted = (wishlistQuery.data ?? []).some(
    (item) => item.productId === product.id,
  );
  const imageWidth = Math.max(220, viewportWidth - 32);
  const cartLine = (cartQuery.data?.items ?? []).find(
    (item) =>
      item.product.id === product.id &&
      (selectedVariant?.id ? item.variantId === selectedVariant.id : true),
  );
  async function handleBuyNow() {
    if (!product) return;
    if (!user) {
      tabNavigation.navigate("ProfileTab");
      return;
    }

    try {
      let targetCartItemId = cartLine?.id;
      if (!targetCartItemId) {
        const updatedCart = await addToCartMutation.mutateAsync({
          productId: product.id,
          variantId: selectedVariant?.id,
        });
        const matched = updatedCart.items.find(
          (item) =>
            item.product.id === product.id &&
            (selectedVariant?.id ? item.variantId === selectedVariant.id : true),
        );
        targetCartItemId = matched?.id;
      }

      stackNavigation.navigate("Checkout", {
        cartItemId: targetCartItemId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not continue to checkout";
      Alert.alert("Buy now failed", message);
    }
  }

  const renderInlineProductCard = (item: ProductListItem) => (
    <Pressable
      key={item.id}
      style={styles.inlineCard}
      onPress={() => stackNavigation.navigate("ProductDetail", { slug: item.slug })}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.inlineCardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.inlineCardImage, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>No image</Text>
        </View>
      )}
      <Text style={styles.inlineCardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.inlineCardPrice}>Rs. {Number(item.price).toFixed(2)}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {product.images?.length ? (
        <View>
          <FlatList
            data={product.images}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageCarouselContent}
            onMomentumScrollEnd={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const nextIndex = Math.round(offsetX / imageWidth);
              setActiveImageIndex(
                Math.max(0, Math.min(nextIndex, product.images.length - 1)),
              );
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.productImage, { width: imageWidth }]}
                resizeMode="contain"
              />
            )}
          />
          <Pressable
            style={styles.pdpWishlistIcon}
            onPress={() =>
              toggleWishlistMutation.mutate({
                productId: product.id,
                shouldAdd: !isWishlisted,
              })
            }
            disabled={toggleWishlistMutation.isPending}
          >
            <Ionicons
              name={isWishlisted ? "heart" : "heart-outline"}
              size={20}
              color={isWishlisted ? colors.primary : colors.text}
            />
          </Pressable>
          {product.images.length > 1 ? (
            <View style={styles.carouselDots}>
              {product.images.map((image, index) => (
                <View
                  key={image.id}
                  style={[styles.carouselDot, index === activeImageIndex && styles.carouselDotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No image available</Text>
        </View>
      )}
      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.price}>Rs. {displayPrice.toFixed(2)}</Text>
      <Text style={styles.meta}>
        Rating {rating} • {displayStock > 0 ? "In stock" : "Out of stock"}
      </Text>
      <Text style={styles.description} numberOfLines={showFullDescription ? undefined : 3}>
        {product.description || "No description available."}
      </Text>
      {product.description ? (
        <Pressable onPress={() => setShowFullDescription((prev) => !prev)} style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>{showFullDescription ? "Show less" : "See more"}</Text>
        </Pressable>
      ) : null}

      {variants.length > 0 ? (
        <View style={styles.variantSection}>
          <Text style={styles.variantHeading}>Select option</Text>
          <View style={styles.variantRow}>
            {variants.map((variant) => {
              const isActive = variant.id === selectedVariantId;
              const isDisabled = variant.stock <= 0;
              return (
                <Pressable
                  key={variant.id}
                  style={[
                    styles.variantChip,
                    isActive && styles.variantChipActive,
                    isDisabled && styles.variantChipDisabled,
                  ]}
                  onPress={() => setSelectedVariantId(variant.id)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.variantChipText,
                      isActive && styles.variantChipTextActive,
                    ]}
                  >
                    {variant.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {cartLine ? (
        <View style={styles.pdpQtyControl}>
          <Pressable
            style={styles.pdpQtyButton}
            onPress={() => {
              if (cartLine.quantity <= 1) {
                removeCartMutation.mutate(cartLine.id);
                return;
              }
              updateCartMutation.mutate({
                itemId: cartLine.id,
                quantity: cartLine.quantity - 1,
              });
            }}
          >
            <Text style={styles.pdpQtyButtonText}>-</Text>
          </Pressable>
          <Text style={styles.pdpQtyValue}>{cartLine.quantity}</Text>
          <Pressable
            style={styles.pdpQtyButton}
            onPress={() =>
              updateCartMutation.mutate({
                itemId: cartLine.id,
                quantity: cartLine.quantity + 1,
              })
            }
            disabled={displayStock <= cartLine.quantity}
          >
            <Text style={styles.pdpQtyButtonText}>+</Text>
          </Pressable>
        </View>
      ) : (
        <AppButton
          title={addToCartMutation.isPending ? "Adding..." : "Add to cart"}
          onPress={() =>
            addToCartMutation.mutate({
              productId: product.id,
              variantId: selectedVariant?.id,
            })
          }
          disabled={displayStock < 1 || addToCartMutation.isPending}
        />
      )}
      <View style={styles.buyNowWrap}>
        <AppButton
          title={addToCartMutation.isPending ? "Preparing..." : "Buy now"}
          variant="outline"
          onPress={handleBuyNow}
          disabled={displayStock < 1 || addToCartMutation.isPending}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Expected delivery</Text>
        <Text style={styles.infoText}>Estimated in 5-7 business days</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Return policy</Text>
        <Text style={styles.infoText}>Easy returns within 7 days for eligible products</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Specifications</Text>
        <Text style={styles.infoText}>Category: {product.category?.name ?? "Handmade"}</Text>
        <Text style={styles.infoText}>Stock available: {displayStock}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Sold by</Text>
        <Text style={styles.infoText}>{product.vendor?.storeName ?? "INDIASART Seller"}</Text>
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.infoTitle}>Customer reviews</Text>
        {reviews.length === 0 ? (
          <Text style={styles.infoText}>No reviews yet.</Text>
        ) : (
          reviews.slice(0, 5).map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <Text style={styles.reviewMeta}>
                {review.customer?.name ?? "Customer"} •{" "}
                {Array.from({ length: review.rating })
                  .map(() => "★")
                  .join("")}
              </Text>
              <Text style={styles.infoText}>{review.comment || "No comment provided."}</Text>
            </View>
          ))
        )}
      </View>

      {canReview ? (
        <View style={styles.reviewCard}>
          <Text style={styles.infoTitle}>Write a review</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                style={[styles.ratingChip, reviewRating === value && styles.ratingChipActive]}
                onPress={() => setReviewRating(value)}
              >
                <Text
                  style={[
                    styles.ratingChipText,
                    reviewRating === value && styles.ratingChipTextActive,
                  ]}
                >
                  {value}★
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={reviewComment}
            onChangeText={setReviewComment}
            placeholder="Share your experience (optional)"
            multiline
            style={styles.reviewInput}
          />
          <AppButton
            title="Submit review"
            loading={submitReviewMutation.isPending}
            onPress={() => submitReviewMutation.mutate()}
          />
        </View>
      ) : reviewEligibilityQuery.data?.existingReview ? (
        <View style={styles.reviewCard}>
          <Text style={styles.infoTitle}>Your review is already submitted.</Text>
        </View>
      ) : (
        <View style={styles.reviewCard}>
          <Text style={styles.infoText}>You can review this product after delivery.</Text>
        </View>
      )}

      {similarProductsQuery.data?.length ? (
        <View style={styles.reviewCard}>
          <Text style={styles.infoTitle}>Similar products</Text>
          <FlatList
            data={similarProductsQuery.data}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineCardRow}
            renderItem={({ item }) => renderInlineProductCard(item)}
          />
        </View>
      ) : similarProductsQuery.isPending ? (
        <View style={styles.reviewCard}>
          <Text style={styles.infoTitle}>Similar products</Text>
          <Text style={styles.infoText}>Loading recommendations...</Text>
        </View>
      ) : null}

      {artistProductsQuery.data?.length ? (
        <View style={styles.reviewCard}>
          <Text style={styles.infoTitle}>
            More from {product.vendor?.storeName ?? "this artist"}
          </Text>
          <FlatList
            data={artistProductsQuery.data}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineCardRow}
            renderItem={({ item }) => renderInlineProductCard(item)}
          />
        </View>
      ) : artistProductsQuery.isPending ? (
        <View style={styles.reviewCard}>
          <Text style={styles.infoTitle}>More from this artist</Text>
          <Text style={styles.infoText}>Loading artist products...</Text>
        </View>
      ) : null}
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
    gap: 10,
  },
  productImage: {
    height: 220,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  imageCarouselContent: {
    gap: 0,
  },
  carouselDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d1d5db",
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: colors.primary,
  },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: colors.mutedText,
    fontSize: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  pdpWishlistIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  price: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "700",
  },
  meta: {
    color: colors.mutedText,
  },
  description: {
    marginTop: 8,
    lineHeight: 22,
    color: colors.text,
  },
  readMoreButton: {
    alignSelf: "flex-start",
  },
  readMoreText: {
    color: colors.primary,
    fontWeight: "700",
  },
  variantSection: {
    marginTop: 4,
    gap: 8,
  },
  variantHeading: {
    color: colors.text,
    fontWeight: "700",
  },
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  variantChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  variantChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  variantChipDisabled: {
    opacity: 0.4,
  },
  variantChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  variantChipTextActive: {
    color: colors.primary,
  },
  buyNowWrap: {
    marginTop: 4,
  },
  pdpQtyControl: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  pdpQtyButton: {
    width: 48,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  pdpQtyButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginTop: -2,
  },
  pdpQtyValue: {
    minWidth: 38,
    textAlign: "center",
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  infoTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  infoText: {
    color: colors.mutedText,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 2,
  },
  reviewMeta: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 8,
  },
  ratingChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  ratingChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  ratingChipText: {
    color: colors.mutedText,
    fontWeight: "700",
  },
  ratingChipTextActive: {
    color: colors.primary,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: "top",
  },
  inlineCardRow: {
    gap: 10,
    paddingTop: 4,
  },
  inlineCard: {
    width: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 8,
    gap: 6,
  },
  inlineCardImage: {
    width: "100%",
    height: 90,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  inlineCardTitle: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
    minHeight: 34,
  },
  inlineCardPrice: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
