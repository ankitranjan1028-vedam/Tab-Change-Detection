import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS } from "@/constants";
import api from "@/constants/api";
import { Address } from "@/constants/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@clerk/clerk-expo";
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';

export default function Checkout() {
    const router = useRouter();
    const { cartTotal, cartItems, clearCart } = useCart();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const { getToken } = useAuth();
    const [showGateway, setShowGateway] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState("");

    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

    const [paymentMethod, setPaymentMethod] = useState<"cash" | "stripe">("cash");

    const shipping = 2.00;
    const tax = 0;
    const total = cartTotal + shipping + tax;

    const fetchData = async () => {
        try {
            const token = await getToken();
            const { data } = await api.get("/addresses", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const addrList = data.data;
            if (addrList.length > 0) {
                // Find default or first
                const def = addrList.find((a: Address) => a.isDefault) || addrList[0];
                setSelectedAddress(def);
            }
        } catch (error) {
            console.error("Error fetching checkout data:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load checkout information'
            });
        } finally {
            setPageLoading(false);
        }
    };

    const handleStripeCheckout = async () => {
        setLoading(true);
        try {
            const token = await getToken();

            // Creating the order
            const shippingAddressPayload = {
                street: selectedAddress!.street,
                city: selectedAddress!.city,
                state: selectedAddress!.state,
                zipCode: selectedAddress!.zipCode,
                country: selectedAddress!.country
            };

            const orderPayload = {
                shippingAddress: shippingAddressPayload,
                notes: "Placed via App",
                paymentMethod: "stripe",
            };

            const { data: orderData } = await api.post("/orders", orderPayload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!orderData.success) {
                throw new Error("Failed to create order");
            }

            const orderId = orderData.data._id;
            console.log("Created Pending Order:", orderId);

            // Initiate Stripe Checkout with Order ID
            let payload: any = {
                items: cartItems,
                shipping: shipping,
                orderId: orderId,
            }

            if (Platform.OS === 'web') {
                const origin = window.location.origin.replace(/\/$/, '');
                payload.success_url = `${origin}/orders`;
                payload.cancel_url = `${origin}/checkout`;
            }

            const { data: sessionData } = await api.post("/payments/checkout-session", payload, { headers: { Authorization: `Bearer ${token}` } });

            if (sessionData.url) {
                if (Platform.OS === 'web') {
                    window.location.href = sessionData.url;
                } else {
                    setCheckoutUrl(sessionData.url);
                    setShowGateway(true);
                }
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to create payment session'
                });
            }
        } catch (error: any) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.message || error.message || "Failed to initialize payment"
            });
        } finally {
            setLoading(false);
        }
    };

    const onNavigationStateChange = (webViewState: any) => {
        const { url } = webViewState;
        if (url && url.includes("success.com")) {
            setShowGateway(false);
            clearCart();
            router.replace("/orders");
        } else if (url && url.includes("cancel.com")) {
            setShowGateway(false);
            Toast.show({
                type: 'error',
                text1: 'Payment Cancelled',
                text2: 'You cancelled the payment'
            });
        }
    };


    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please add a shipping address'
            });
            return;
        }

        if (paymentMethod === "stripe") {
            handleStripeCheckout();
            return;
        }

        // Cash on Delivery specific flow
        setLoading(true);
        try {
            const shippingAddressPayload = {
                street: selectedAddress.street,
                city: selectedAddress.city,
                state: selectedAddress.state,
                zipCode: selectedAddress.zipCode,
                country: selectedAddress.country
            };

            const payload = {
                shippingAddress: shippingAddressPayload,
                notes: "Placed via App",
                paymentMethod: "cash",
            };

            const token = await getToken();

            const { data } = await api.post("/orders", payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (data.success) {
                await clearCart();
                Toast.show({
                    type: 'success',
                    text1: 'Order Placed',
                    text2: 'Your order has been placed successfully!'
                });
                router.replace("/orders");
            }
        } catch (error: any) {
            console.log(error)
            Toast.show({
                type: 'error',
                text1: 'Failed to Place Order',
                text2: error.response?.data?.message || "Something went wrong"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (pageLoading) {
        return (
            <SafeAreaView className="flex-1 bg-surface justify-center items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
            <Header title="Checkout" showBack />

            <ScrollView className="flex-1 px-4 mt-4">
                {/* Address Section */}
                <Text className="text-lg font-bold text-primary mb-4">Shipping Address</Text>
                {selectedAddress ? (
                    <View className="bg-white p-4 rounded-xl mb-6 shadow-sm">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-base font-bold">{selectedAddress.type}</Text>
                            <TouchableOpacity onPress={() => router.push("/addresses")}>
                                <Text className="text-accent text-sm">Change</Text>
                            </TouchableOpacity>
                        </View>
                        <Text className="text-secondary leading-5">
                            {selectedAddress.street}, {selectedAddress.city}{'\n'}
                            {selectedAddress.state} {selectedAddress.zipCode}{'\n'}
                            {selectedAddress.country}
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => router.push("/addresses")}
                        className="bg-white p-6 rounded-xl mb-6 items-center justify-center border-dashed border-2 border-gray-100"
                    >
                        <Text className="text-primary font-bold">Add Address</Text>
                    </TouchableOpacity>
                )}

                {/* Payment Section */}
                <Text className="text-lg font-bold text-primary mb-4">Payment Method</Text>

                {/* Cash on Delivery Option */}
                <TouchableOpacity
                    onPress={() => setPaymentMethod("cash")}
                    className={`bg-white p-4 rounded-xl mb-4 shadow-sm flex-row items-center border-2 ${paymentMethod === "cash" ? "border-primary" : "border-transparent"}`}
                >
                    <Ionicons name="cash-outline" size={24} color={COLORS.primary} className="mr-3" />
                    <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-primary">Cash on Delivery</Text>
                        <Text className="text-secondary text-xs mt-1">Pay when you receive the order</Text>
                    </View>
                    {paymentMethod === "cash" && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                </TouchableOpacity>

                {/* Stripe Option */}
                <TouchableOpacity
                    onPress={() => setPaymentMethod("stripe")}
                    className={`bg-white p-4 rounded-xl mb-6 shadow-sm flex-row items-center border-2 ${paymentMethod === "stripe" ? "border-primary" : "border-transparent"}`}
                >
                    <Ionicons name="card-outline" size={24} color={COLORS.primary} className="mr-3" />
                    <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-primary">Pay with Card</Text>
                        <Text className="text-secondary text-xs mt-1">Credit or Debit Card</Text>
                    </View>
                    {paymentMethod === "stripe" && (
                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                </TouchableOpacity>
            </ScrollView>

            <View className="p-4 bg-white shadow-lg border-t border-gray-100">
                {/* Order Summary */}
                <Text className="text-lg font-bold text-primary mb-4">Order Summary</Text>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-secondary">Subtotal</Text>
                    <Text className="font-bold">${cartTotal.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-secondary">Shipping</Text>
                    <Text className="font-bold">${shipping.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between mb-4">
                    <Text className="text-secondary">Tax</Text>
                    <Text className="font-bold">${tax.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between mb-6">
                    <Text className="text-xl font-bold text-primary">Total</Text>
                    <Text className="text-xl font-bold text-primary">${total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                    onPress={handlePlaceOrder}
                    disabled={loading}
                    className={`p-4 rounded-xl items-center ${loading ? 'bg-gray-400' : 'bg-primary'}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">Place Order</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Modal
                visible={showGateway}
                onDismiss={() => setShowGateway(false)}
                onRequestClose={() => setShowGateway(false)}
                animationType="slide"
                transparent={false}
            >
                <SafeAreaView className="flex-1 bg-white">
                    <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
                        <Text className="text-lg font-bold">Payment</Text>
                        <TouchableOpacity onPress={() => setShowGateway(false)}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ uri: checkoutUrl }}
                        onNavigationStateChange={onNavigationStateChange}
                        startInLoadingState={true}
                        renderLoading={() => <ActivityIndicator size="large" color={COLORS.primary} className="absolute top-1/2 left-1/2" />}
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
