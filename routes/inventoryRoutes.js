// import express from 'express';
// import Inventory from '../models/Inventory.js';
// import { isAuthenticated } from '../middleware/authMiddleware.js';
// import { createPurchaseBill } from '../controllers/billController.js';
// import { 
//     addOrUpdateInventoryItem, 
//     getCustomerPurchases, 
//     updateInventoryPartyNames 
// } from '../controllers/InventoryController.js';
// import Bill from '../models/Bill.js';

// const router = express.Router();

// // Get all inventory items or filter by item name or batch
// router.get('/', async (req, res) => {
//   const { itemName, batch, email } = req.query;

//   try {
//     // Ensure email is provided in the query
//     if (!email) {
//       return res.status(400).json({ message: 'Email is required to fetch inventory' });
//     }

//     // Build the query
//     const query = { email }; // Filter inventory by email
//     if (itemName) query.itemName = { $regex: itemName, $options: 'i' }; // Case-insensitive match for itemName
//     if (batch) query.batch = batch; // Exact match for batch

//     // Fetch inventory items based on the query
//     const inventoryItems = await Inventory.find(query);

//     // Handle cases where no items are found
//     if (!inventoryItems.length) {
//       return res.status(404).json({ message: 'No inventory items found for the given criteria' });
//     }

//     // Return the fetched inventory items
//     res.status(200).json(inventoryItems);
//   } catch (error) {
//     console.error('Error fetching inventory:', error.message);
//     res.status(500).json({ message: 'Error fetching inventory', error: error.message });
//   }
// });

// // Update inventory party names
// router.put('/update-party-names', isAuthenticated, updateInventoryPartyNames);

// // Search inventory by itemName and batch (optional)
// router.get('/search', async (req, res) => {
//   const { itemName, batch } = req.query;

//   try {
//     const query = {};
//     if (itemName) query.itemName = { $regex: itemName, $options: 'i' }; // Case-insensitive match
//     if (batch) query.batch = batch;

//     const inventoryItems = await Inventory.find(query);

//     if (!inventoryItems.length) {
//       return res.status(404).json({ message: 'No matching inventory items found' });
//     }

//     res.status(200).json(inventoryItems);
//   } catch (error) {
//     console.error('Error searching inventory:', error.message);
//     res.status(500).json({ message: 'Error searching inventory', error: error.message });
//   }
// });

// // Get inventory items for a specific customer using email
// router.get('/:email', async (req, res) => {
//   const { email } = req.params;
//   console.log('Fetching inventory for email:', email);

//   try {
//     // Get all inventory items for the email
//     const inventoryItems = await Inventory.find({ email });
//     console.log('Found inventory items:', inventoryItems);
    
//     // Get all purchase bills for the email
//     const purchaseBills = await Bill.find({ 
//       email,
//       billType: 'purchase'
//     });
//     console.log('Found purchase bills:', purchaseBills);
    
//     // Extract unique party names from both inventory and purchase bills
//     const inventoryPartyNames = new Set(inventoryItems.map(item => item.partyName));
//     const purchaseBillPartyNames = new Set(purchaseBills.map(bill => bill.partyName));
    
//     // Combine both sets of party names
//     const allPartyNames = [...new Set([...inventoryPartyNames, ...purchaseBillPartyNames])];
//     console.log('All unique party names:', allPartyNames);
    
//     // Return the unique party names
//     res.status(200).json(allPartyNames);

//   } catch (error) {
//     console.error('Error fetching inventory:', error.message);
//     res.status(500).json({ 
//       message: 'Error fetching inventory',
//       error: error.message 
//     });
//   }
// });

// // Create a new inventory item
// router.post('/', async (req, res) => {
//   try {
//     console.log('Creating inventory item with data:', req.body);
//     const newItem = new Inventory(req.body);
//     console.log('Created inventory item object:', newItem);
//     const savedItem = await newItem.save();
//     console.log('Saved inventory item:', savedItem);
//     res.status(201).json(savedItem);
//   } catch (error) {
//     console.error('Error creating inventory item:', error.message);
//     res.status(500).json({ message: 'Error creating inventory item', error: error.message });
//   }
// });

// // Update an inventory item by ID
// router.put('/:id', async (req, res) => {
//   try {
//     const updatedItem = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!updatedItem) {
//       return res.status(404).json({ message: 'Inventory item not found' });
//     }
//     res.status(200).json(updatedItem);
//   } catch (error) {
//     console.error('Error updating inventory item:', error.message);
//     res.status(500).json({ message: 'Error updating inventory item', error: error.message });
//   }
// });

// // Delete an inventory item by ID
// router.delete('/:id', async (req, res) => {
//   try {
//     const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
//     if (!deletedItem) {
//       return res.status(404).json({ message: 'Inventory item not found' });
//     }
//     res.status(200).json({ message: 'Inventory item deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting inventory item:', error.message);
//     res.status(500).json({ message: 'Error deleting inventory item', error: error.message });
//   }
// });

