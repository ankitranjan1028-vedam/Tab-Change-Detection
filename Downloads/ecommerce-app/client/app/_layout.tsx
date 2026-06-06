import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ClerkProvider } from "@clerk/clerk-expo";

import Toast from 'react-native-toast-message';
import "@/global.css";

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ClerkProvider tokenCache={tokenCache} publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
                <CartProvider>
                    <WishlistProvider>
                        <Stack screenOptions={{ headerShown: false }} />
                        <Toast />
                    </WishlistProvider>
                </CartProvider>
            </ClerkProvider>
        </GestureHandlerRootView>
    );
}
