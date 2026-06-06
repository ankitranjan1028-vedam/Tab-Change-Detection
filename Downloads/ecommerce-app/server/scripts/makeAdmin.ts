import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

const makeAdmin = async () => {
    try {
        const email = process.env.ADMIN_EMAIL;
        const user = await User.findOneAndUpdate({ email }, { role: "admin" });
        if (user) {
            await clerkClient.users.updateUserMetadata(user.clerkId as string, {
                publicMetadata: {
                    role: "admin",
                },
            });
        }
    } catch (err: any) {
        console.error("Admin promotion failed:", err.message);
    }
};

export default makeAdmin;
