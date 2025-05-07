
import CustomerPurchase from '../models/CustomerPurchase.js';
import Inventory from '../models/Inventory.js';
import ReturnBill from '../models/ReturnBillSchema.js';
import Bill from '../models/Bill.js';
import { emitToUser, SOCKET_EVENTS } from '../utils/socketUtils.js';

// --- Internal Core Logic Function (with enhanced logging) ---
// Key function for updating inventory with explicit party name handling
export async function updateInventoryInternal(data) {
    // Log 1: Data Received
    console.log('[updateInventoryInternal] Received data:', JSON.stringify(data, null, 2));

    const { itemName, batch, quantity, amount, partyName, email, ...otherFields } = data;

    // Log 2: Type Check and Validate party name
    if (!partyName) {
        console.error(`[updateInventoryInternal] ERROR: partyName is missing or falsy! Received value: ${partyName}`);
        // Use default value
        return updateInventoryInternalWithFixedPartyName(
            itemName, batch, quantity, amount, 'Unknown Supplier', email, otherFields
        );
    }
    
    if (typeof partyName !== 'string') {
        console.error(`[updateInventoryInternal] ERROR: partyName is not a string! Received type: ${typeof partyName}, value: ${partyName}`);
        // Convert to string
        const convertedPartyName = String(partyName);
        console.log(`[updateInventoryInternal] Converted partyName to string: '${convertedPartyName}'`);
        
        return updateInventoryInternalWithFixedPartyName(
            itemName, batch, quantity, amount, convertedPartyName, email, otherFields
        );
    }

    // Process with original string value
    return updateInventoryInternalWithFixedPartyName(
        itemName, batch, quantity, amount, partyName, email, otherFields
    );
}

