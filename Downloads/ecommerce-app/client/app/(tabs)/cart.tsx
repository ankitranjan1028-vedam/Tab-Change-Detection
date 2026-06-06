import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CartItem from "@/components/CartItem";
import Header from "@/components/Header";
import { useCart } from "@/context/CartContext";

export default function Cart() {
    const router = useRouter();
    const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();

    const shipping = 2.00;
    const total = cartTotal + shipping;

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
            <Header title="My Cart" showBack />

            {cartItems.length > 0 ? (
                <>
                    <ScrollView className="flex-1 px-4 mt-4" showsVerticalScrollIndicator={false}>
                        {cartItems.map((item, index) => (
                            <CartItem
                                key={index}
                                item={item}
                                onRemove={() => removeFromCart(item.id, item.size)}
                                onUpdateQuantity={(qty) => updateQuantity(item.id, qty, item.size)}
                            />
                        ))}
                    </ScrollView>

                    <View className="p-4 bg-white rounded-t-3xl shadow-sm">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-secondary">Subtotal</Text>
                            <Text className="text-primary font-bold">${cartTotal.toFixed(2)}</Text>
                        </View>
                        <View className="flex-row justify-between mb-4">
                            <Text className="text-secondary">Shipping</Text>
                            <Text className="text-primary font-bold">${shipping.toFixed(2)}</Text>
                        </View>
                        <View className="h-[1px] bg-border mb-4" />
                        <View className="flex-row justify-between mb-6">
                            <Text className="text-primary font-bold text-lg">Total</Text>
                            <Text className="text-primary font-bold text-lg">${total.toFixed(2)}</Text>
                        </View>

                        <TouchableOpacity className="bg-primary py-4 rounded-full items-center" onPress={() => router.push("/checkout")} >
                            <Text className="text-white font-bold text-base">Checkout</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-secondary text-lg">Your cart is empty</Text>
                    <TouchableOpacity onPress={() => router.push("/")} className="mt-4">
                        <Text className="text-primary font-bold">Start Shopping</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}
