import express from "express";
import { getDashboardStats } from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

const AdminRouter = express.Router();

// Get dashboard stats
AdminRouter.get("/stats", protect, authorize("admin"), getDashboardStats);

export default AdminRouter;
