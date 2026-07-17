import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { getCategories, getProducts } from "@/services/products";
import type { HomeStackParamList } from "@/navigation/AppNavigator";
import { useProductGridActions } from "@/hooks/useProductGridActions";
import { colors } from "@/theme/colors";
import { AppButton } from "@/components/ui/AppButton";
import { ProductGridItem } from "@/components/products/ProductGridItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import type { ProductListItem } from "@/types/api";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "Home">;
type PriceFilter = "all" | "under500" | "500to2000" | "above2000";
type SortOption = "newest" | "price_asc" | "price_desc" | "popularity";
type CategoryTabItem = {
  id: string;
  slug?: string;
  name: string;
  imageUrl?: string;
};
let homeFeedOffset = 0;
const PRODUCT_PAGE_SIZE = 20;
const CATEGORY_ITEM_WIDTH = 74;
const CATEGORY_SNAP_INTERVAL = CATEGORY_ITEM_WIDTH + 6;
const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  price_asc: "Price Low-High",
  price_desc: "Price High-Low",
  popularity: "Popularity",
};

function getCategoryIcon(slugOrName: string): keyof typeof Ionicons.glyphMap {
  const value = slugOrName.toLowerCase();
  if (value.includes("paint")) return "color-palette-outline";
  if (value.includes("wood")) return "leaf-outline";
  if (value.includes("crochet") || value.includes("textile")) return "shirt-outline";
  if (value.includes("jewel")) return "diamond-outline";
  if (value.includes("pottery") || value.includes("clay")) return "water-outline";
  if (value.includes("metal")) return "hammer-outline";
  if (value.includes("home")) return "home-outline";
  return "sparkles-outline";
}

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const listRef = useRef<FlatList<ProductListItem>>(null);
  const categoryListRef = useRef<FlatList<CategoryTabItem>>(null);
  const discoveryAnim = useRef(new Animated.Value(0)).current;
  const activeCategoryPulse = useRef(new Animated.Value(1)).current;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [sort, setSort] = useState<SortOption>("newest");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [artist, setArtist] = useState("");
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const priceRange = {
    all: { minPrice: undefined, maxPrice: undefined },
    under500: { minPrice: undefined, maxPrice: 500 },
    "500to2000": { minPrice: 500, maxPrice: 2000 },
    above2000: { minPrice: 2000, maxPrice: undefined },
  }[priceFilter];

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const categories = categoriesQuery.data ?? [];
  const categoryThumbQueries = useQueries({
    queries: categories.map((item) => ({
      queryKey: ["category-thumb", item.slug],
      queryFn: () => getProducts({ category: item.slug, page: 1, limit: 1, sort: "popularity" }),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const curatedQueries = useQueries({
    queries: [
      {
        queryKey: ["home-curated", "popular"],
        queryFn: () => getProducts({ page: 1, limit: 8, sort: "popularity" }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["home-curated", "newest"],
        queryFn: () => getProducts({ page: 1, limit: 8, sort: "newest" }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["home-curated", "under999"],
        queryFn: () => getProducts({ page: 1, limit: 8, sort: "popularity", maxPrice: 999 }),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ["products-infinite", search, category, sort, priceFilter, artist],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getProducts({
        page: pageParam,
        limit: PRODUCT_PAGE_SIZE,
        search: search || undefined,
        category,
        artist: artist.trim() || undefined,
        sort,
        minPrice: priceRange.minPrice,
        maxPrice: priceRange.maxPrice,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const {
    cartByProductId,
    wishlistSet,
    handleWishlistToggle,
    handleAdd,
    handleDecrease,
    handleIncrease,
  } = useProductGridActions({
    onAuthRequired: () => {
      navigation.getParent()?.navigate("ProfileTab");
    },
  });

  const activeFilterCount =
    Number(priceFilter !== "all") + Number(Boolean(category)) + Number(Boolean(artist.trim()));
  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.products) ?? [],
    [productsQuery.data],
  );
  const categoryThumbMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((item, index) => {
      const imageUrl = categoryThumbQueries[index]?.data?.products?.[0]?.imageUrl;
      if (imageUrl) {
        map.set(item.slug, imageUrl);
      }
    });
    return map;
  }, [categories, categoryThumbQueries]);
  const categoryTabs = useMemo<CategoryTabItem[]>(
    () => [
      { id: "all", name: "All" },
      ...categories.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        imageUrl: categoryThumbMap.get(item.slug),
      })),
    ],
    [categories, categoryThumbMap],
  );
  const [popularProducts, newestProducts, under999Products] = curatedQueries.map(
    (query) => query.data?.products ?? [],
  );
  const showDiscoverySections =
    !search.trim() &&
    !category &&
    !artist.trim() &&
    priceFilter === "all" &&
    sort === "newest";

  const selectCategory = useCallback((slug: string | undefined, index: number) => {
    setCategory(slug);
    categoryListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (homeFeedOffset > 0) {
          listRef.current?.scrollToOffset({ offset: homeFeedOffset, animated: false });
        }
      }, 50);

      return () => clearTimeout(timer);
    }, [products.length]),
  );
  useEffect(() => {
    if (!showDiscoverySections) {
      discoveryAnim.setValue(0);
      return;
    }
    Animated.timing(discoveryAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [discoveryAnim, showDiscoverySections]);
  useEffect(() => {
    const activeIndex = categoryTabs.findIndex((item) =>
      item.slug ? item.slug === category : !category,
    );
    if (activeIndex < 0) return;
    const timer = setTimeout(() => {
      categoryListRef.current?.scrollToIndex({
        index: activeIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [category, categoryTabs]);
  useEffect(() => {
    activeCategoryPulse.setValue(1);
    Animated.sequence([
      Animated.spring(activeCategoryPulse, {
        toValue: 1.08,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(activeCategoryPulse, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeCategoryPulse, category]);

  return (
    <View style={styles.container}>
      <AppTopHeader
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search paintings, crafts, wooden art..."
      />
      <View style={styles.hero}>
        <FlatList
          ref={categoryListRef}
          horizontal
          data={categoryTabs}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickCategoryRow}
          snapToInterval={CATEGORY_SNAP_INTERVAL}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: CATEGORY_SNAP_INTERVAL,
            offset: CATEGORY_SNAP_INTERVAL * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            requestAnimationFrame(() => {
              categoryListRef.current?.scrollToOffset({
                offset: info.index * CATEGORY_SNAP_INTERVAL,
                animated: true,
              });
            });
          }}
          renderItem={({ item, index }) => {
            const isAll = !item.slug;
            const isActive = isAll ? !category : category === item.slug;
            return (
              <Pressable
                style={[
                  styles.iconCategoryItem,
                  isActive && styles.iconCategoryItemActive,
                  index !== categoryTabs.length - 1 && styles.iconCategorySpacer,
                ]}
                onPress={() => selectCategory(item.slug, index)}
              >
                <Animated.View
                  style={[
                    styles.iconBubble,
                    isActive && styles.iconBubbleActive,
                    isActive && { transform: [{ scale: activeCategoryPulse }] },
                  ]}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.iconThumb} resizeMode="cover" />
                  ) : isAll ? (
                    <Ionicons
                      name="apps-outline"
                      size={18}
                      color={isActive ? colors.primary : colors.mutedText}
                    />
                  ) : (
                    <Ionicons
                      name={getCategoryIcon(`${item.slug}-${item.name}`)}
                      size={18}
                      color={isActive ? colors.primary : colors.mutedText}
                    />
                  )}
                </Animated.View>
                <Text style={[styles.iconCategoryText, isActive && styles.iconCategoryTextActive]} numberOfLines={1}>
                  {item.name}
                </Text>
                {isActive ? <View style={styles.iconCategoryIndicator} /> : null}
              </Pressable>
            );
          }}
        />
      </View>

      {productsQuery.isPending ? (
        <ProductGridSkeleton />
      ) : productsQuery.isError ? (
        <ErrorState
          message={productsQuery.error instanceof Error ? productsQuery.error.message : "Failed to load products."}
          onRetry={() => productsQuery.refetch()}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrap}
          onScroll={(event) => {
            homeFeedOffset = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onEndReachedThreshold={0.35}
          onEndReached={() => {
            if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
              productsQuery.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isRefetching}
              onRefresh={() => productsQuery.refetch()}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeaderWrap}>
              <View style={styles.controlsRow}>
                <Pressable style={styles.actionChip} onPress={() => setShowSortModal(true)}>
                  <View style={styles.actionChipTopRow}>
                    <Ionicons name="swap-vertical-outline" size={14} color={colors.primary} />
                    <Text style={styles.actionChipTitle}>Sort</Text>
                  </View>
                  <Text style={styles.actionChipValue}>{SORT_LABELS[sort]}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.mutedText} />
                </Pressable>
                <Pressable style={styles.actionChip} onPress={() => setShowFilterModal(true)}>
                  <View style={styles.actionChipTopRow}>
                    <Ionicons name="options-outline" size={14} color={colors.primary} />
                    <Text style={styles.actionChipTitle}>Filter</Text>
                  </View>
                  <Text style={styles.actionChipValue}>
                    {activeFilterCount > 0 ? `${activeFilterCount} applied` : "Add filters"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.mutedText} />
                  {activeFilterCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{activeFilterCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>

              {showDiscoverySections ? (
                <Animated.View
                  style={[
                    styles.discoveryWrap,
                    {
                      opacity: discoveryAnim,
                      transform: [
                        {
                          translateY: discoveryAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Pressable style={styles.featuredBanner} onPress={() => setSort("popularity")}>
                    <View style={styles.featuredBannerTextWrap}>
                      <Text style={styles.featuredEyebrow}>CURATED COLLECTION</Text>
                      <Text style={styles.featuredTitle}>Handpicked Craft Stories</Text>
                      <Text style={styles.featuredSubTitle}>
                        Explore trending handmade pieces from Indian artists.
                      </Text>
                    </View>
                    <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
                  </Pressable>

                  {[
                    { title: "Trending now", items: popularProducts },
                    { title: "New arrivals", items: newestProducts },
                    { title: "Under Rs.999", items: under999Products },
                  ].map((section) =>
                    section.items.length > 0 ? (
                      <View key={section.title} style={styles.discoverySection}>
                        <Text style={styles.discoverySectionTitle}>{section.title}</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.discoveryRow}
                        >
                          {section.items.map((item) => (
                            <Pressable
                              key={`${section.title}-${item.id}`}
                              style={({ pressed }) => [
                                styles.discoveryCard,
                                pressed && styles.discoveryCardPressed,
                              ]}
                              onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
                            >
                              {item.imageUrl ? (
                                <Image
                                  source={{ uri: item.imageUrl }}
                                  style={styles.discoveryCardImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.discoveryCardImageFallback}>
                                  <Ionicons
                                    name="image-outline"
                                    size={16}
                                    color={colors.mutedText}
                                  />
                                </View>
                              )}
                              <Text numberOfLines={2} style={styles.discoveryCardTitle}>
                                {item.title}
                              </Text>
                              <Text style={styles.discoveryCardPrice}>Rs. {item.price}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null,
                  )}
                </Animated.View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <ProductGridItem
              item={item}
              isWishlisted={wishlistSet.has(item.id)}
              quantityInCart={cartByProductId.get(item.id)?.quantity}
              onPressProduct={() => navigation.navigate("ProductDetail", { slug: item.slug })}
              onToggleWishlist={() => handleWishlistToggle(item.id)}
              onAdd={() => handleAdd(item.id)}
              onIncrease={() => handleIncrease(item.id)}
              onDecrease={() => handleDecrease(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No products found"
              subtitle="Try another category or keyword."
              actionLabel="Clear filters"
              onAction={() => {
                setSearch("");
                setCategory(undefined);
                setSort("newest");
                setPriceFilter("all");
                setArtist("");
              }}
            />
          }
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSortModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort by</Text>
            {[
              { key: "newest", label: "Newest" },
              { key: "price_asc", label: "Price: Low to High" },
              { key: "price_desc", label: "Price: High to Low" },
              { key: "popularity", label: "Popularity" },
            ].map((option) => (
              <Pressable
                key={option.key}
                onPress={() => {
                  setSort(option.key as SortOption);
                  setShowSortModal(false);
                }}
                style={[
                  styles.modalOption,
                  sort === option.key && styles.modalOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    sort === option.key && styles.modalOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilterModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filters</Text>

            <Text style={styles.filterTitle}>Category</Text>
            <View style={styles.wrapRow}>
              <Pressable
                style={[styles.categoryChip, !category && styles.categoryChipActive]}
                onPress={() => setCategory(undefined)}
              >
                <Text
                  style={[styles.categoryLabel, !category && styles.categoryLabelActive]}
                >
                  All
                </Text>
              </Pressable>
              {(categoriesQuery.data ?? []).map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.categoryChip,
                    category === item.slug && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(item.slug)}
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      category === item.slug && styles.categoryLabelActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterTitle}>Price range</Text>
            <View style={styles.wrapRow}>
              {[
                { key: "all", label: "All" },
                { key: "under500", label: "Under Rs.500" },
                { key: "500to2000", label: "Rs.500-2000" },
                { key: "above2000", label: "Above Rs.2000" },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  style={[
                    styles.categoryChip,
                    priceFilter === item.key && styles.categoryChipActive,
                  ]}
                  onPress={() => setPriceFilter(item.key as PriceFilter)}
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      priceFilter === item.key && styles.categoryLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterTitle}>Artist (store slug)</Text>
            <TextInput
              value={artist}
              onChangeText={setArtist}
              placeholder="e.g. naa-kalaa"
              autoCapitalize="none"
              style={styles.artistInput}
            />

            <View style={styles.modalActions}>
              <AppButton
                title="Clear"
                variant="outline"
                onPress={() => {
                  setCategory(undefined);
                  setPriceFilter("all");
                  setArtist("");
                }}
              />
              <AppButton
                title="Apply"
                onPress={() => setShowFilterModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    backgroundColor: colors.primarySoft,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickCategoryRow: {
    paddingHorizontal: 16,
    alignItems: "center",
    minHeight: 60,
  },
  iconCategorySpacer: {
    marginRight: 6,
  },
  iconCategoryItem: {
    width: 74,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingTop: 2,
    paddingBottom: 6,
  },
  iconCategoryItemActive: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
    overflow: "hidden",
  },
  iconThumb: {
    width: "100%",
    height: "100%",
  },
  iconBubbleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  iconCategoryText: {
    color: colors.mutedText,
    fontWeight: "600",
    fontSize: 10,
    textAlign: "center",
    maxWidth: 70,
  },
  iconCategoryTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  iconCategoryIndicator: {
    position: "absolute",
    bottom: 0,
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  listHeaderWrap: {
    gap: 8,
    marginBottom: 8,
  },
  controlsRow: {
    paddingHorizontal: 6,
    paddingTop: 4,
    flexDirection: "row",
    gap: 10,
  },
  actionChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionChipTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionChipTitle: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
  },
  actionChipValue: {
    fontWeight: "600",
    color: colors.text,
    fontSize: 13,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  categoryLabel: {
    color: colors.mutedText,
    fontWeight: "600",
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 4,
  },
  discoveryWrap: {
    gap: 12,
    marginBottom: 12,
  },
  featuredBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  featuredBannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  featuredEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: colors.primary,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  featuredSubTitle: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 18,
  },
  discoverySection: {
    gap: 8,
  },
  discoverySectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    paddingHorizontal: 2,
  },
  discoveryRow: {
    gap: 10,
  },
  discoveryCard: {
    width: 148,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 8,
    gap: 6,
  },
  discoveryCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  discoveryCardImage: {
    width: "100%",
    height: 110,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  discoveryCardImageFallback: {
    width: "100%",
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    minHeight: 34,
  },
  discoveryCardPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  columnWrap: {
    gap: 10,
    marginBottom: 10,
  },
  footerLoading: {
    paddingVertical: 14,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  filterTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  artistInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
});
