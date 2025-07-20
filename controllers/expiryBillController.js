import ExpiryBill from '../models/ExpiryBill.js'; // Adjust the path if necessary
import Inventory from '../models/Inventory.js'; // Adjust the path as needed
import moment from 'moment'; // Make sure to install moment with `npm install moment`
import { sendExpiryNotificationEmail } from '../utils/emailService.js'; // Adjust the import according to your project structure
import ClientExpiryReturn from '../models/ClientExpiryReturn.js';
import SaleBill from '../models/SaleBillModel.js';
import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import { emitToAll, SOCKET_EVENTS } from '../utils/socketUtils.js';

// Check for expiring items
export const checkExpiringItems = async (req, res) => {
    const { date, monthsBefore, monthsAfter, email } = req.query; // Capture email along with date and months

    const targetDate = new Date(date); // Create a new date object from the query string

    // Validate that targetDate is a valid date
    if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date format. Please use 'YYYY-MM-DD'." });
    }

    // Create new Date objects for start and end date
    const startDate = new Date(targetDate);
    const endDate = new Date(targetDate);

    // Subtract months for the start date
    if (monthsBefore) {
        startDate.setMonth(startDate.getMonth() - parseInt(monthsBefore));
    }
    // Add months for the end date
    if (monthsAfter) {
        endDate.setMonth(endDate.getMonth() + parseInt(monthsAfter));
    }

    try {
        const expiringItems = await Inventory.find({
            expiryDate: {
                $gte: startDate, // Greater than or equal to startDate
                $lte: endDate    // Less than or equal to endDate
            }
        });

        // If there are expiring items, send an email notification
        if (expiringItems.length > 0) {
            await sendExpiryNotificationEmail(email, expiringItems);
        } else {
            console.log('No expiring items found.');
        }

        res.status(200).json({
            success: true,
            data: expiringItems
        });
    } catch (error) {
        console.error('Error checking expiring items:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create a new expiry bill
export const createExpiryBill = async (req, res) => {
    try {
        const { itemName, batch, expiryDate, quantity, purchaseRate, mrp, gstPercentage, description } = req.body;

        const newExpiryBill = await ExpiryBill.create({
            itemName,
            batch,
            expiryDate,
            quantity,
            purchaseRate,
            mrp,
            gstPercentage,
            description
        });

        res.status(201).json({
            success: true,
            data: newExpiryBill
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// List all expiry bills
export const listExpiryBills = async (req, res) => {
    try {
        const expiryBills = await ExpiryBill.find();

        res.status(200).json({
            success: true,
            data: expiryBills
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get a specific expiry bill by ID
export const getExpiryBill = async (req, res) => {
    try {
        const expiryBill = await ExpiryBill.findById(req.params.id);

        if (!expiryBill) {
            return res.status(404).json({ success: false, message: "Expiry bill not found" });
        }

        res.status(200).json({
            success: true,
            data: expiryBill
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Delete a specific expiry bill by ID
export const deleteExpiryBill = async (req, res) => {
    try {
        const expiryBill = await ExpiryBill.findByIdAndDelete(req.params.id);

        if (!expiryBill) {
            return res.status(404).json({ success: false, message: "Expiry bill not found" });
        }

        res.status(200).json({
            success: true,
            message: "Expiry bill deleted successfully"
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Create a new client expiry return
export const createClientExpiryReturn = async (req, res) => {
    try {
        const { 
            partyName, 
            date,
            items,
            email,
            notes 
        } = req.body;

        if (!partyName || !items || !email) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: partyName, items or email" 
            });
        }

        // Generate a unique return bill number
        const today = new Date();
        const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const randomString = Math.random().toString(36).substring(2, 7).toUpperCase();
        const returnBillNumber = `EXP-CLI-${dateString}-${randomString}`;

        // Validate each item
        for (const item of items) {
            // Check if a sale exists for this batch and party
            const saleBill = await SaleBill.findOne({
                saleInvoiceNumber: item.originalSaleInvoiceNumber,
                partyName,
                email,
                'items.batch': item.batch,
                'items.itemName': item.itemName
            });

            if (!saleBill) {
                return res.status(400).json({
                    success: false,
                    message: `No matching sale found for ${item.itemName} (Batch: ${item.batch})`
                });
            }

            // Find the specific item in the sale bill
            const soldItem = saleBill.items.find(
                saleItem => saleItem.itemName === item.itemName && saleItem.batch === item.batch
            );

            if (!soldItem) {
                return res.status(400).json({
                    success: false,
                    message: `Item ${item.itemName} (Batch: ${item.batch}) not found in sale invoice ${item.originalSaleInvoiceNumber}`
                });
            }

            // Check if return quantity is valid
            if (item.returnQuantity <= 0 || item.returnQuantity > soldItem.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Return quantity for ${item.itemName} (Batch: ${item.batch}) must be greater than 0 and less than or equal to sold quantity (${soldItem.quantity})`
                });
            }

            // Add sold quantity to the item
            item.soldQuantity = soldItem.quantity;
            item.purchaseDate = saleBill.date;
        }

        // Calculate totals
        const totalItems = items.length;
        let totalQuantity = 0;
        let totalValue = 0;

        // Compute values and update totals
        const processedItems = items.map(item => {
            const value = item.returnQuantity * item.mrp;
            totalQuantity += item.returnQuantity;
            totalValue += value;

            return {
                ...item,
                value
            };
        });

        // Create new client expiry return
        const newClientExpiryReturn = new ClientExpiryReturn({
            returnBillNumber,
            partyName,
            date: date || new Date(),
            items: processedItems,
            totalItems,
            totalQuantity,
            totalValue,
            email,
            notes
        });

        const savedExpiryReturn = await newClientExpiryReturn.save();

        // Optionally: Update inventory to reflect expiry return
        for (const item of items) {
            // Add returned items back to inventory
            await Inventory.findOneAndUpdate(
                { 
                    itemName: item.itemName,
                    batch: item.batch,
                    email
                },
                { 
                    $inc: { quantity: item.returnQuantity },
                    $set: { isExpired: true, returnedFromClient: true }
                },
                { 
                    new: true,
                    upsert: true, // Create if doesn't exist
                    setDefaultsOnInsert: true
                }
            );
        }

        res.status(201).json({
            success: true,
            data: savedExpiryReturn
        });
        // Emit inventory update event to all clients after client expiry return inventory updates
        emitToAll(SOCKET_EVENTS.INVENTORY_UPDATE, {
            message: 'Inventory updated after client expiry return',
            returnBillNumber: returnBillNumber,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating client expiry return:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get client's purchase history to show what can be returned
export const getClientPurchaseHistory = async (req, res) => {
    try {
        const { partyName, email, itemName } = req.query;

        console.log('Client Purchase History Request - Query Parameters:', req.query);
        console.log('Headers:', JSON.stringify(req.headers));
        console.log('Party Name:', partyName, 'Type:', typeof partyName, 'Exists:', !!partyName);
        console.log('Email:', email, 'Type:', typeof email, 'Exists:', !!email);

        if (!partyName || !email) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: partyName or email"
            });
        }

        // Find sale bills for this client
        const query = {
            partyName: { $regex: new RegExp(partyName, 'i') }, // Case-insensitive match
            email: email
        };

        console.log('Sale Bills Query:', JSON.stringify(query));
        
        const saleBills = await SaleBill.find(query).sort({ date: -1 }); // Most recent first
        console.log('Sale Bills Found:', saleBills.length);

        if (!saleBills || saleBills.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No purchase history found for this client"
            });
        }

        // Extract items with their batch details
        const purchaseHistory = [];
        
        for (const bill of saleBills) {
            console.log(`Processing bill: ${bill.saleInvoiceNumber}, items count: ${bill.items.length}`);
            
            for (const item of bill.items) {
                // If itemName filter is provided, skip items that don't match
                if (itemName && item.itemName.toLowerCase() !== itemName.toLowerCase()) {
                    continue;
                }
                
                // Check if item has valid expiry date
                if (!item.expiryDate) {
                    console.log(`Skipping item with no expiry date: ${item.itemName}, batch: ${item.batch}`);
                    continue;
                }
                
                // Check if item is expired or about to expire (within 3 months)
                const expiryDate = new Date(item.expiryDate);
                const now = new Date();
                const threeMonthsFromNow = new Date();
                threeMonthsFromNow.setMonth(now.getMonth() + 3);
                
                // Include all items regardless of expiry for now to help with testing
                purchaseHistory.push({
                    saleInvoiceNumber: bill.saleInvoiceNumber,
                    purchaseDate: bill.date,
                    itemName: item.itemName,
                    batch: item.batch,
                    quantity: item.quantity,
                    mrp: item.mrp,
                    expiryDate: item.expiryDate,
                    isExpired: expiryDate <= now,
                    expiringIn: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)) // Days until expiry
                });
            }
        }

        console.log('Purchase History Items Found:', purchaseHistory.length);
        
        res.status(200).json({
            success: true,
            data: purchaseHistory
        });
    } catch (error) {
        console.error('Error fetching client purchase history:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            stack: error.stack
        });
    }
};

// List all client expiry returns
export const listClientExpiryReturns = async (req, res) => {
    try {
        const { email } = req.query;
        
        const query = email ? { email } : {};
        const clientExpiryReturns = await ClientExpiryReturn.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: clientExpiryReturns
        });
    } catch (error) {
        console.error('Error listing client expiry returns:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get a specific client expiry return by ID
export const getClientExpiryReturn = async (req, res) => {
    try {
        const clientExpiryReturn = await ClientExpiryReturn.findById(req.params.id);

        if (!clientExpiryReturn) {
            return res.status(404).json({ 
                success: false, 
                message: "Client expiry return not found" 
            });
        }

        res.status(200).json({
            success: true,
            data: clientExpiryReturn
        });
    } catch (error) {
        console.error('Error fetching client expiry return:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create a new supplier expiry return
export const createSupplierExpiryReturn = async (req, res) => {
    try {
        const { 
            partyName, 
            startDate, 
            endDate, 
            items,
            email 
        } = req.body;

        console.log('Creating supplier expiry return with data:', {
            partyName,
            startDate,
            endDate,
            email,
            itemsCount: items.length
        });

        if (!partyName || !startDate || !items || !email) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: partyName, startDate, items or email" 
            });
        }

        // Generate a unique expiry bill number
        const today = new Date();
        const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const randomString = Math.random().toString(36).substring(2, 7).toUpperCase();
        const expiryBillNumber = `EXP-SUP-${dateString}-${randomString}`;

        // Calculate totals
        const totalItems = items.length;
        let totalQuantity = 0;
        let totalValue = 0;

        // Compute values and update totals
        const processedItems = items.map(item => {
            // Use returnQuantity field if present, fall back to expiredQuantity for backward compatibility
            const returnQty = item.returnQuantity !== undefined ? item.returnQuantity : item.expiredQuantity;
            const value = returnQty * item.purchaseRate;
            totalQuantity += returnQty;
            totalValue += value;

            return {
                ...item,
                // Store both for backward compatibility
                expiredQuantity: returnQty,
                returnQuantity: returnQty,
                value
            };
        });

        console.log(`Processed ${processedItems.length} items with a total quantity of ${totalQuantity} and value of ${totalValue}`);

        // Create new expiry bill
        const newExpiryBill = new ExpiryBill({
            expiryBillNumber,
            partyName,
            startDate,
            endDate: endDate || new Date(),
            items: processedItems,
            totalItems,
            totalQuantity,
            totalValue,
            email,
            returnType: 'supplier'
        });

        const savedExpiryBill = await newExpiryBill.save();
        console.log(`Created supplier expiry bill: ${expiryBillNumber}`);

        // Optionally: Update inventory to mark these items as returned to supplier
        for (const item of items) {
            const returnQty = item.returnQuantity !== undefined ? item.returnQuantity : item.expiredQuantity;
            
            await Inventory.findByIdAndUpdate(
                item._id,
                { 
                    $inc: { quantity: -returnQty },
                    $set: { isExpired: true, returnedToSupplier: true }
                },
                { new: true }
            );
            
            console.log(`Updated inventory for item ${item.itemName} (${item.batch}): reduced quantity by ${returnQty}`);
        }

        res.status(201).json({
            success: true,
            data: savedExpiryBill
        });
        // Emit inventory update event to all clients after supplier expiry return inventory updates
        emitToAll(SOCKET_EVENTS.INVENTORY_UPDATE, {
            message: 'Inventory updated after supplier expiry return',
            expiryBillNumber: expiryBillNumber,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating supplier expiry return:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get inventory items by party and expiry date range
export const getExpiringItemsByParty = async (req, res) => {
    try {
        const { partyName, startDate, endDate, email } = req.query;

        if (!partyName || !startDate || !email) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: partyName, startDate, or email"
            });
        }

        console.log(`Fetching expiring items for party: ${partyName}, email: ${email}, date range: ${startDate} to ${endDate || 'now'}`);

        // Parse dates correctly and adjust end date to end of day
        const startDateObj = new Date(startDate);
        let endDateObj;
        
        if (endDate) {
            endDateObj = new Date(endDate);
            // Set to end of day (23:59:59)
            endDateObj.setHours(23, 59, 59, 999);
        } else {
            endDateObj = new Date();
        }
        
        console.log(`Using date range: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);

        // First try to find items in inventory
        const inventoryQuery = {
            partyName,
            email,
            expiryDate: { 
                $gte: startDateObj,
                $lte: endDateObj
            }
        };

        console.log('Inventory query:', JSON.stringify(inventoryQuery, null, 2));
        let expiringItems = await Inventory.find(inventoryQuery);
        console.log(`Found ${expiringItems.length} items in inventory`);

        // If no items found in inventory, check purchase bills
        if (expiringItems.length === 0) {
            console.log('No items found in inventory, checking purchase bills');
            
            const billQuery = {
                email,
                partyName,
                billType: 'purchase'
            };
            
            console.log('Bill query:', JSON.stringify(billQuery, null, 2));
            const purchaseBills = await Bill.find(billQuery);
            console.log(`Found ${purchaseBills.length} matching purchase bills`);
            
            // Extract items from bills and format them like inventory items
            const items = [];
            
            // Process each bill and check inventory for actual quantities
            for (const bill of purchaseBills) {
                for (const item of bill.items) {
                    // Check if item has a valid expiry date
                    if (!item.expiryDate) {
                        console.log(`Skipping item with no expiry date: ${item.itemName}, batch: ${item.batch}`);
                        continue;
                    }
                    
                    // Only include items with expiry dates in the specified range
                    const itemExpiryDate = new Date(item.expiryDate);
                    
                    // Check if expiry date is within range
                    if (itemExpiryDate >= startDateObj && itemExpiryDate <= endDateObj) {
                        console.log(`Processing item: ${item.itemName}, batch: ${item.batch}, expiry: ${itemExpiryDate.toISOString()}`);
                        
                        // Look up current inventory quantity instead of using purchase quantity
                        const inventoryItem = await Inventory.findOne({
                            email,
                            itemName: item.itemName,
                            batch: item.batch
                        });
                        
                        // Get the actual available quantity
                        let availableQuantity = 0;
                        if (inventoryItem) {
                            availableQuantity = inventoryItem.quantity;
                            console.log(`Found in inventory: ${item.itemName}, batch: ${item.batch}, available quantity: ${availableQuantity}`);
                        } else {
                            console.log(`Item not found in inventory: ${item.itemName}, batch: ${item.batch}, using original quantity: ${item.quantity}`);
                            availableQuantity = item.quantity; // Fallback to original quantity if not in inventory
                        }
                        
                        // Only include if there's quantity available
                        if (availableQuantity > 0) {
                            items.push({
                                _id: inventoryItem ? inventoryItem._id : new mongoose.Types.ObjectId(), // Use inventory ID if exists
                                itemName: item.itemName,
                                batch: item.batch,
                                expiryDate: item.expiryDate,
                                quantity: availableQuantity, // Use the ACTUAL available quantity
                                mrp: item.mrp,
                                purchaseRate: item.purchaseRate,
                                gstPercentage: item.gstPercentage || 0,
                                partyName: bill.partyName
                            });
                        } else {
                            console.log(`Skipping item with zero quantity: ${item.itemName}, batch: ${item.batch}`);
                        }
                    } else {
                        console.log(`Skipping item outside date range: ${item.itemName}, batch: ${item.batch}, expiry: ${itemExpiryDate.toISOString()}`);
                    }
                }
            }
            
            console.log(`Extracted ${items.length} expiring items from purchase bills with updated quantities`);
            expiringItems = items;
        }

        res.status(200).json({
            success: true,
            data: expiringItems
        });
    } catch (error) {
        console.error('Error fetching expiring items by party:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
