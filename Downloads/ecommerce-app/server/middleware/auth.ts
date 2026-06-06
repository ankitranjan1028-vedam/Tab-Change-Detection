import { clerkClient } from "@clerk/express";
import User from "../models/User.js";
import { Request, Response, NextFunction } from "express";

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = await req.auth();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Not authorized",
            });
        }

        let user = await User.findOne({ clerkId: userId });

        // First login → create DB user ( if webhook fails )
        if (!user) {
            const clerkUser = await clerkClient.users.getUser(userId);
            const email = clerkUser.emailAddresses?.[0]?.emailAddress;

            if (!email) {
                return res.status(401).json({
                    success: false,
                    message: "Email not found",
                });
            }

            user = await User.create({
                name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
                email,
                clerkId: userId,
            });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth error:", err);
        res.status(500).json({
            success: false,
            message: "Authentication failed",
        });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "User role is not authorized to access this route",
            });
        }
        next();
    };
};