// Helper function to process inventory update with guaranteed string party name
async function updateInventoryInternalWithFixedPartyName(
    itemName, batch, quantity, amount, partyName, email, otherFields
) {
    const trimmedItemName = itemName?.trim() || '';
    const trimmedBatch = batch?.trim() || '';
    const trimmedPartyName = partyName.trim() || 'Unknown Supplier'; // Use default if empty

    // Log 3: Check if partyName became empty after trimming and use default if needed
    if (!trimmedPartyName) {
        console.warn(`[updateInventoryInternal] WARNING: Using default party name 'Unknown Supplier' because original was empty after trimming. Original: '${partyName}'`);
    }

    // Log 4: Log processed values
    console.log(`[updateInventoryInternal] Processing with: Item='${trimmedItemName}', Batch='${trimmedBatch}', Party='${trimmedPartyName}'`);

    // Log 5: Main Validation Check
    if (!email || !trimmedItemName || !trimmedBatch || typeof quantity !== 'number' || quantity < 0) {
        console.error('[updateInventoryInternal] ERROR: Main Validation FAILED!', {
            email: !!email,
            trimmedItemName: !!trimmedItemName,
            trimmedBatch: !!trimmedBatch,
            trimmedPartyNameExists: !!trimmedPartyName,
            quantityValid: typeof quantity === 'number' && quantity >= 0,
            ReceivedPartyName: partyName
        });
        const validationError = new Error('Invalid item data: Missing or invalid email, itemName, batch, or quantity.');
        validationError.statusCode = 400;
        throw validationError;
    } else {
        console.log('[updateInventoryInternal] Main Validation Passed.');
    }

    try {
        // First try to find an exact match with email/item/batch/party
        console.log(`[updateInventoryInternal] Querying Inventory with exact match: email='${email}', itemName='${trimmedItemName}', batch='${trimmedBatch}', partyName='${trimmedPartyName}'`);
        
        let inventoryItem = await Inventory.findOne({
            email,
            itemName: { $regex: new RegExp(`^${trimmedItemName}$`, 'i') },
            batch: { $regex: new RegExp(`^${trimmedBatch}$`, 'i') },
            partyName: { $regex: new RegExp(`^${trimmedPartyName}$`, 'i') }
        });

        // If no exact match with party name, check if item exists without party name or with different party name
        if (!inventoryItem) {
            console.log(`[updateInventoryInternal] No exact match found. Checking for item without specific party name.`);
            inventoryItem = await Inventory.findOne({
                email,
                itemName: { $regex: new RegExp(`^${trimmedItemName}$`, 'i') },
                batch: { $regex: new RegExp(`^${trimmedBatch}$`, 'i') }
                // No party name filter here
            });
            
            if (inventoryItem) {
                console.log(`[updateInventoryInternal] Found item with different/missing party name: '${inventoryItem.partyName}'. Will update with: '${trimmedPartyName}'`);
                // Update the party name to this item
                inventoryItem.partyName = trimmedPartyName;
            }
        }

        if (inventoryItem) {
            // --- Update Existing ---
            console.log(`[updateInventoryInternal] Updating existing item (ID: ${inventoryItem._id}). Updating quantity and ensuring party name.`);
            
            const originalQty = inventoryItem.quantity;
            inventoryItem.quantity += quantity;
            
            // CRITICAL: Ensure partyName is set
            inventoryItem.partyName = trimmedPartyName;
            
            if (amount !== undefined) inventoryItem.amount = amount;

            // Apply other fields...
            Object.keys(otherFields).forEach(key => { 
                if (otherFields[key] !== undefined && key in inventoryItem) {
                    inventoryItem[key] = otherFields[key]; 
                } 
            });
            
            // Explicit field updates
            if (otherFields.purchaseRate !== undefined) inventoryItem.purchaseRate = otherFields.purchaseRate;
            if (otherFields.mrp !== undefined) inventoryItem.mrp = otherFields.mrp;
            if (otherFields.expiryDate !== undefined) inventoryItem.expiryDate = otherFields.expiryDate;
            if (otherFields.gstPercentage !== undefined) inventoryItem.gstPercentage = otherFields.gstPercentage;
            if (otherFields.pack !== undefined) inventoryItem.pack = otherFields.pack;
            if (otherFields.description !== undefined) inventoryItem.description = otherFields.description;

            // Log before saving update
            console.log(`[updateInventoryInternal] About to SAVE updated item (ID: ${inventoryItem._id}). Data to save:`, JSON.stringify(inventoryItem.toObject ? inventoryItem.toObject() : inventoryItem, null, 2));
            
            // Final check for party name
            if (!inventoryItem.partyName || !inventoryItem.partyName.trim()) {
                console.error("[updateInventoryInternal] CRITICAL ERROR: partyName still empty before saving! Setting default value.");
                inventoryItem.partyName = trimmedPartyName || 'Unknown Supplier';
            }

            const savedUpdatedItem = await inventoryItem.save();
            console.log(`[updateInventoryInternal] Successfully SAVED updated item. ID: ${savedUpdatedItem._id}, Qty: ${originalQty} -> ${savedUpdatedItem.quantity}, Party: ${savedUpdatedItem.partyName}`);
            return savedUpdatedItem;

        } else {
            // --- Create New ---
            console.log(`[updateInventoryInternal] No existing item found. Creating new item with party name: ${trimmedPartyName}`);
            
            // Create the inventory document with explicit fields
            const newInventoryData = {
                email, 
                itemName: trimmedItemName, 
                batch: trimmedBatch, 
                partyName: trimmedPartyName, // CRITICAL: Include party name
                quantity,
                purchaseRate: otherFields.purchaseRate,
                mrp: otherFields.mrp,
                expiryDate: otherFields.expiryDate,
                gstPercentage: otherFields.gstPercentage,
                pack: otherFields.pack,
                description: otherFields.description,
                amount
            };
            
            const newInventoryItem = new Inventory(newInventoryData);

            // Log before saving new
            console.log('[updateInventoryInternal] About to SAVE new item. Data:', JSON.stringify(newInventoryItem.toObject ? newInventoryItem.toObject() : newInventoryItem, null, 2));
            
            // Final check for party name
            if (!newInventoryItem.partyName || !newInventoryItem.partyName.trim()) {
                console.error("[updateInventoryInternal] CRITICAL ERROR: partyName empty before saving new item! Setting default.");
                newInventoryItem.partyName = 'Unknown Supplier';
            }

            const savedNewItem = await newInventoryItem.save();
            console.log(`[updateInventoryInternal] Successfully SAVED new item. ID: ${savedNewItem._id}, Qty: ${savedNewItem.quantity}, Party: ${savedNewItem.partyName}`);
            return savedNewItem;
        }

    } catch (error) {
        // Log 7: Database/Save Error
        console.error(`[updateInventoryInternal] DATABASE/SAVE error for ${trimmedItemName} (${trimmedBatch}), Party: ${trimmedPartyName}:`, error);
        const dbError = new Error(`Database operation failed: ${error.message}`);
        dbError.statusCode = 500;
        dbError.originalError = error;
        throw dbError;
    }
}

