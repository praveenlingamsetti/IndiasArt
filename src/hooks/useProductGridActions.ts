import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { addToCart, getCart, removeCartItem, updateCartItem } from "@/services/cart";
import { addWishlist, getWishlist, removeWishlist } from "@/services/wishlist";

type AuthAction = "wishlist" | "cart";

type UseProductGridActionsOptions = {
  onAuthRequired?: (action: AuthAction) => void | Promise<void>;
};

export function useProductGridActions(options?: UseProductGridActionsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const addCartMutation = useMutation({
    mutationFn: addToCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const updateCartMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeCartMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const wishlistMutation = useMutation({
    mutationFn: async ({
      productId,
      isSaved,
    }: {
      productId: string;
      isSaved: boolean;
    }) => {
      if (isSaved) return removeWishlist(productId);
      return addWishlist(productId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const cartByProductId = useMemo(() => {
    const map = new Map<string, { itemId: string; quantity: number }>();
    for (const item of cartQuery.data?.items ?? []) {
      map.set(item.product.id, { itemId: item.id, quantity: item.quantity });
    }
    return map;
  }, [cartQuery.data]);

  const wishlistSet = useMemo(
    () => new Set((wishlistQuery.data ?? []).map((item) => item.productId)),
    [wishlistQuery.data],
  );

  async function handleWishlistToggle(productId: string) {
    if (!user) {
      await options?.onAuthRequired?.("wishlist");
      return;
    }

    await wishlistMutation.mutateAsync({
      productId,
      isSaved: wishlistSet.has(productId),
    });
  }

  async function handleAdd(productId: string) {
    if (!user) {
      await options?.onAuthRequired?.("cart");
      return;
    }

    await addCartMutation.mutateAsync({ productId, quantity: 1 });
  }

  async function handleDecrease(productId: string) {
    const line = cartByProductId.get(productId);
    if (!line) return;
    if (line.quantity <= 1) {
      await removeCartMutation.mutateAsync(line.itemId);
      return;
    }

    await updateCartMutation.mutateAsync({
      itemId: line.itemId,
      quantity: line.quantity - 1,
    });
  }

  async function handleIncrease(productId: string) {
    const line = cartByProductId.get(productId);
    if (!line) {
      await handleAdd(productId);
      return;
    }

    await updateCartMutation.mutateAsync({
      itemId: line.itemId,
      quantity: line.quantity + 1,
    });
  }

  return {
    cartByProductId,
    wishlistSet,
    handleWishlistToggle,
    handleAdd,
    handleDecrease,
    handleIncrease,
  };
}
