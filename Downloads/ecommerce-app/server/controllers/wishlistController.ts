import Wishlist from "../models/Wishlist.js";
import { Request, Response } from "express";

// Get user wishlist
// GET /api/wishlist
export const getWishlist = async (req: Request, res: Response) => {
    try {
        let wishlist = await Wishlist.findOne({ user: req.user._id }).populate("products");

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        return res.json({ success: true, data: wishlist.products });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle product in wishlist
// POST /api/wishlist/toggle
export const toggleWishlist = async (req: Request, res: Response) => {
    try {
        const { productId } = req.body;

        let wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            wishlist = await Wishlist.create({ user: req.user._id, products: [] });
        }

        const index = wishlist.products.indexOf(productId);

        if (index > -1) {
            // Remove
            wishlist.products.splice(index, 1);
        } else {
            // Add
            wishlist.products.push(productId);
        }

        await wishlist.save();
        await wishlist.populate("products");

        res.json({ success: true, data: wishlist.products });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
