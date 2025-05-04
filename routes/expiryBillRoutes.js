import express from "express";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import {
    createExpiryBill,
    listExpiryBills,
    getExpiryBill,
    deleteExpiryBill,
    checkExpiringItems,
    createClientExpiryReturn,
    createSupplierExpiryReturn,
    getExpiringItemsByParty,
    getClientPurchaseHistory,
    listClientExpiryReturns,
    getClientExpiryReturn
} from "../controllers/expiryBillController.js";

const router = express.Router();

// Define routes
router.post("/", isAuthenticated, createExpiryBill); // Create new expiry bill
router.get("/", isAuthenticated, listExpiryBills); // List all expiry bills
router.get("/check-expiry", isAuthenticated, checkExpiringItems); // Check for expiring items
router.get("/party-expiry", isAuthenticated, getExpiringItemsByParty); // Get expiring items by party
router.get("/client-purchase-history", isAuthenticated, getClientPurchaseHistory); // Get client purchase history for returns

// Client expiry return routes
router.post("/client", isAuthenticated, createClientExpiryReturn); // Create a client expiry return
router.get("/client", isAuthenticated, listClientExpiryReturns); // List all client expiry returns
router.get("/client/:id", isAuthenticated, getClientExpiryReturn); // Get a specific client expiry return

// Supplier expiry return routes
router.post("/supplier", isAuthenticated, createSupplierExpiryReturn); // Create a supplier expiry return

// These routes with path parameters should come LAST
router.get("/:id", isAuthenticated, getExpiryBill); // Get a specific expiry bill by ID
router.delete("/:id", isAuthenticated, deleteExpiryBill); // Delete a specific expiry bill by ID

export default router;
