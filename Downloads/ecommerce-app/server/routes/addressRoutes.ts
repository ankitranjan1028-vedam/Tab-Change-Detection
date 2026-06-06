import express from "express";
import { getAddresses, addAddress, updateAddress, deleteAddress } from "../controllers/addressController.js";
import { protect } from "../middleware/auth.js";

const AddressRouter = express.Router();

// Get user addresses
AddressRouter.get("/", protect, getAddresses);
// Add new address
AddressRouter.post("/", protect, addAddress);
// Update existing address
AddressRouter.put("/:id", protect, updateAddress);
// Delete address
AddressRouter.delete("/:id", protect, deleteAddress);

export default AddressRouter;
