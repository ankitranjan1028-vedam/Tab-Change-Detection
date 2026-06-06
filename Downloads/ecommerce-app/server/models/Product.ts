import mongoose, { Document, Schema } from "mongoose";

import { IProduct } from "../types/index.js";

const productSchema = new Schema<IProduct>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        comparePrice: { type: Number, min: 0 },
        images: [{ type: String }],
        sizes: [{ type: String }],
        category: { type: String, required: true, enum: ["Men", "Women", "Kids", "Shoes", "Bags", "Other"], default: "Other" },
        stock: { type: Number, required: true, default: 0, min: 0 },
        ratings: { average: { type: Number, default: 0, min: 0, max: 5 }, count: { type: Number, default: 0 } },
        isFeatured: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;
