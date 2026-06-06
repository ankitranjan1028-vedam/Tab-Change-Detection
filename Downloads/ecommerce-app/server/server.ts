import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import ProductRouter from "./routes/productsRoutes.js";
import CartRouter from "./routes/cartRoutes.js";
import OrderRouter from "./routes/ordersRoutes.js";
import AddressRouter from "./routes/addressRoutes.js";
import WishlistRouter from "./routes/wishlistRoutes.js";
import AdminRouter from "./routes/adminRoutes.js";
import makeAdmin from "./scripts/makeAdmin.js";
import { clerkWebhook } from "./controllers/webhooks.js";
import { handleStripeWebhook } from "./controllers/paymentController.js";
import paymentRouter from "./routes/paymentRoute.js";
import { seedProducts } from "./scripts/seedProducts.js";

const app = express();

// Connect to MongoDB
await connectDB();

app.post("/api/clerk", express.raw({ type: "application/json" }), clerkWebhook);

// Middleware
app.use(cors());

// Stripe Webhook
process.env.STRIPE_SECRET_KEY && app.post("/api/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

app.use(express.json());
app.use(clerkMiddleware());

// Routes
app.get("/", (req, res) => {
    res.send("Server is running");
});
app.use("/api/products", ProductRouter);
app.use("/api/cart", CartRouter);
app.use("/api/orders", OrderRouter);
app.use("/api/addresses", AddressRouter);
app.use("/api/wishlist", WishlistRouter);
app.use("/api/admin", AdminRouter);
process.env.STRIPE_SECRET_KEY && app.use("/api/payments", paymentRouter);

const PORT = process.env.PORT || 3000;

await makeAdmin();

// Seed products if no products are present
await seedProducts(process.env.MONGODB_URI as string);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
