import Stripe from "stripe";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import { Request, Response } from "express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create Checkout Session
// POST /api/payment/checkout
export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const { items, shipping, success_url, cancel_url, orderId } = req.body;

        const lineItems = items.map((item: any) => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.product.name,
                    images: item.product.images ? [item.product.images[0]] : [],
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }));

        if (shipping > 0) {
            lineItems.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Shipping",
                    },
                    unit_amount: Math.round(shipping * 100),
                },
                quantity: 1,
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            success_url: success_url || "https://success.com",
            cancel_url: cancel_url || "https://cancel.com",
            payment_intent_data: {
                metadata: {
                    orderId: orderId,
                    appId: "forever-app",
                },
            },
        });

        res.json({ id: session.id, url: session.url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Handle Stripe Webhook
// POST /api/stripe
export const handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret as string);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const { orderId, appId } = (event.data.object as any).metadata;

    if (appId !== "forever-app") {
        return res.status(400).send("Invalid app id");
    }

    // Handle the event
    try {
        switch (event.type) {
            case "payment_intent.succeeded":
                let order;

                if (orderId) {
                    order = await Order.findById(orderId);
                } else {
                    order = await Order.findOne({ paymentIntentId: event.data.object.id });
                }

                if (order) {
                    order.paymentStatus = "paid";
                    order.paymentMethod = "stripe";
                    if (!order.paymentIntentId) {
                        order.paymentIntentId = event.data.object.id;
                    }
                    await order.save();

                    // Clear User Cart
                    const cart = await Cart.findOne({ user: order.user });
                    if (cart) {
                        cart.items = [];
                        cart.totalAmount = 0;
                        await cart.save();
                    }
                } else {
                    console.warn(`Order not found for PaymentIntent ${event.data.object.id}`);
                }
                break;

            case "payment_intent.canceled":
                await Order.findByIdAndUpdate(orderId, { paymentStatus: "failed", orderStatus: "cancelled" });
                break;

            case "payment_intent.payment_failed":
                await Order.findByIdAndUpdate(orderId, { paymentStatus: "failed", orderStatus: "cancelled" });
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.send({ success: true });
    } catch (err: any) {
        console.error(`Webhook Processing Error: ${err.message}`);
        res.status(500).send(`Webhook Processing Error: ${err.message}`);
    }
};
