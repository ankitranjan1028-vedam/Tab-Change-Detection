import express from "express";
import { getWishlist, toggleWishlist } from "../controllers/wishlistController.js";
import { protect } from "../middleware/auth.js";

const WishlistRouter = express.Router();

// Get user wishlist
WishlistRouter.get("/", protect, getWishlist);
// Toggle product in wishlist
WishlistRouter.post("/toggle", protect, toggleWishlist);

export default WishlistRouter;
