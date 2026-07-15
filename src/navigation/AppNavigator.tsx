import { ActivityIndicator, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/auth-context";
import { getCart } from "@/services/cart";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProductDetailScreen } from "@/screens/ProductDetailScreen";
import { CartScreen } from "@/screens/CartScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { OrderDetailScreen } from "@/screens/OrderDetailScreen";
import { CheckoutScreen } from "@/screens/CheckoutScreen";
import { AddressesScreen } from "@/screens/AddressesScreen";
import { AddressFormScreen } from "@/screens/AddressFormScreen";
import { WishlistScreen } from "@/screens/WishlistScreen";
import { SupportScreen } from "@/screens/SupportScreen";
import { colors } from "@/theme/colors";

export type HomeStackParamList = {
  Home: undefined;
  ProductDetail: { slug: string };
  Checkout: { cartItemId?: string } | undefined;
  Wishlist: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Addresses: undefined;
  AddressForm: { addressId?: string } | undefined;
  Support: undefined;
  Wishlist: undefined;
};

export type RootTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

export type OrdersStackParamList = {
  OrdersHome: undefined;
  OrderDetail: { orderId: string };
};

export type SearchStackParamList = {
  SearchHome: undefined;
  ProductDetail: { slug: string };
};

export type CartStackParamList = {
  CartHome: undefined;
  Checkout: { cartItemId?: string } | undefined;
  AddressForm: { addressId?: string } | undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();

function ShopStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerTitle: "INDIASART",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
        statusBarStyle: "dark",
        statusBarTranslucent: false,
      }}
    >
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "INDIASART" }}
      />
      <HomeStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Product" }}
      />
      <HomeStack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: "Checkout" }}
      />
      <HomeStack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: "Wishlist" }}
      />
    </HomeStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerTitle: "INDIASART",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
        statusBarStyle: "dark",
        statusBarTranslucent: false,
      }}
    >
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: "Account" }}
      />
      <ProfileStack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: "Addresses" }}
      />
      <ProfileStack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={{ title: "Address" }}
      />
      <ProfileStack.Screen
        name="Support"
        component={SupportScreen}
        options={{ title: "Support" }}
      />
      <ProfileStack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: "Wishlist" }}
      />
    </ProfileStack.Navigator>
  );
}

function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator
      screenOptions={{
        headerTitle: "INDIASART",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
        statusBarStyle: "dark",
        statusBarTranslucent: false,
      }}
    >
      <OrdersStack.Screen
        name="OrdersHome"
        component={OrdersScreen}
        options={{ title: "Orders" }}
      />
      <OrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: "Order details" }}
      />
    </OrdersStack.Navigator>
  );
}

function SearchStackNavigator() {
  return (
    <SearchStack.Navigator
      screenOptions={{
        headerTitle: "INDIASART",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
        statusBarStyle: "dark",
        statusBarTranslucent: false,
      }}
    >
      <SearchStack.Screen
        name="SearchHome"
        component={SearchScreen}
        options={{ title: "Search" }}
      />
      <SearchStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Product" }}
      />
    </SearchStack.Navigator>
  );
}

function CartStackNavigator() {
  return (
    <CartStack.Navigator
      screenOptions={{
        headerTitle: "INDIASART",
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
        statusBarStyle: "dark",
        statusBarTranslucent: false,
      }}
    >
      <CartStack.Screen
        name="CartHome"
        component={CartScreen}
        options={{ title: "INDIASART" }}
      />
      <CartStack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: "INDIASART" }}
      />
      <CartStack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={{ title: "Address" }}
      />
    </CartStack.Navigator>
  );
}

function AuthLoading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export function AppNavigator() {
  const { user, isLoading } = useAuth();
  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: Boolean(user),
  });
  const cartCount = cartQuery.data?.itemCount ?? 0;

  if (isLoading) {
    return <AuthLoading />;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarIcon: ({ color, size }) => {
          const iconName: Record<string, keyof typeof Ionicons.glyphMap> = {
            HomeTab: "home-outline",
            SearchTab: "search-outline",
            CartTab: "cart-outline",
            OrdersTab: "receipt-outline",
            ProfileTab: "person-outline",
          };
          return <Ionicons name={iconName[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={ShopStackNavigator}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStackNavigator}
        options={{ title: "Search" }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStackNavigator}
        options={{
          title: "Cart",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      {user ? (
        <>
          <Tab.Screen
            name="OrdersTab"
            component={OrdersStackNavigator}
            options={{ title: "Orders" }}
          />
          <Tab.Screen
            name="ProfileTab"
            component={ProfileStackNavigator}
            options={{ title: "Account" }}
          />
        </>
      ) : (
        <>
          <Tab.Screen name="OrdersTab" component={LoginScreen} options={{ title: "Orders" }} />
          <Tab.Screen
            name="ProfileTab"
            component={LoginScreen}
            options={{ title: "Account" }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}