// --- NEW FUNCTION: Update inventory after sales ---
export async function updateInventoryAfterSale(saleData) {
    try {
        console.log('[updateInventoryAfterSale] Processing sale data:', JSON.stringify(saleData, null, 2));
        
        if (!saleData || !saleData.items || !Array.isArray(saleData.items) || !saleData.email) {
            console.error('[updateInventoryAfterSale] Invalid sale data:', saleData);
            throw new Error('Invalid sale data structure');
        }
        
        const updates = [];
        
        // Process each item in the sale
        for (const item of saleData.items) {
            console.log(`[updateInventoryAfterSale] Processing item: ${item.itemName}, batch: ${item.batch}, quantity: ${item.quantity}`);
            
            if (!item.itemName || !item.batch || !item.quantity) {
                console.error('[updateInventoryAfterSale] Invalid item data:', item);
                continue; // Skip invalid items
            }
            
            // Find the inventory item
            const inventoryItem = await Inventory.findOne({
                email: saleData.email,
                itemName: { $regex: new RegExp(`^${item.itemName.trim()}$`, 'i') },
                batch: { $regex: new RegExp(`^${item.batch.trim()}$`, 'i') }
            });
            
            if (!inventoryItem) {
                console.error(`[updateInventoryAfterSale] Inventory item not found: ${item.itemName} (${item.batch})`);
                continue; // Skip items not found
            }
            
            // Calculate new quantity (reduce by sold amount)
            const quantityToReduce = parseFloat(item.quantity);
            
            if (isNaN(quantityToReduce) || quantityToReduce <= 0) {
                console.error(`[updateInventoryAfterSale] Invalid quantity: ${item.quantity}`);
                continue;
            }
            
            const originalQuantity = inventoryItem.quantity;
            const newQuantity = originalQuantity - quantityToReduce;
            
            if (newQuantity < 0) {
                console.error(`[updateInventoryAfterSale] Insufficient inventory for ${item.itemName} (${item.batch}). Available: ${originalQuantity}, Requested: ${quantityToReduce}`);
                continue;
            }
            
            // Update the inventory
            console.log(`[updateInventoryAfterSale] Updating inventory for ${item.itemName} (${item.batch}): ${originalQuantity} -> ${newQuantity}`);
            inventoryItem.quantity = newQuantity;
            await inventoryItem.save();
            
            updates.push({
                itemName: item.itemName,
                batch: item.batch,
                oldQuantity: originalQuantity,
                newQuantity: newQuantity,
                reduced: quantityToReduce
            });
        }
        
        // Emit inventory update event
        emitToUser(saleData.email, SOCKET_EVENTS.INVENTORY_UPDATE, {
            message: 'Inventory updated after sale',
            updates,
            timestamp: new Date().toISOString()
        });
        
        return updates;
    } catch (error) {
        console.error('[updateInventoryAfterSale] Error:', error);
        throw error;
    }
}

// --- Endpoint Function for Sale Transaction ---
export const processSaleAndUpdateInventory = async (req, res) => {
    try {
        const saleData = req.body;
        
        if (!saleData || !saleData.email || !saleData.items || !Array.isArray(saleData.items)) {
            return res.status(400).json({ message: 'Invalid sale data' });
        }
        
        const updates = await updateInventoryAfterSale(saleData);
        res.status(200).json({ message: 'Inventory updated after sale', updates });
    } catch (error) {
        console.error('[processSaleAndUpdateInventory] Error:', error);
        res.status(500).json({ message: 'Error updating inventory after sale', error: error.message });
    }
};

// --- Endpoint Function ---
export const addOrUpdateInventoryItem = async (req, res) => {
    try {
        const result = await updateInventoryInternal(req.body);
        res.status(200).json({ message: 'Inventory updated successfully', item: result });
    } catch (error) {
         console.error('[addOrUpdateInventoryItem Endpoint] Error:', error);
         res.status(error.statusCode || 500).json({
             message: error.message || 'Error updating inventory',
             error: error.originalError ? error.originalError.toString() : error.toString()
         });
    }
};

