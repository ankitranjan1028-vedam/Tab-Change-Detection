import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CategoryItem from "@/components/CategoryItem";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import api from "@/constants/api";
import type { Product } from "@/constants/types";
import { CATEGORIES } from "@/constants";
import { BANNERS } from "@/assets/assets";

const { width } = Dimensions.get("window");

export default function Home() {
    const router = useRouter();
    const [activeBannerIndex, setActiveBannerIndex] = useState(0);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const categories = [{ id: "all", name: "All", icon: "grid" }, ...CATEGORIES];

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data } = await api.get("/products");
            setProducts(data.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <Header title="Newever" showMenu showCart showLogo />

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {/* Banner Slider */}
                <View className="mb-6">
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        className="w-full h-48 rounded-xl"
                        onScroll={(e) => {
                            const slide = Math.ceil(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                            if (slide !== activeBannerIndex) {
                                setActiveBannerIndex(slide);
                            }
                        }}
                        scrollEventThrottle={16}
                    >
                        {BANNERS.map((banner, index) => (
                            <View key={index} className="relative w-full h-48 bg-gray-200 overflow-hidden" style={{ width: width - 32 }}>
                                <Image
                                    source={{ uri: banner.image }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                                <View className="absolute bottom-4 left-4 z-10">
                                    <Text className="text-white text-2xl font-bold">{banner.title}</Text>
                                    <Text className="text-white text-sm font-medium">{banner.subtitle}</Text>
                                    <TouchableOpacity className="mt-2 bg-white px-4 py-2 rounded-full self-start">
                                        <Text className="text-primary font-bold text-xs">Get Now</Text>
                                    </TouchableOpacity>
                                </View>
                                {/* Overlay for better text readability */}
                                <View className="absolute inset-0 bg-black/40" />
                            </View>
                        ))}
                    </ScrollView>

                    {/* Pagination Dots */}
                    <View className="flex-row justify-center mt-3 gap-2">
                        {BANNERS.map((_, index) => (
                            <View
                                key={index}
                                className={`h-2 rounded-full ${index === activeBannerIndex ? 'w-6 bg-primary' : 'w-2 bg-gray-300'}`}
                            />
                        ))}
                    </View>
                </View>

                {/* Categories */}
                <View className="mb-6">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-primary">Categories</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {categories.map((cat: any) => (
                            <CategoryItem
                                key={cat.id}
                                item={cat}
                                isSelected={false}
                                onPress={() => router.push({ pathname: "/shop", params: { category: cat.id === 'all' ? '' : cat.name } })}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Popular Products */}
                <View className="mb-8">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-primary">Popular</Text>
                        <TouchableOpacity onPress={() => router.push("/shop")}>
                            <Text className="text-secondary text-sm">See All</Text>
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" />
                    ) : (
                        <View className="flex-row flex-wrap justify-between">
                            {products.slice(0, 4).map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </View>
                    )}
                </View>

                {/* Newsletter CTA */}
                <View className="bg-gray-100 p-6 rounded-2xl mb-20 items-center">
                    <Text className="text-2xl font-bold text-primary mb-2 text-center">Join the Revolution</Text>
                    <Text className="text-secondary text-center mb-4">Subscribe to our newsletter and get 10% off your first purchase.</Text>
                    <TouchableOpacity className="bg-primary w-4/5 py-3 rounded-full items-center">
                        <Text className="text-white font-medium text-base">Subscribe Now</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
