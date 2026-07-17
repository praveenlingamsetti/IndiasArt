import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SearchStackParamList } from "@/navigation/AppNavigator";
import { getArtistOptions, getPopularSearchTerms, getProducts } from "@/services/products";
import { useProductGridActions } from "@/hooks/useProductGridActions";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductGridItem } from "@/components/products/ProductGridItem";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { AppTopHeader } from "@/components/ui/AppTopHeader";
import { colors } from "@/theme/colors";
import type { ProductListItem } from "@/types/api";

type NavProp = NativeStackNavigationProp<SearchStackParamList, "SearchHome">;
type SuggestionItem = {
  term: string;
  source: "recent" | "popular";
};

let searchFeedOffset = 0;
const SEARCH_PAGE_SIZE = 20;
const SEARCH_RECENT_KEY = "search-recent-terms";
const POPULAR_SEARCH_TERMS = [
  "wall painting",
  "wooden decor",
  "terracotta",
  "crochet gifts",
  "handmade vase",
];

export function SearchScreen() {
  const navigation = useNavigation<NavProp>();
  const listRef = useRef<FlatList<ProductListItem>>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [artist, setArtist] = useState("");
  const [recentTerms, setRecentTerms] = useState<string[]>([]);
  const artistQuery = useQuery({
    queryKey: ["artist-options"],
    queryFn: getArtistOptions,
  });
  const popularSearchQuery = useQuery({
    queryKey: ["popular-search-terms"],
    queryFn: getPopularSearchTerms,
    staleTime: 10 * 60 * 1000,
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ["search-products-infinite", query, artist],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getProducts({
        search: query || undefined,
        page: pageParam,
        limit: SEARCH_PAGE_SIZE,
        sort: "newest",
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
  const selectedArtistName = useMemo(() => {
    if (!artist) return null;
    return (artistQuery.data ?? []).find((item) => item.slug === artist)?.name ?? artist;
  }, [artist, artistQuery.data]);
  const popularTerms = useMemo(() => {
    const apiTerms = popularSearchQuery.data?.terms?.filter(Boolean) ?? [];
    return apiTerms.length > 0 ? apiTerms : POPULAR_SEARCH_TERMS;
  }, [popularSearchQuery.data?.terms]);
  const suggestionItems = useMemo<SuggestionItem[]>(() => {
    const base: SuggestionItem[] = [];
    const seen = new Set<string>();
    const q = query.trim().toLowerCase();

    const append = (term: string, source: "recent" | "popular") => {
      const key = term.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      if (q && !key.includes(q)) return;
      seen.add(key);
      base.push({ term, source });
    };

    recentTerms.forEach((term) => append(term, "recent"));
    popularTerms.forEach((term) => append(term, "popular"));
    return base.slice(0, 10);
  }, [popularTerms, query, recentTerms]);
  useEffect(() => {
    AsyncStorage.getItem(SEARCH_RECENT_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setRecentTerms(parsed.slice(0, 8));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const value = query.trim().toLowerCase();
    if (value.length < 2) return;
    const timer = setTimeout(() => {
      setRecentTerms((prev) => {
        const next = [value, ...prev.filter((item) => item !== value)].slice(0, 8);
        AsyncStorage.setItem(SEARCH_RECENT_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [query]);

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
      <AppTopHeader
        searchValue={query}
        onSearchChange={setQuery}
        placeholder="Search products..."
        onSearchExpandedChange={setSearchOpen}
      />
      {searchOpen && suggestionItems.length > 0 ? (
        <View style={styles.suggestionDropdown}>
          <View style={styles.suggestionHeaderRow}>
            <Text style={styles.suggestionHeaderText}>Suggestions</Text>
            {recentTerms.length > 0 ? (
              <Pressable
                onPress={() => {
                  setRecentTerms([]);
                  AsyncStorage.removeItem(SEARCH_RECENT_KEY).catch(() => undefined);
                }}
              >
                <Text style={styles.clearText}>Clear recent</Text>
              </Pressable>
            ) : null}
          </View>
          <FlatList
            data={suggestionItems}
            keyExtractor={(item) => `${item.source}-${item.term}`}
            style={styles.suggestionList}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable style={styles.suggestionRow} onPress={() => setQuery(item.term)}>
                <View style={styles.suggestionIconWrap}>
                  <Text style={styles.suggestionIcon}>{item.source === "recent" ? "R" : "P"}</Text>
                </View>
                <Text numberOfLines={1} style={styles.suggestionText}>
                  {item.term}
                </Text>
                <Text style={styles.suggestionSourceText}>
                  {item.source === "recent" ? "Recent" : "Popular"}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

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
          ListHeaderComponent={
            <View style={styles.artistSection}>
              <View style={styles.artistSectionHeader}>
                <Text style={styles.artistSectionTitle}>Artists</Text>
                {selectedArtistName ? (
                  <Pressable style={styles.activeArtistPill} onPress={() => setArtist("")}>
                    <Text style={styles.activeArtistPillText}>{selectedArtistName}</Text>
                    <Text style={styles.activeArtistPillClose}>x</Text>
                  </Pressable>
                ) : null}
              </View>
              <FlatList
                horizontal
                data={[
                  { slug: "", name: "All Artists" },
                  ...(artistQuery.data ?? []),
                ]}
                keyExtractor={(item) => item.slug || "all-artists"}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.artistList}
                renderItem={({ item }) => {
                  const active = item.slug ? item.slug === artist : artist === "";
                  return (
                    <Pressable
                      style={[styles.artistCard, active && styles.artistCardActive]}
                      onPress={() => setArtist(item.slug)}
                    >
                      <View style={[styles.artistAvatar, active && styles.artistAvatarActive]}>
                        <Text style={[styles.artistAvatarText, active && styles.artistAvatarTextActive]}>
                          {item.name
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.artistName, active && styles.artistNameActive]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                }}
              />
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
  suggestionDropdown: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    overflow: "hidden",
  },
  suggestionList: {
    maxHeight: 190,
  },
  suggestionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  clearText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    minHeight: 42,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionIconWrap: {
    width: 20,
    alignItems: "center",
  },
  suggestionIcon: {
    fontSize: 12,
    color: colors.mutedText,
  },
  suggestionText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionSourceText: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "600",
  },
  artistSection: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    gap: 8,
  },
  artistSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  artistSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  activeArtistPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 180,
  },
  activeArtistPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  activeArtistPillClose: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  artistList: {
    gap: 10,
  },
  artistCard: {
    width: 94,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 8,
    alignItems: "center",
    gap: 6,
  },
  artistCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  artistAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  artistAvatarActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  artistAvatarText: {
    fontWeight: "800",
    fontSize: 11,
    color: colors.mutedText,
  },
  artistAvatarTextActive: {
    color: colors.primary,
  },
  artistName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedText,
    textAlign: "center",
  },
  artistNameActive: {
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
