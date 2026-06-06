import mongoose from "mongoose";

// one wishlist per user
import { IWishlist } from "../types/index.js";

// one wishlist per user
const WishlistSchema = new mongoose.Schema<IWishlist>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWishlist>("Wishlist", WishlistSchema);
