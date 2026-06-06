import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { COLORS, CATEGORIES } from "@/constants";
import api from "@/constants/api";
import type { Product } from "@/constants/types";

export default function Shop() {
    const params = useLocalSearchParams();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("-createdAt");
    const [category, setCategory] = useState(params.category || "");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [showFilters, setShowFilters] = useState(false);

    const fetchProducts = async (pageNumber = 1) => {
        if (pageNumber === 1) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const queryParams: any = { sort, page: pageNumber, limit: 10 };
            if (category && category !== "All") queryParams.category = category;
            if (minPrice) queryParams.minPrice = minPrice;
            if (maxPrice) queryParams.maxPrice = maxPrice;
            if (search) queryParams.search = search;

            const { data } = await api.get("/products", { params: queryParams });

            if (pageNumber === 1) {
                setProducts(data.data);
            } else {
                setProducts(prev => [...prev, ...data.data]);
            }

            setHasMore(data.pagination.page < data.pagination.pages);
            setPage(pageNumber);

        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleSearch = () => {
        fetchProducts(1);
    };

    const loadMore = () => {
        if (!loadingMore && !loading && hasMore) {
            fetchProducts(page + 1);
        }
    };

    const clearFilters = () => {
        setCategory("");
        setMinPrice("");
        setMaxPrice("");
        setSort("-createdAt");
        setSearch("");
    };

    const allCategories = [{ id: "all", name: "All" }, ...CATEGORIES];

    useEffect(() => {
        fetchProducts(1);
    }, [sort, category, minPrice, maxPrice]);

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
            <Header title="Shop" showBack showCart />

            <View className="flex-row gap-2 mb-3 mx-4 my-2">
                <View className="flex-1 flex-row items-center bg-white  rounded-xl border border-gray-100">
                    <Ionicons name="search" className="ml-4" size={20} color={COLORS.secondary} />
                    <TextInput
                        className="flex-1 ml-2 text-primary px-4 py-3"
                        placeholder="Search products..."
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>
                <TouchableOpacity
                    className="bg-gray-800 w-12 h-12 items-center justify-center rounded-xl"
                    onPress={() => setShowFilters(true)}
                >
                    <Ionicons name="options-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>


            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    renderItem={({ item }) => (
                        <ProductCard product={item} />
                    )}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <View className="py-4">
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        !loading && (
                            <View className="flex-1 items-center justify-center py-20">
                                <Text className="text-secondary">No products found</Text>
                            </View>
                        )
                    }
                />
            )}

            {/* Filter Modal */}
            <Modal
                visible={showFilters}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilters(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 h-[80%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-primary">Filters</Text>
                            <TouchableOpacity onPress={() => setShowFilters(false)}>
                                <Ionicons name="close" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Sort */}
                            <Text className="font-bold text-primary mb-3">Sort By</Text>
                            <View className="flex-row flex-wrap gap-2 mb-6">
                                {[
                                    { label: "Newest", value: "-createdAt" },
                                    { label: "Price: Low to High", value: "price" },
                                    { label: "Price: High to Low", value: "-price" },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => setSort(option.value)}
                                        className={`px-4 py-2 rounded-full border ${sort === option.value ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
                                    >
                                        <Text className={sort === option.value ? "text-white" : "text-primary"}>{option.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Category */}
                            <Text className="font-bold text-primary mb-3">Category</Text>
                            <View className="flex-row flex-wrap gap-2 mb-6">
                                {allCategories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => setCategory(cat.name === "All" ? "" : cat.name)}
                                        className={`px-4 py-2 rounded-full border ${(category === cat.name || (cat.name === 'All' && category === '')) ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
                                    >
                                        <Text className={(category === cat.name || (cat.name === 'All' && category === '')) ? "text-white" : "text-primary"}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Price Range */}
                            <Text className="font-bold text-primary mb-3">Price Range</Text>
                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1 bg-surface rounded-xl">
                                    <TextInput
                                        placeholder="Min"
                                        keyboardType="numeric"
                                        value={minPrice}
                                        onChangeText={setMinPrice}
                                        className="px-4 py-3"
                                    />
                                </View>
                                <View className="flex-1 bg-surface rounded-xl">
                                    <TextInput
                                        placeholder="Max"
                                        keyboardType="numeric"
                                        value={maxPrice}
                                        onChangeText={setMaxPrice}
                                        className="px-4 py-3"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View className="flex-row gap-4 pt-4 border-t border-gray-100">
                            <TouchableOpacity
                                className="flex-1 py-4 items-center rounded-full border border-gray-300"
                                onPress={clearFilters}
                            >
                                <Text className="font-bold text-primary">Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-primary py-4 items-center rounded-full"
                                onPress={() => {
                                    fetchProducts(1);
                                    setShowFilters(false);
                                }}
                            >
                                <Text className="font-bold text-white">Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
