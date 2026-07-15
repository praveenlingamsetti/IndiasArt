import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SearchStackParamList } from "@/navigation/AppNavigator";
import { getProducts } from "@/services/products";
import { useProductGridActions } from "@/hooks/useProductGridActions";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductGridItem } from "@/components/products/ProductGridItem";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { colors } from "@/theme/colors";
import type { ProductListItem } from "@/types/api";

type NavProp = NativeStackNavigationProp<SearchStackParamList, "SearchHome">;
let searchFeedOffset = 0;
const SEARCH_PAGE_SIZE = 20;

export function SearchScreen() {
  const navigation = useNavigation<NavProp>();
  const listRef = useRef<FlatList<ProductListItem>>(null);
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "popularity">(
    "newest",
  );

  const productsQuery = useInfiniteQuery({
    queryKey: ["search-products-infinite", query, sort, artist],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getProducts({
        search: query || undefined,
        page: pageParam,
        limit: SEARCH_PAGE_SIZE,
        sort,
        artist: artist.trim() || undefined,
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
    onAuthRequired: (action) => {
      if (action === "wishlist") {
        Alert.alert("Login required", "Please login to save products to wishlist.");
        return;
      }
      Alert.alert("Login required", "Please login to add products to cart.");
    },
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.products) ?? [],
    [productsQuery.data],
  );

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (searchFeedOffset > 0) {
          listRef.current?.scrollToOffset({ offset: searchFeedOffset, animated: false });
        }
      }, 50);

      return () => clearTimeout(timer);
    }, [products.length]),
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search products..."
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      <TextInput
        placeholder="Filter by artist (store slug)"
        value={artist}
        onChangeText={setArtist}
        autoCapitalize="none"
        style={styles.artistInput}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {[
          { key: "newest", label: "Newest" },
          { key: "price_asc", label: "Price Low-High" },
          { key: "price_desc", label: "Price High-Low" },
          { key: "popularity", label: "Popular" },
        ].map((item) => (
          <Pressable
            key={item.key}
            style={[styles.filterChip, sort === item.key && styles.filterChipActive]}
            onPress={() =>
              setSort(item.key as "newest" | "price_asc" | "price_desc" | "popularity")
            }
          >
            <Text
              style={[
                styles.filterLabel,
                sort === item.key && styles.filterLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {productsQuery.isPending ? (
        <ProductGridSkeleton />
      ) : productsQuery.isError ? (
        <ErrorState
          message={productsQuery.error instanceof Error ? productsQuery.error.message : "Search failed"}
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
            searchFeedOffset = event.nativeEvent.contentOffset.y;
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
          contentContainerStyle={styles.list}
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
          ListEmptyComponent={<EmptyState title="No matching products" subtitle="Try another keyword." />}
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  search: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    minHeight: 44,
    alignItems: "center",
  },
  artistInput: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterLabel: {
    color: colors.mutedText,
    fontWeight: "600",
  },
  filterLabelActive: {
    color: colors.primary,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  columnWrap: {
    gap: 10,
    marginBottom: 10,
  },
  footerLoading: {
    paddingVertical: 14,
    alignItems: "center",
  },
});
