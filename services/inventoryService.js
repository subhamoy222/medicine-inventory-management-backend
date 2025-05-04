import Inventory from "../models/Inventory.js"; // Import Inventory model
import CustomerPurchase from "../models/CustomerPurchase.js"; // Import CustomerPurchase model (if needed)

/**
 * Adds or updates an inventory item.
 * @param {Object} itemData - The inventory item details.
 * @param {string} itemData.itemName - Name of the item.
 * @param {string} itemData.batch - Batch number of the item.
 * @param {number} itemData.quantity - Quantity to add or update.
 * @param {number} itemData.amount - Amount per unit or batch.
 * @returns {Object} Response message.
 */
export const addOrUpdateInventoryItem = async ({ itemName, batch, quantity, amount }) => {
    if (!itemName || !batch || typeof quantity !== "number" || quantity < 0 || typeof amount !== "number" || amount < 0) {
        throw new Error("Invalid item data");
    }

    const inventoryItem = await Inventory.findOne({ itemName, batch });

    if (inventoryItem) {
        // Update existing inventory item
        inventoryItem.quantity += quantity;
        inventoryItem.amount = amount; // Update the amount (optional)
        await inventoryItem.save();
    } else {
        // Create a new inventory item
        const newInventoryItem = new Inventory({ itemName, batch, quantity, amount });
        await newInventoryItem.save();
    }

    return { message: "Inventory updated successfully" };
};

/**
 * Fetches all inventory items.
 * @returns {Array} List of all inventory items.
 */
export const getInventory = async () => {
    const inventory = await Inventory.find();
    return inventory;
};

/**
 * Validates stock availability for a specific item and batch.
 * @param {string} itemName - Name of the item.
 * @param {string} batch - Batch number of the item.
 * @param {number} quantity - Quantity required.
 * @returns {Object} The inventory item details if valid.
 * @throws {Error} If stock is insufficient or item is not found.
 */
export const validateStock = async (itemName, batch, quantity) => {
    const inventoryItem = await Inventory.findOne({ itemName, batch });
    if (!inventoryItem) {
        throw new Error(`Item ${itemName} with batch ${batch} not found in inventory.`);
    }
    if (inventoryItem.quantity < quantity) {
        throw new Error(`Insufficient stock for ${itemName} (requested: ${quantity}, available: ${inventoryItem.quantity}).`);
    }
    return inventoryItem;
};

/**
 * Deducts stock from inventory for a specific item and batch.
 * @param {string} itemName - Name of the item.
 * @param {string} batch - Batch number of the item.
 * @param {number} quantity - Quantity to deduct.
 * @returns {Object} Updated inventory item details.
 * @throws {Error} If stock is insufficient or item is not found.
 */
export const deductStock = async (itemName, batch, quantity) => {
    const inventoryItem = await validateStock(itemName, batch, quantity);
    inventoryItem.quantity -= quantity;
    await inventoryItem.save();
    return inventoryItem;
};