// --- Get Inventory Function ---
export const getInventory = async (req, res) => {
    const { email, itemName, batch, partyName } = req.query;
    if (!email) { return res.status(400).json({ message: 'Email is required' }); }
    try {
        console.log(`[getInventory] Fetching inventory for email: ${email}, Query:`, req.query);
        
        const query = { email };
        if (itemName) query.itemName = { $regex: itemName, $options: 'i' };
        if (batch) query.batch = { $regex: batch, $options: 'i' };
        if (partyName) query.partyName = { $regex: partyName, $options: 'i' };

        let inventoryItems = await Inventory.find(query);
        console.log(`[getInventory] Found ${inventoryItems.length} items initially.`);

        if (!inventoryItems.length) {
            return res.status(404).json({ message: 'No inventory items found', query });
        }
        
        // Enrich inventory with bill data (this will add missing party names)
        const enrichedInventory = await enrichInventoryWithBillData(inventoryItems, email);
        
        // Emit the inventory data to the connected client via WebSocket
        emitToUser(email, SOCKET_EVENTS.INVENTORY_UPDATE, {
            count: enrichedInventory.length,
            data: enrichedInventory,
            timestamp: new Date().toISOString()
        });
        
        res.status(200).json(enrichedInventory);
    } catch (error) {
        console.error('[getInventory] Error:', error);
        res.status(500).json({ message: 'Error fetching inventory', error: error.message });
    }
};

// --- Helper: Enrich Inventory Data ---
async function enrichInventoryWithBillData(inventoryItems, email) {
    // ... (Keep implementation, seems okay) ...
     const purchaseBills = await Bill.find({ email, billType: 'purchase' }).sort({ date: -1 });
    // console.log(`Found ${purchaseBills.length} purchase bills for enriching inventory data`); // Reduce noise maybe
    return inventoryItems.map(item => {
        const itemObj = item.toObject();
        // Slightly looser find based only on item/batch, then verify party if needed
        const relatedBills = purchaseBills.filter(bill => bill.items.some(bi => bi.itemName?.toLowerCase() === item.itemName?.toLowerCase() && bi.batch?.toLowerCase() === item.batch?.toLowerCase()));
        if (relatedBills.length > 0) {
             const mostRecentBill = relatedBills[0];
            // Enrich partyName ONLY if it's missing/invalid in current inventory item
             if (!itemObj.partyName || ['unknown supplier', 'n/a', ''].includes(itemObj.partyName.toLowerCase())) {
                 if (mostRecentBill.partyName) { // Ensure bill has a party name to enrich with
                     itemObj.partyName = mostRecentBill.partyName;
                     console.log(`[enrichInventory] Enriched missing party name for ${itemObj.itemName} to ${mostRecentBill.partyName}`);
                 }
             }
            // Find the specific item in the most recent bill for other details
             const billItem = mostRecentBill.items.find(i => i.itemName?.toLowerCase() === item.itemName?.toLowerCase() && i.batch?.toLowerCase() === item.batch?.toLowerCase());
             if (billItem) {
                // Enrich other fields only if null/undefined in inventory
                 if (itemObj.purchaseRate == null && billItem.purchaseRate != null) itemObj.purchaseRate = billItem.purchaseRate;
                 if (itemObj.mrp == null && billItem.mrp != null) itemObj.mrp = billItem.mrp;
                 if (itemObj.expiryDate == null && billItem.expiryDate != null) itemObj.expiryDate = billItem.expiryDate;
                 if (itemObj.gstPercentage == null && billItem.gstPercentage != null) itemObj.gstPercentage = billItem.gstPercentage;
                 if (itemObj.pack == null && billItem.pack != null) itemObj.pack = billItem.pack || 'N/A';
                 if (itemObj.description == null && billItem.description != null) itemObj.description = billItem.description || '';
             }
         }
        return itemObj;
    });
}


// --- Helper: Consolidate Inventory ---
async function consolidateInventoryItems(email) { /* ... Keep definition ... */ }

// --- Other Exported Functions ---
export const updateInventoryPartyNames = async (req, res) => { /* ... Keep definition ... */ };
export const getInventorySummary = async (req, res) => { /* ... Keep definition ... */ };
export const resetInventory = async (req, res) => { /* ... Keep definition ... */ };
export const getCustomerPurchases = async (req, res) => { /* ... Keep definition ... */ };