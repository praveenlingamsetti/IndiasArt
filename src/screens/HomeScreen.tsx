import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getCategories, getProducts } from "@/services/products";
import type { HomeStackParamList } from "@/navigation/AppNavigator";
import { useProductGridActions } from "@/hooks/useProductGridActions";
import { colors } from "@/theme/colors";
import { AppButton } from "@/components/ui/AppButton";
import { ProductGridItem } from "@/components/products/ProductGridItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import type { ProductListItem } from "@/types/api";

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, "Home">;
type PriceFilter = "all" | "under500" | "500to2000" | "above2000";
type SortOption = "newest" | "price_asc" | "price_desc" | "popularity";
let homeFeedOffset = 0;
const PRODUCT_PAGE_SIZE = 20;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const listRef = useRef<FlatList<ProductListItem>>(null);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search paintings, crafts, wooden art..."
          style={styles.search}
        />
      </View>

      <View style={styles.controlsRow}>
        <Pressable style={styles.actionChip} onPress={() => setShowSortModal(true)}>
          <Text style={styles.actionChipText}>Sort</Text>
        </Pressable>
        <Pressable style={styles.actionChip} onPress={() => setShowFilterModal(true)}>
          <Text style={styles.actionChipText}>Filter</Text>
          {activeFilterCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  search: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  controlsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
  actionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionChipText: {
    fontWeight: "600",
    color: colors.text,
  },
  badge: {
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
  categoryRow: {
    gap: 8,
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
    paddingTop: 2,
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