// // Route for adding or updating an inventory item using email
// router.post('/inventory', async (req, res) => {
//   try {
//     const updatedItem = await addOrUpdateInventoryItem(req.body); // Assuming this function handles both add & update
//     res.status(200).json(updatedItem);
//   } catch (error) {
//     console.error('Error adding/updating inventory item:', error.message);
//     res.status(500).json({ message: 'Error adding/updating inventory item', error: error.message });
//   }
// });

// export default router;

import express from 'express';
import Inventory from '../models/Inventory.js';
import { isAuthenticated } from '../middleware/authMiddleware.js'; // Assuming you use authentication
import {
    addOrUpdateInventoryItem, // The main endpoint function
    getInventory,
    getCustomerPurchases,
    updateInventoryPartyNames,
    getInventorySummary, // Assuming you exported this
    resetInventory,      // Assuming you exported this
    processSaleAndUpdateInventory // New function for updating inventory after sale
} from '../controllers/InventoryController.js';
import Bill from '../models/Bill.js'; // Keep if needed for party name route

const router = express.Router();

// --- Primary Inventory Routes ---

// GET /api/inventory/ - Fetch inventory (filtered by query params: email, itemName, batch, partyName)
// Uses the updated getInventory which calls helpers
router.get('/', isAuthenticated, getInventory); // Add authentication middleware

// POST /api/inventory/add-update - Add or Update inventory item using correct logic
// This is the endpoint your frontend should ideally use for manual adjustments
router.post('/add-update', isAuthenticated, addOrUpdateInventoryItem); // Add authentication

// --- NEW ROUTE: Update inventory after sale ---
// POST /api/inventory/update-after-sale - Process a sale and update inventory
router.post('/update-after-sale', isAuthenticated, processSaleAndUpdateInventory);

// --- Utility / Specific Routes ---

// PUT /api/inventory/update-party-names - Utility to fix missing party names (reactive)
router.put('/update-party-names', isAuthenticated, updateInventoryPartyNames);

// GET /api/inventory/summary - Get a summarized view of inventory
router.get('/summary', isAuthenticated, getInventorySummary); // Add route if using summary function

// GET /api/inventory/search - Basic search (consider enhancing or using GET /)
router.get('/search', isAuthenticated, async (req, res) => {
    const { itemName, batch, email } = req.query;
    // ... (keep existing logic, but ensure email is required and validated) ...
     if (!email) {
      return res.status(400).json({ message: 'Email is required to search inventory' });
    }
    // ... find logic ...
     try {
        const query = { email };
        if (itemName) query.itemName = { $regex: itemName, $options: 'i' }; // Case-insensitive match
        if (batch) query.batch = { $regex: batch, $options: 'i' }; // Make batch search case-insensitive too?

        const inventoryItems = await Inventory.find(query);

        if (!inventoryItems.length) {
        return res.status(404).json({ message: 'No matching inventory items found' });
        }
        res.status(200).json(inventoryItems);
    } catch (error) {
        console.error('Error searching inventory:', error.message);
        res.status(500).json({ message: 'Error searching inventory', error: error.message });
    }
});

// GET /api/inventory/party-names/:email - Get unique party names
router.get('/party-names/:email', isAuthenticated, async (req, res) => {
    // ... (keep existing logic, ensure filtering by Boolean) ...
    const { email } = req.params;
    console.log('Fetching party names for email:', email);
     try {
    // Get all inventory items for the email
    const inventoryItems = await Inventory.find({ email }).select('partyName'); // Select only partyName
    // Get all purchase bills for the email
    const purchaseBills = await Bill.find({ email, billType: 'purchase' }).select('partyName'); // Select only partyName
    
    // Extract unique party names, filter out null/empty strings
    const inventoryPartyNames = new Set(inventoryItems.map(item => item.partyName).filter(Boolean));
    const purchaseBillPartyNames = new Set(purchaseBills.map(bill => bill.partyName).filter(Boolean));
    
    const allPartyNames = [...new Set([...inventoryPartyNames, ...purchaseBillPartyNames])].sort(); // Sort alphabetically
    console.log('All unique party names:', allPartyNames);
    res.status(200).json(allPartyNames);
     } catch (error) {
         // ... error handling ...
         console.error('Error fetching party names:', error.message);
         res.status(500).json({ message: 'Error fetching party names', error: error.message });
     }
});

// GET /api/inventory/customer/:customerName - Get purchase history for a customer
router.get('/customer/:customerName', isAuthenticated, getCustomerPurchases); // Requires email in query

// POST /api/inventory/reset - For testing
router.post('/reset', isAuthenticated, resetInventory); // Use POST for destructive action

export default router;



