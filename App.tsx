import { useRef } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  type NavigationContainerRef,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/lib/query-client";
import { AppNavigator } from "@/navigation/AppNavigator";
import { AuthProvider } from "@/context/auth-context";
import { trackScreenView } from "@/lib/analytics";
import type { RootTabParamList } from "@/navigation/AppNavigator";

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootTabParamList> | null>(
    null,
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              const routeName = navigationRef.current?.getCurrentRoute()?.name;
              if (routeName) trackScreenView(routeName);
            }}
            onStateChange={() => {
              const routeName = navigationRef.current?.getCurrentRoute()?.name;
              if (routeName) trackScreenView(routeName);
            }}
          >
            <StatusBar style="dark" translucent={false} backgroundColor="#ffffff" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
