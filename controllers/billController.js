// backend/controllers/billController.js

import Bill from '../models/Bill.js';
import SaleBill from '../models/SaleBillModel.js';
import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js'; // Adjust the path as needed
import CustomerPurchase from "../models/CustomerPurchase.js"; // Adjust the path if necessary
import ReturnBill from '../models/ReturnBillModel.js';  // Fixed import path
import { validateGSTNumber } from '../utils/validators.js';
import { updateInventoryInternal } from './InventoryController.js';
import { emitToUser, emitToAll, SOCKET_EVENTS } from '../utils/socketUtils.js';





// Sample inventory structure
let inventory = {}; // Use an object to store item counts, keyed by itemName

/**
 * Create a new Purchase Bill
 */
// export const createPurchaseBill = async (req, res) => {
//     const {
//         purchaseAmount, totalAmount, discountAmount, date,
//         supplierInvoiceNumber, receiptNumber, partyName, items, email
//     } = req.body;
//     console.log('Creating purchase bill with data:', req.body);
    
//     try {
//         // Create the purchase bill with billType
//         const purchaseBill = new Bill({
//             billType: 'purchase',  // Set the bill type to 'purchase'
//             purchaseAmount,
//             totalAmount,
//             discountAmount,
//             date,
//             supplierInvoiceNumber,
//             receiptNumber,
//             partyName,
//             items,
//             email
//         });
       
//         // Save the purchase bill
//         const savedPurchaseBill = await purchaseBill.save();
//         console.log("Saved purchase bill:", savedPurchaseBill);

//         // Update inventory for each item in the purchase bill
//         for (const item of items) {
//             // Check if the item already exists in inventory with case-insensitive matching
//             let inventoryItem = await Inventory.findOne({
//                 email,
//                 itemName: { $regex: new RegExp(`^${item.itemName}$`, 'i') },
//                 batch: { $regex: new RegExp(`^${item.batch}$`, 'i') },
//                 partyName: { $regex: new RegExp(`^${partyName}$`, 'i') }
//             });

//             if (inventoryItem) {
//                 // Update the existing inventory item
//                 inventoryItem.quantity += item.quantity;  // Add the new quantity to the existing quantity
//                 inventoryItem.purchaseRate = item.purchaseRate;  // Update other fields if necessary
//                 inventoryItem.mrp = item.mrp;
//                 inventoryItem.expiryDate = item.expiryDate;
//                 inventoryItem.gstPercentage = item.gstPercentage;
//                 inventoryItem.partyName = partyName; // Ensure party name is updated
                
//                 await inventoryItem.save();
//                 console.log("Updated existing inventory item:", inventoryItem);
//             } else {
//                 // If the item doesn't exist in inventory, create a new one
//                 const newInventoryItem = new Inventory({
//                     itemName: item.itemName,
//                     batch: item.batch,
//                     partyName: partyName, // Add party name to inventory
//                     expiryDate: item.expiryDate,
//                     pack: item.pack || 'N/A',
//                     quantity: item.quantity,
//                     purchaseRate: item.purchaseRate,
//                     mrp: item.mrp,
//                     gstPercentage: item.gstPercentage,
//                     description: item.description || '',
//                     email,
//                 });
//                 console.log("Creating new inventory item:", newInventoryItem);

//                 await newInventoryItem.save();
//             }
//         }

//         res.status(201).json({ 
//             message: 'Purchase bill created and inventory updated successfully', 
//             purchaseBill: savedPurchaseBill 
//         });
//     } catch (error) {
//         console.error('Error in createPurchaseBill:', error);
//         res.status(500).json({ 
//             message: 'Error creating purchase bill or updating inventory', 
//             error: error.message 
//         });
//     }
// };

// export const createPurchaseBill = async (req, res) => {
//     const {
//         purchaseAmount, totalAmount, discountAmount, date,
//         supplierInvoiceNumber, receiptNumber, partyName, items, email
//     } = req.body;
//     console.log('Received request to create purchase bill:', { /* avoid logging full items array if large */
//         supplierInvoiceNumber, receiptNumber, partyName, email, itemCount: items?.length
//     });

//     try {
//         // Validate required fields
//         if (!email || !partyName || !items || !items.length) {
//             console.error("Validation failed: Missing required fields");
//             return res.status(400).json({
//                 message: 'Missing required fields: email, partyName, or items'
//             });
//         }

//         // Trim partyName early
//         const standardPartyName = partyName.trim();
//         if (!standardPartyName) {
//              console.error("Validation failed: Party name cannot be empty after trimming.");
//              return res.status(400).json({ message: 'Party name is required' });
//         }

//         // Create the purchase bill object
//         const purchaseBill = new Bill({
//             billType: 'purchase',
//             purchaseAmount,
//             totalAmount,
//             discountAmount,
//             date: date || new Date(),
//             supplierInvoiceNumber,
//             receiptNumber,
//             partyName: standardPartyName, // Use trimmed name
//             // Ensure items have necessary fields, maybe validate item structure here?
//             items: items.map(item => ({
//                 itemName: item.itemName?.trim(), // Trim item details too
//                 batch: item.batch?.trim(),
//                 quantity: item.quantity,
//                 purchaseRate: item.purchaseRate,
//                 mrp: item.mrp,
//                 expiryDate: item.expiryDate,
//                 gstPercentage: item.gstPercentage,
//                 pack: item.pack,
//                 description: item.description,
//                 discount: item.discount // Ensure discount is captured if needed per item
//             })),
//             email
//         });

//         // Save the purchase bill FIRST
//         const savedPurchaseBill = await purchaseBill.save();
//         console.log("Saved purchase bill successfully. ID:", savedPurchaseBill._id);

//         // --- Start Inventory Update Section ---
//         let updateErrors = [];
//         let updatedItemsCount = 0;

//         // Update inventory for each item using the centralized internal function
//         for (const item of savedPurchaseBill.items) { // Use items from the saved bill
//             if (!item.itemName || !item.batch) {
//                 console.warn("Skipping inventory update: Item in saved bill missing name or batch:", item._id);
//                 updateErrors.push(`Skipped item ID ${item._id}: Missing name or batch.`);
//                 continue;
//             }

//             // Prepare data for updateInventoryInternal
//             const inventoryData = {
//                 email: savedPurchaseBill.email, // Use email from saved bill
//                 itemName: item.itemName, // Already trimmed
//                 batch: item.batch,       // Already trimmed
//                 partyName: savedPurchaseBill.partyName, // Use the main bill's party name
//                 quantity: item.quantity,
//                 // Pass other relevant fields from the bill item
//                 purchaseRate: item.purchaseRate,
//                 mrp: item.mrp,
//                 expiryDate: item.expiryDate,
//                 gstPercentage: item.gstPercentage,
//                 pack: item.pack,
//                 description: item.description,
//                 // Add 'amount' if applicable, e.g., item total cost
//                 // amount: (item.quantity * item.purchaseRate) // Example
//             };

//             try {
//                 // *** Call the CORRECT internal inventory function ***
//                 console.log(`Calling updateInventoryInternal for item: ${item.itemName}, batch: ${item.batch}`);
//                 await updateInventoryInternal(inventoryData);
//                 updatedItemsCount++;
//                 console.log(`Successfully processed inventory update for: ${item.itemName}, batch: ${item.batch}`);

//             } catch (itemError) {
//                 console.error(`Error calling updateInventoryInternal for item ${item.itemName} (${item.batch}):`, itemError.message);
//                 updateErrors.push(`Failed update for ${item.itemName} (${item.batch}): ${itemError.message}`);
//                 // Decide if one item failure should stop the whole process or just be reported
//             }
//         }
//         // --- End Inventory Update Section ---

//         // Final response based on inventory update success
//         if (updateErrors.length > 0) {
//              console.warn("Purchase bill created, but some inventory updates failed:", updateErrors);
//              // Use 207 Multi-Status to indicate partial success
//              res.status(207).json({
//                  message: 'Purchase bill created, but some inventory updates encountered errors.',
//                  purchaseBill: savedPurchaseBill, // Send saved bill details
//                  updatedInventoryItems: updatedItemsCount,
//                  inventoryUpdateErrors: updateErrors
//              });
//         } else {
//              console.log(`All ${updatedItemsCount} inventory items updated successfully.`);
//              res.status(201).json({
//                  message: 'Purchase bill created and inventory updated successfully',
//                  purchaseBill: savedPurchaseBill, // Send saved bill details
//                  updatedInventoryItems: updatedItemsCount
//              });
//         }

//     } catch (error) {
//         console.error('Critical error during purchase bill creation or saving:', error);
//         // Handle errors during bill saving or other critical failures
//         res.status(500).json({
//             message: 'Error creating purchase bill',
//             error: error.message,
//             stack: process.env.NODE_ENV === 'development' ? error.stack : undefined // Show stack only in dev
//         });
//     }
// };

export const createPurchaseBill = async (req, res) => {
    // Log 1: Raw Request Body
    console.log('[createPurchaseBill] Received raw request body:', JSON.stringify(req.body)); 

    const {
        purchaseAmount, totalAmount, discountAmount, date,
        supplierInvoiceNumber, receiptNumber, partyName, items, email
    } = req.body;

    try {
        // Validation
        if (!email || !partyName || !items || !items.length) {
            console.error("[createPurchaseBill] Validation failed: Missing required fields");
            return res.status(400).json({ message: 'Missing required fields: email, partyName, or items' });
        }
        
        const standardPartyName = partyName.trim();
        if (!standardPartyName) {
             console.error("[createPurchaseBill] Validation failed: Party name empty after trimming.");
             return res.status(400).json({ message: 'Party name is required and cannot be only whitespace' });
        }

        // Create Bill object
        const purchaseBill = new Bill({
            billType: 'purchase', 
            purchaseAmount, 
            totalAmount, 
            discountAmount,
            date: date || new Date(), 
            supplierInvoiceNumber, 
            receiptNumber,
            partyName: standardPartyName, 
            email,
            items: items.map(item => ({ 
                itemName: item.itemName?.trim(), 
                batch: item.batch?.trim(), 
                quantity: item.quantity,
                purchaseRate: item.purchaseRate, 
                mrp: item.mrp, 
                expiryDate: item.expiryDate,
                gstPercentage: item.gstPercentage, 
                pack: item.pack, 
                description: item.description,
                discount: item.discount
            })),
        });

        // Save Bill
        const savedPurchaseBill = await purchaseBill.save();
        console.log("[createPurchaseBill] Saved purchase bill successfully. ID:", savedPurchaseBill._id, "Party Name:", savedPurchaseBill.partyName);

        // --- Inventory Update Loop ---
        let updateErrors = [];
        let updatedItemsCount = 0;
        
        // IMPORTANT: Store the party name once to ensure consistency
        const partyNameForInventory = savedPurchaseBill.partyName || standardPartyName;
        console.log(`[createPurchaseBill] Using party name for all inventory updates: '${partyNameForInventory}'`);
        
        for (const item of savedPurchaseBill.items) {
            if (!item.itemName || !item.batch) {
                console.warn("[createPurchaseBill] Skipping inventory update: Item in saved bill missing name or batch:", item._id);
                updateErrors.push(`Skipped item ID ${item._id}: Missing name or batch.`);
                continue;
            }
            
            // Prepare data for inventory update with explicit partyName
            const inventoryData = {
                email: savedPurchaseBill.email,
                itemName: item.itemName,
                batch: item.batch,
                partyName: partyNameForInventory, // Use the consistent party name
                quantity: item.quantity,
                purchaseRate: item.purchaseRate, 
                mrp: item.mrp, 
                expiryDate: item.expiryDate,
                gstPercentage: item.gstPercentage, 
                pack: item.pack, 
                description: item.description,
            };

            // Log data being sent to update function
            console.log(`[createPurchaseBill] Preparing to call updateInventoryInternal for item '${item.itemName}', batch '${item.batch}' with party '${inventoryData.partyName}'. Data:`, JSON.stringify(inventoryData, null, 2));

            try {
                await updateInventoryInternal(inventoryData);
                updatedItemsCount++;
                console.log(`[createPurchaseBill] Successfully returned from updateInventoryInternal for: ${item.itemName}`);
            } catch (itemError) {
                console.error(`[createPurchaseBill] Error DURING call to updateInventoryInternal for item ${item.itemName} (${item.batch}):`, itemError.message);
                updateErrors.push(`Failed update for ${item.itemName} (${item.batch}): ${itemError.message}`);
            }
        } // --- End Inventory Update Loop ---

        // Final Response
        if (updateErrors.length > 0) {
            console.warn("[createPurchaseBill] Completed with errors. Bill saved, but some inventory updates failed.", { billId: savedPurchaseBill._id, errors: updateErrors });
            res.status(207).json({ 
                message: 'Bill saved but some inventory items failed to update',
                bill: savedPurchaseBill._id,
                errors: updateErrors
            });
        } else {
            console.log(`[createPurchaseBill] Completed successfully. Bill ID: ${savedPurchaseBill._id}, Inventory items processed: ${updatedItemsCount}`);
            res.status(201).json({ 
                message: 'Purchase bill created successfully',
                bill: savedPurchaseBill._id,
                processedItems: updatedItemsCount
            });
        }

    } catch (error) {
        console.error('[createPurchaseBill] CRITICAL error during bill saving or processing:', error);
        res.status(500).json({ 
            message: 'Error saving purchase bill',
            error: error.message
        });
    }
};


// export const createSaleBill = async (req, res) => {
//     try {
//         const { saleInvoiceNumber, date, receiptNumber, partyName, items  } = req.body;
//         const email = req.user.email;

//         if (!email) {
//             return res.status(400).json({ message: 'User email is required' });
//         }

//         console.log('Creating sale bill with data:', {
//             saleInvoiceNumber,
//             date,
//             receiptNumber,
//             partyName,
//             email,
//             items,
//             expiryDate
//         });

//         // Check if there are any inventory items for this user
//         const userInventory = await Inventory.find({ email });
//         console.log('User inventory items:', userInventory.map(item => ({
//             itemName: item.itemName,
//             batch: item.batch,
//             quantity: item.quantity,
//             expiryDate:item.expiryDate
//         })));

//         // Validate required fields
//         if (!saleInvoiceNumber || !date || !receiptNumber || !partyName || !items || !items.length , !expiryDate) {
//             return res.status(400).json({ message: 'All fields, including items, are required' });
//         }

//         // Validate GST numbers in items
//         const gstNumbers = items.map(item => item.gstNo);
//         const uniqueGstNos = [...new Set(gstNumbers)];
//         if (uniqueGstNos.length !== 1) {
//             return res.status(400).json({ message: 'All items in a bill must belong to the same GST number' });
//         }
//         const gstNo = uniqueGstNos[0];

//         let totalAmount = 0;
//         let discountAmount = 0;

//         // Process items and validate inventory
//         for (const item of items) {
//             const { itemName, batch, quantity, mrp, discount } = item;

//             console.log('Processing item:', {
//                 itemName,
//                 batch,
//                 quantity,
//                 mrp,
//                 discount,
//                 expiryDate
//             });

//             // Validate item fields
//             if (!itemName || !batch || !gstNo) {
//                 return res.status(400).json({ message: `Invalid input in item: ${JSON.stringify(item)}` });
//             }

//             // Convert to numbers
//             const parsedQuantity = Number(quantity);
//             const parsedMrp = Number(mrp);
//             const parsedDiscount = Number(discount);

//             // Validate numeric values
//             if (isNaN(parsedQuantity) || isNaN(parsedMrp) || isNaN(parsedDiscount)) {
//                 return res.status(400).json({ message: `Invalid numeric values in item: ${JSON.stringify(item)}` });
//             }

//             if (parsedQuantity <= 0 || parsedMrp < 0 || parsedDiscount < 0) {
//                 return res.status(400).json({
//                     message: `Invalid values: Quantity must be >0, MRP & discount >=0`
//                 });
//             }

//             // Calculate item values
//             const itemAmount = parsedQuantity * parsedMrp;
//             const itemDiscount = (itemAmount * parsedDiscount) / 100;

//             totalAmount += itemAmount;
//             discountAmount += itemDiscount;

//             // Inventory check
//             const inventoryItem = await Inventory.findOne({
//                 email,
//                 itemName: { $regex: new RegExp(`^${itemName}$`, 'i') },
//                 batch: { $regex: new RegExp(`^${batch}$`, 'i') },
//             });

//             console.log('Inventory check result:', inventoryItem);

//             if (!inventoryItem) {
//                 return res.status(400).json({
//                     message: `Item ${itemName} (${batch}) not found in inventory`
//                 });
//             }

//             if (inventoryItem.quantity < parsedQuantity) {
//                 return res.status(400).json({
//                     message: `Insufficient stock for ${itemName} (Available: ${inventoryItem.quantity})`
//                 });
//             }

//             // Update inventory
//             inventoryItem.quantity -= parsedQuantity;
//             await inventoryItem.save();
//         }

//         // Calculate final amounts
//         const netAmount = totalAmount - discountAmount;

//         console.log('Creating sale bill with amounts:', {
//             totalAmount,
//             discountAmount,
//             netAmount
//         });

//         // Create sale bill
//         const newBill = new SaleBill({
//             saleInvoiceNumber,
//             date,
//             receiptNumber,
//             partyName,
//             items: await Promise.all(items.map(async (item) => {
//                 // Get the inventory item to get its expiry date
//                 const inventoryItem = await Inventory.findOne({
//                     email,
//                     itemName: item.itemName,
//                     batch: item.batch
//                 });

//                 if (!inventoryItem) {
//                     throw new Error(`Inventory item not found for ${item.itemName} (${item.batch})`);
//                 }

//                 return {
//                     ...item,
//                     quantity: Number(item.quantity),
//                     mrp: Number(item.mrp),
//                     discount: Number(item.discount),
//                     amount: Number(item.quantity) * Number(item.mrp),
//                     expiryDate: inventoryItem.expiryDate // Include expiry date from inventory
//                 };
//             })),
//             totalAmount,
//             discountAmount,
//             netAmount,
//             email,
//             gstNo
//         });

//         console.log('Saving sale bill:', newBill);

//         const savedBill = await newBill.save();

//         console.log('Sale bill saved successfully:', savedBill);

//         // Update customer purchase history by GST number
//         let customerPurchase = await CustomerPurchase.findOne({ gstNo });

//         if (!customerPurchase) {
//             customerPurchase = new CustomerPurchase({
//                 gstNo,
//                 partyName,
//                 purchaseHistory: []
//             });
//         }

//         // Add purchase record
//         customerPurchase.purchaseHistory.push({
//             date: new Date(),
//             invoiceNumber: saleInvoiceNumber,
//             items: items.map(item => ({
//                 itemName: item.itemName,
//                 batch: item.batch,
//                 quantity: Number(item.quantity),
//                 rate: Number(item.mrp),
//                 discount: Number(item.discount),
//                 amount: Number(item.quantity) * Number(item.mrp),
//                 expiryDate:item.expiryDate
//             })),
//             totalAmount: netAmount
//         });

//         await customerPurchase.save();

//         return res.status(201).json({
//             message: 'Sale bill created successfully',
//             bill: savedBill,
//             inventoryUpdated: true,
//             customerRecordUpdated: true
//         });

//     } catch (error) {
//         console.error('Error creating sale bill:', error);
//         return res.status(500).json({
//             message: 'Internal server error',
//             error: error.message,
//             stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//         });
//     }
// };



// export const createSaleBill = async (req, res) => {
//     try {
//         // Destructure fields defined in the newer schema/payload
//         const { saleInvoiceNumber, date, receiptNumber, partyName, items, gstNumber, // Top-level GST
//                 // Get overall totals calculated by frontend
//                 totalAmount: feTotalAmount,
//                 discountAmount: feDiscountAmount,
//                 sgstAmount: feSgstAmount,
//                 cgstAmount: feCgstAmount,
//                 igstAmount: feIgstAmount,
//                 totalGstAmount: feTotalGstAmount,
//                 netAmount: feNetAmount } = req.body;
//         const email = req.user.email; // Assuming middleware adds user object

//         if (!email) {
//             return res.status(400).json({ message: 'User email is required (authentication error)' });
//         }

//         // Validate required top-level fields
//         if (!saleInvoiceNumber || !date || !receiptNumber || !partyName || !items || !items.length || !gstNumber) {
//             // Added detailed check for items array content
//              if (!items || !Array.isArray(items) || items.length === 0) {
//                 return res.status(400).json({ message: 'Items array cannot be empty' });
//              }
//              // If items exist but other fields missing
//             return res.status(400).json({ message: 'Missing required fields (invoice#, date, receipt#, party, items, gstNumber)' });
//         }

//         // **Removed the incorrect item.gstNo check logic**

//         // Initialize variables for server-side calculation/validation if needed,
//         // but primarily trust frontend calculations if they match schema totals.
//         const processedItems = [];

//         // Process items, validate inventory, and prepare items for saving
//         for (const item of items) {
//             // Destructure fields expected per item from the NEW schema/payload
//             const { itemName, batch, quantity, mrp, discount, gstPercentage, expiryDate,
//                     sgst, cgst, igst, totalGst, netAmount } = item; // Get all relevant fields

//             // --- Basic Item Validation ---
//             if (!itemName || !batch || quantity == null || mrp == null || discount == null || gstPercentage == null || expiryDate == null || sgst == null || cgst == null || igst == null || totalGst == null || netAmount == null ) {
//                  // Log the specific item causing the issue for easier debugging
//                 console.error("Validation failed for item:", item);
//                 return res.status(400).json({ message: `Missing required fields in item: ${itemName} (${batch})` });
//             }

//             // Convert necessary fields to numbers for checks/calculations
//             const parsedQuantity = Number(quantity);
//             const parsedMrp = Number(mrp);
//             const parsedDiscount = Number(discount);
//             const parsedGstPercentage = Number(gstPercentage);
//              // Also parse received amounts for potential validation/recalculation
//             const parsedNetAmount = Number(netAmount);
//             const parsedTotalGst = Number(totalGst);

//             // Validate numeric values (ensure they are numbers and within reasonable ranges)
//             if (isNaN(parsedQuantity) || isNaN(parsedMrp) || isNaN(parsedDiscount) || isNaN(parsedGstPercentage) || isNaN(parsedNetAmount) || isNaN(parsedTotalGst) ) {
//                 console.error("NaN value detected in item:", item);
//                 return res.status(400).json({ message: `Invalid numeric values in item: ${itemName} (${batch})` });
//             }
//             if (parsedQuantity <= 0 || parsedMrp < 0 || parsedDiscount < 0 || parsedGstPercentage < 0) {
//                  console.error("Invalid range in item:", item);
//                  return res.status(400).json({ message: `Invalid values: Quantity must be >0, MRP/Discount/GST% >=0 in item: ${itemName} (${batch})` });
//             }
//             // --- End Basic Item Validation ---


//             // --- Inventory Check & Update ---
//             // Find all inventory entries matching item, batch, and user email
//             const inventoryItems = await Inventory.find({
//                 email,
//                 // Use case-insensitive regex for matching flexibility
//                 itemName: { $regex: new RegExp(`^${itemName}$`, 'i') },
//                 batch: { $regex: new RegExp(`^${batch}$`, 'i') }
//             }).sort({ expiryDate: 1 }); // Sort by expiry (FIFO for deduction)

//             if (!inventoryItems.length) {
//                 return res.status(400).json({ message: `Item ${itemName} (Batch: ${batch}) not found in inventory` });
//             }

//             // Calculate total available quantity across found inventory entries
//             const totalAvailableQuantity = inventoryItems.reduce((sum, inv) => sum + inv.quantity, 0);

//             // Check if sufficient stock exists
//             if (totalAvailableQuantity < parsedQuantity) {
//                 return res.status(400).json({ message: `Insufficient stock for ${itemName} (Batch: ${batch}). Available: ${totalAvailableQuantity}, Requested: ${parsedQuantity}` });
//             }

//             // Deduct quantity from inventory items (FIFO based on sort)
//             let remainingQuantityToDeduct = parsedQuantity;
//             let actualExpiryDate = inventoryItems[0].expiryDate; // Get expiry from the first (oldest) inventory item
//             for (const inventoryItem of inventoryItems) {
//                 if (remainingQuantityToDeduct <= 0) break;

//                 const quantityToDeductFromThis = Math.min(remainingQuantityToDeduct, inventoryItem.quantity);
//                 inventoryItem.quantity -= quantityToDeductFromThis;
//                 remainingQuantityToDeduct -= quantityToDeductFromThis;

//                  // Decide whether to remove item or update quantity
//                  if (inventoryItem.quantity <= 0) {
//                      // Optional: Remove the inventory item if quantity is zero
//                      // await Inventory.findByIdAndDelete(inventoryItem._id);
//                      // Or just save it with quantity 0 if you prefer to keep the record
//                      await inventoryItem.save();
//                  } else {
//                      await inventoryItem.save(); // Save updated quantity
//                  }
//             }
//             // --- End Inventory Check & Update ---


//             // --- Prepare Item for Saving (Matching Schema) ---
//             // This object structure MUST match the Mongoose schema definition for `items`
//             processedItems.push({
//                 itemName: itemName,
//                 batch: batch,
//                 quantity: parsedQuantity,
//                 mrp: parsedMrp,
//                 discount: parsedDiscount,
//                 gstPercentage: parsedGstPercentage,
//                 expiryDate: actualExpiryDate, // Use expiry from inventory
//                 // Use the pre-calculated values sent from frontend
//                 sgst: Number(sgst) || 0,
//                 cgst: Number(cgst) || 0,
//                 igst: Number(igst) || 0,
//                 totalGst: parsedTotalGst, // Use totalGst from payload
//                 netAmount: parsedNetAmount // Use netAmount from payload
//                 // **Removed the extra 'amount: taxableValue' field**
//             });
//         } // End of item loop

//         // --- Create and Save Sale Bill ---
//         // Use the overall totals sent from the frontend payload
//         const newBill = new SaleBill({
//             saleInvoiceNumber, date, receiptNumber, partyName, email, gstNumber,
//             items: processedItems, // Use the correctly structured items
//             // Assign overall totals from the request body
//             totalAmount: feTotalAmount,
//             discountAmount: feDiscountAmount,
//             sgstAmount: feSgstAmount,
//             cgstAmount: feCgstAmount,
//             igstAmount: feIgstAmount,
//             totalGstAmount: feTotalGstAmount,
//             netAmount: feNetAmount
//         });

//         const savedBill = await newBill.save(); // Mongoose validation happens here
//         // --- End Create and Save Sale Bill ---


//         // --- Update Customer Purchase History (Optional) ---
//         try {
//              let customerPurchase = await CustomerPurchase.findOne({ gstNo: gstNumber, email: email }); // Added email scope
//              if (!customerPurchase) {
//                  customerPurchase = new CustomerPurchase({ gstNo: gstNumber, partyName, email, purchaseHistory: [] });
//              }

//              customerPurchase.purchaseHistory.push({
//                  date: new Date(),
//                  invoiceNumber: saleInvoiceNumber,
//                  items: processedItems.map(item => ({ // Map processed items for history
//                      itemName: item.itemName,
//                      batch: item.batch,
//                      quantity: item.quantity,
//                      rate: item.mrp, // Use MRP as rate?
//                      discount: item.discount,
//                      gstPercentage: item.gstPercentage,
//                      expiryDate: item.expiryDate,
//                      amount: item.netAmount // Use netAmount per item
//                  })),
//                  totalAmount: feNetAmount // Use overall net amount for this purchase record
//              });
//              await customerPurchase.save();
//              console.log(`Customer purchase history updated for GSTIN: ${gstNumber}`);
//         } catch(custError) {
//             // Log error but don't fail the entire sale if customer history update fails
//             console.error(`Error updating customer purchase history for ${gstNumber}:`, custError);
//         }
//         // --- End Update Customer Purchase History ---

//         // --- Emit real-time updates via WebSocket ---
//         try {
//           // Calculate today's and this month's sales totals
//           const today = new Date();
//           today.setHours(0, 0, 0, 0);
//           const tomorrow = new Date(today);
//           tomorrow.setDate(tomorrow.getDate() + 1);
          
//           const dailySales = await SaleBill.aggregate([
//             {
//               $match: {
//                 email: email,
//                 date: { $gte: today, $lt: tomorrow }
//               }
//             },
//             {
//               $group: {
//                 _id: null,
//                 totalAmount: { $sum: '$netAmount' }
//               }
//             }
//           ]);
          
//           const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//           const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          
//           const monthlySales = await SaleBill.aggregate([
//             {
//               $match: {
//                 email: email,
//                 date: { $gte: firstDayOfMonth, $lt: firstDayOfNextMonth }
//               }
//             },
//             {
//               $group: {
//                 _id: null,
//                 totalAmount: { $sum: '$netAmount' }
//               }
//             }
//           ]);
          
//           // Count unique customers this month
//           const uniqueCustomers = await SaleBill.distinct('partyName', {
//             email: email,
//             date: { $gte: firstDayOfMonth, $lt: firstDayOfNextMonth }
//           });
          
//           // Format currency values
//           const formatCurrency = (value) => {
//             return `₹${value.toLocaleString('en-IN')}`;
//           };
          
//           // Emit dashboard update with sales data
//           emitToUser(email, SOCKET_EVENTS.DASHBOARD_UPDATE, {
//             dailySales: formatCurrency(dailySales.length > 0 ? dailySales[0].totalAmount : 0),
//             monthlySales: formatCurrency(monthlySales.length > 0 ? monthlySales[0].totalAmount : 0),
//             activeCustomers: uniqueCustomers.length,
//             timestamp: new Date().toISOString()
//           });
          
//           console.log(`Real-time dashboard update emitted for user: ${email}`);
//         } catch (wsError) {
//           // Don't fail the sale if WebSocket emission fails
//           console.error('Error emitting real-time updates:', wsError);
//         }
//         // --- End WebSocket updates ---

//         // --- Send Success Response ---
//         return res.status(201).json({
//             message: 'Sale bill created successfully',
//             bill: savedBill,
//             inventoryUpdated: true,
//             customerRecordUpdated: true // Indicate history update attempted/succeeded
//         });

//     } catch (error) {
//         // --- Handle Errors ---
//         console.error('Error creating sale bill:', error);
//         // Check for Mongoose validation errors specifically
//         if (error.name === 'ValidationError') {
//             // Extract meaningful messages from validation errors
//             const messages = Object.values(error.errors).map(val => val.message);
//             return res.status(400).json({ message: messages.join(', '), error: error.message });
//         }
//         // Generic server error
//         return res.status(500).json({ message: 'Internal server error', error: error.message });
//     }
// };


// Modified createSaleBill function with improved inventory handling
export const createSaleBill = async (req, res) => {
  try {
      // Destructure fields defined in the newer schema/payload
      const { saleInvoiceNumber, date, receiptNumber, partyName, items, gstNumber, // Top-level GST
              // Get overall totals calculated by frontend
              totalAmount: feTotalAmount,
              discountAmount: feDiscountAmount,
              sgstAmount: feSgstAmount,
              cgstAmount: feCgstAmount,
              igstAmount: feIgstAmount,
              totalGstAmount: feTotalGstAmount,
              netAmount: feNetAmount } = req.body;
      const email = req.user.email; // Assuming middleware adds user object

      if (!email) {
          return res.status(400).json({ message: 'User email is required (authentication error)' });
      }

      // Validate required top-level fields
      if (!saleInvoiceNumber || !date || !receiptNumber || !partyName || !items || !items.length || !gstNumber) {
          // Added detailed check for items array content
           if (!items || !Array.isArray(items) || items.length === 0) {
              return res.status(400).json({ message: 'Items array cannot be empty' });
           }
           // If items exist but other fields missing
          return res.status(400).json({ message: 'Missing required fields (invoice#, date, receipt#, party, items, gstNumber)' });
      }

      // Initialize variables for server-side calculation/validation if needed,
      // but primarily trust frontend calculations if they match schema totals.
      const processedItems = [];

      // Prepare inventory validation data first (to avoid partial processing)
      const inventoryCheckResults = [];
      for (const item of items) {
          // Destructure fields expected per item from the NEW schema/payload
          const { itemName, batch, quantity, mrp, discount, gstPercentage, expiryDate,
                  sgst, cgst, igst, totalGst, netAmount } = item; // Get all relevant fields

          // --- Basic Item Validation ---
          if (!itemName || !batch || quantity == null || mrp == null || discount == null || gstPercentage == null || expiryDate == null || sgst == null || cgst == null || igst == null || totalGst == null || netAmount == null ) {
               // Log the specific item causing the issue for easier debugging
              console.error("Validation failed for item:", item);
              return res.status(400).json({ message: `Missing required fields in item: ${itemName} (${batch})` });
          }

          // Convert necessary fields to numbers for checks/calculations
          const parsedQuantity = Number(quantity);
          const parsedMrp = Number(mrp);
          const parsedDiscount = Number(discount);
          const parsedGstPercentage = Number(gstPercentage);
           // Also parse received amounts for potential validation/recalculation
          const parsedNetAmount = Number(netAmount);
          const parsedTotalGst = Number(totalGst);

          // Validate numeric values (ensure they are numbers and within reasonable ranges)
          if (isNaN(parsedQuantity) || isNaN(parsedMrp) || isNaN(parsedDiscount) || isNaN(parsedGstPercentage) || isNaN(parsedNetAmount) || isNaN(parsedTotalGst) ) {
              console.error("NaN value detected in item:", item);
              return res.status(400).json({ message: `Invalid numeric values in item: ${itemName} (${batch})` });
          }
          if (parsedQuantity <= 0 || parsedMrp < 0 || parsedDiscount < 0 || parsedGstPercentage < 0) {
               console.error("Invalid range in item:", item);
               return res.status(400).json({ message: `Invalid values: Quantity must be >0, MRP/Discount/GST% >=0 in item: ${itemName} (${batch})` });
          }
          // --- End Basic Item Validation ---

          // Find all inventory entries matching item, batch, and user email
          const inventoryItems = await Inventory.find({
              email,
              // Use case-insensitive regex for matching flexibility
              itemName: { $regex: new RegExp(`^${itemName}$`, 'i') },
              batch: { $regex: new RegExp(`^${batch}$`, 'i') }
          }).sort({ expiryDate: 1 }); // Sort by expiry (FIFO for deduction)

          if (!inventoryItems.length) {
              return res.status(400).json({ message: `Item ${itemName} (Batch: ${batch}) not found in inventory` });
          }

          // Calculate total available quantity across found inventory entries
          const totalAvailableQuantity = inventoryItems.reduce((sum, inv) => sum + inv.quantity, 0);

          // Check if sufficient stock exists
          if (totalAvailableQuantity < parsedQuantity) {
              return res.status(400).json({ message: `Insufficient stock for ${itemName} (Batch: ${batch}). Available: ${totalAvailableQuantity}, Requested: ${parsedQuantity}` });
          }

          // Store inventory check result for this item
          inventoryCheckResults.push({
              itemName,
              batch,
              quantity: parsedQuantity,
              inventoryItems
          });

          // --- Prepare Item for Saving (Matching Schema) ---
          // This object structure MUST match the Mongoose schema definition for `items`
          processedItems.push({
              itemName: itemName,
              batch: batch,
              quantity: parsedQuantity,
              mrp: parsedMrp,
              discount: parsedDiscount,
              gstPercentage: parsedGstPercentage,
              expiryDate: expiryDate, // Use the provided expiry date
              // Use the pre-calculated values sent from frontend
              sgst: Number(sgst) || 0,
              cgst: Number(cgst) || 0,
              igst: Number(igst) || 0,
              totalGst: parsedTotalGst, // Use totalGst from payload
              netAmount: parsedNetAmount // Use netAmount from payload
          });
      } // End of item loop

      // --- Create and Save Sale Bill ---
      // Use the overall totals sent from the frontend payload
      const newBill = new SaleBill({
          saleInvoiceNumber, date, receiptNumber, partyName, email, gstNumber,
          items: processedItems, // Use the correctly structured items
          // Assign overall totals from the request body
          totalAmount: feTotalAmount,
          discountAmount: feDiscountAmount,
          sgstAmount: feSgstAmount,
          cgstAmount: feCgstAmount,
          igstAmount: feIgstAmount,
          totalGstAmount: feTotalGstAmount,
          netAmount: feNetAmount
      });

      // Save bill first, then update inventory 
      const savedBill = await newBill.save();
      console.log("Sale bill saved successfully:", savedBill._id);

      // --- NEW: Use specialized inventory update function ---
      // Prepare data structure for updateInventoryAfterSale
      const saleData = {
          email,
          items: processedItems.map(item => ({
              itemName: item.itemName,
              batch: item.batch,
              quantity: item.quantity
          })),
          billId: savedBill._id,  // Reference the bill that caused this update
          date: new Date()
      };

      // Update inventory using the specialized function
      let inventoryUpdates;
      let inventoryUpdateSuccess = false;
      try {
          // Import the specialized function
          const { updateInventoryAfterSale } = await import('../controllers/InventoryController.js');
          inventoryUpdates = await updateInventoryAfterSale(saleData);
          inventoryUpdateSuccess = true;
          console.log("Inventory updated successfully after sale:", inventoryUpdates);
      } catch (inventoryError) {
          console.error("Error updating inventory after sale:", inventoryError);
          // Don't fail the request since bill is created, but notify client
          // This is important because the bill is already saved
      }
      // --- End Inventory Update ---

      // --- Update Customer Purchase History (Optional) ---
      let customerUpdateSuccess = false;
      try {
           let customerPurchase = await CustomerPurchase.findOne({ gstNo: gstNumber, email: email }); // Added email scope
           if (!customerPurchase) {
               customerPurchase = new CustomerPurchase({ gstNo: gstNumber, partyName, email, purchaseHistory: [] });
           }

           customerPurchase.purchaseHistory.push({
               date: new Date(),
               invoiceNumber: saleInvoiceNumber,
               items: processedItems.map(item => ({ // Map processed items for history
                   itemName: item.itemName,
                   batch: item.batch,
                   quantity: item.quantity,
                   rate: item.mrp, // Use MRP as rate?
                   discount: item.discount,
                   gstPercentage: item.gstPercentage,
                   expiryDate: item.expiryDate,
                   amount: item.netAmount // Use netAmount per item
               })),
               totalAmount: feNetAmount // Use overall net amount for this purchase record
           });
           await customerPurchase.save();
           customerUpdateSuccess = true;
           console.log(`Customer purchase history updated for GSTIN: ${gstNumber}`);
      } catch(custError) {
          // Log error but don't fail the entire sale if customer history update fails
          console.error(`Error updating customer purchase history for ${gstNumber}:`, custError);
      }
      // --- End Update Customer Purchase History ---

      // --- Emit real-time updates via WebSocket ---
      try {
        // Calculate today's and this month's sales totals
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dailySales = await SaleBill.aggregate([
          {
            $match: {
              email: email,
              date: { $gte: today, $lt: tomorrow }
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$netAmount' }
            }
          }
        ]);
        
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        
        const monthlySales = await SaleBill.aggregate([
          {
            $match: {
              email: email,
              date: { $gte: firstDayOfMonth, $lt: firstDayOfNextMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$netAmount' }
            }
          }
        ]);
        
        // Count unique customers this month
        const uniqueCustomers = await SaleBill.distinct('partyName', {
          email: email,
          date: { $gte: firstDayOfMonth, $lt: firstDayOfNextMonth }
        });
        
        // Format currency values
        const formatCurrency = (value) => {
          return `₹${value.toLocaleString('en-IN')}`;
        };
        
        // Emit dashboard update with sales data
        emitToUser(email, SOCKET_EVENTS.DASHBOARD_UPDATE, {
          dailySales: formatCurrency(dailySales.length > 0 ? dailySales[0].totalAmount : 0),
          monthlySales: formatCurrency(monthlySales.length > 0 ? monthlySales[0].totalAmount : 0),
          activeCustomers: uniqueCustomers.length,
          timestamp: new Date().toISOString()
        });
        
        // Also emit an explicit inventory update event to ensure client is notified
        if (inventoryUpdateSuccess) {
          emitToUser(email, SOCKET_EVENTS.INVENTORY_UPDATE, {
            message: 'Inventory updated after sale',
            billId: savedBill._id,
            updates: inventoryUpdates || [],
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`Real-time dashboard update emitted for user: ${email}`);
      } catch (wsError) {
        // Don't fail the sale if WebSocket emission fails
        console.error('Error emitting real-time updates:', wsError);
      }
      // --- End WebSocket updates ---

      // --- Send Success Response ---
      return res.status(201).json({
          message: 'Sale bill created successfully',
          bill: savedBill,
          inventoryUpdated: inventoryUpdateSuccess,
          customerRecordUpdated: customerUpdateSuccess
      });

  } catch (error) {
      // --- Handle Errors ---
      console.error('Error creating sale bill:', error);
      // Check for Mongoose validation errors specifically
      if (error.name === 'ValidationError') {
          // Extract meaningful messages from validation errors
          const messages = Object.values(error.errors).map(val => val.message);
          return res.status(400).json({ message: messages.join(', '), error: error.message });
      }
      // Generic server error
      return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};




// controllers/billController.js
export const getPurchaseHistory = async (req, res) => {
  try {
    const { gstNo } = req.params;
    const { itemName, batch } = req.query;

    // Validate GST number format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNo)) {
      return res.status(400).json({ message: "Invalid GST format" });
    }

    // Aggregation Pipeline
    const result = await CustomerPurchase.aggregate([
      { $match: { gstNo } },
      { $unwind: "$purchaseHistory" },
      { $unwind: "$purchaseHistory.items" },
      { $match: { 
        "purchaseHistory.items.itemName": itemName,
        "purchaseHistory.items.batch": batch 
      }},
      { $group: {
        _id: null,
        totalPurchased: { $sum: "$purchaseHistory.items.quantity" },
        purchases: {
          $push: {
            date: "$purchaseHistory.date",
            invoiceNumber: "$purchaseHistory.invoiceNumber",
            quantity: "$purchaseHistory.items.quantity",
            rate: "$purchaseHistory.items.rate",
            discount: "$purchaseHistory.items.discount",
            expiryDate: "$purchaseHistory.items.expiryDate"
          }
        }
      }}
    ]);

    // Handle no results
    if (!result.length || result[0].purchases.length === 0) {
      return res.status(404).json({ message: "No purchases found" });
    }

    // Response structure
    res.status(200).json({
      data: {
        gstNo,
        itemName,
        batch,
        totalPurchased: result[0].totalPurchased,
        purchases: result[0].purchases
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createReturnBill = async (req, res) => {
    try {
        // Initialize maps at the start using Map objects
        const soldItemsMap = new Map();
        const returnedQuantityMap = new Map();

        const {
            date,
            receiptNumber,
            customerName,
            items,
            email: emailFromBody,
            totalAmount,
            totalDiscount,
            gstAmount,
            netAmount
        } = req.body;

        // Get authenticated user's email
        const authenticatedEmail = req.user?.email;

        // For backend testing: if email is provided in body, it must match authenticated email
        // For frontend: must have authenticated email
        if (!authenticatedEmail) {
            return res.status(401).json({
                message: 'Authentication required. Please log in.'
            });
        }

        // If email is provided in body (backend testing), verify it matches authenticated email
        if (emailFromBody && emailFromBody !== authenticatedEmail) {
            return res.status(403).json({
                message: 'Email in request does not match authenticated user',
                debug: {
                    providedEmail: emailFromBody,
                    authenticatedEmail: authenticatedEmail
                }
            });
        }

        // Use authenticated email
        const email = authenticatedEmail;

        console.log('Return Bill Request:', {
            customerName,
            email,
            itemsToReturn: items,
            authenticatedUser: req.user?.email
        });

        // Basic validation including email
        if (!date || !receiptNumber || !customerName || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                message: 'All fields are required',
                missingFields: {
                    date: !date,
                    receiptNumber: !receiptNumber,
                    customerName: !customerName,
                    items: !items || !Array.isArray(items) || items.length === 0
                }
            });
        }

        // First, get all unique customer names from sale bills for this email
        const allSaleBills = await SaleBill.find({ email });
        const uniqueCustomers = [...new Set(allSaleBills.map(bill => bill.partyName))];
        console.log('Available customers:', uniqueCustomers);

        // Get all sale bills for this customer with more flexible matching
        const saleBills = await SaleBill.find({
            email,
            $or: [
                { partyName: customerName }, // Exact match
                { partyName: { $regex: new RegExp(`^${customerName}$`, 'i') } }, // Case-insensitive exact match
                { customerName: customerName }, // Exact match on customerName field
                { customerName: { $regex: new RegExp(`^${customerName}$`, 'i') } } // Case-insensitive exact match on customerName field
            ]
        });

        console.log('Found sale bills:', {
            count: saleBills.length,
            customerName,
            email,
            matchedCustomers: saleBills.map(bill => bill.partyName || bill.customerName)
        });

        if (saleBills.length === 0) {
            // Get suggestions for customer name
            const suggestions = uniqueCustomers.filter(name => 
                name.toLowerCase().includes(customerName.toLowerCase()) ||
                customerName.toLowerCase().includes(name.toLowerCase())
            );

                return res.status(400).json({
                message: `No sales found for customer: ${customerName}`,
                suggestions: suggestions.length > 0 ? {
                    message: "Did you mean one of these customers?",
                    customers: suggestions
                } : undefined
                });
            }

        // Log all sold items for debugging
        const soldItems = saleBills.flatMap(bill => 
            bill.items.map(item => ({
                    itemName: item.itemName,
                batch: item.batch,
                quantity: item.quantity,
                billPartyName: bill.partyName || bill.customerName
            }))
        );
        console.log('Items previously sold to customer:', soldItems);

        // Process sale bills and populate soldItemsMap
        saleBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    const key = `${item.itemName.toLowerCase()}-${item.batch}`;
                    const currentData = soldItemsMap.get(key) || {
                        totalSold: 0,
                        purchaseRate: item.purchaseRate,
                        mrp: item.mrp,
                        gstPercentage: item.gstPercentage,
                        customerNames: new Set()
                    };
                    currentData.totalSold += parseInt(item.quantity) || 0;
                    currentData.customerNames.add(bill.partyName || bill.customerName);
                    soldItemsMap.set(key, currentData);
                });
            }
        });

        console.log('Sold items map:', Array.from(soldItemsMap.entries()).map(([key, value]) => ({
            key,
            totalSold: value.totalSold,
            customerNames: Array.from(value.customerNames)
        })));

        // Get existing return bills
        const returnBills = await ReturnBill.find({
                email,
            $or: [
                { customerName: customerName },
                { customerName: { $regex: new RegExp(`^${customerName}$`, 'i') } }
            ]
            });

        console.log('Found return bills:', {
            count: returnBills.length,
            customerName
        });

        // Process return bills and populate returnedQuantityMap
        returnBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    const key = `${item.itemName.toLowerCase()}-${item.batch}`;
                    const currentQuantity = returnedQuantityMap.get(key) || 0;
                    returnedQuantityMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                });
            }
        });

        console.log('Returned quantities map:', Array.from(returnedQuantityMap.entries()));

        // Validate each item is returnable
        for (const item of items) {
            const key = `${item.itemName.toLowerCase()}-${item.batch}`;
            console.log('Checking item:', {
                itemName: item.itemName,
                batch: item.batch,
                key: key,
                soldData: soldItemsMap.get(key),
                returnedQuantity: returnedQuantityMap.get(key) || 0
            });

            const soldData = soldItemsMap.get(key);
            const returnedQuantity = returnedQuantityMap.get(key) || 0;

            if (!soldData) {
                return res.status(400).json({
                    message: `Item ${item.itemName} (Batch: ${item.batch}) was not sold to this customer`,
                    debug: {
                        availableItems: Array.from(soldItemsMap.keys()),
                        requestedKey: key,
                        suggestion: "Please check the item name and batch number"
                    }
                });
            }

            const returnableQuantity = soldData.totalSold - returnedQuantity;
            if (item.quantity > returnableQuantity) {
                return res.status(400).json({
                    message: `Return quantity (${item.quantity}) exceeds returnable quantity (${returnableQuantity}) for item ${item.itemName} (Batch: ${item.batch})`
                });
            }
        }

        // Generate return invoice number
        const returnInvoiceNumber = `RET${Date.now().toString().slice(-6)}`;

        // Create return bill
        const returnBill = new ReturnBill({
            returnInvoiceNumber,
            date,
            receiptNumber,
            customerName,
            items,
            totalAmount,
            totalDiscount,
            gstAmount,
            netAmount,
            email
        });

        await returnBill.save();

        // Update inventory
        for (const item of items) {
            await Inventory.findOneAndUpdate(
                { 
                    itemName: item.itemName, 
                    batch: item.batch,
                    email
                },
                { $inc: { quantity: item.quantity } }
            );
        }

        res.status(201).json({
            success: true,
            message: 'Return bill created successfully',
            returnBill
        });
    } catch (error) {
        console.error('Error in createReturnBill:', error);
        res.status(500).json({
            message: error.message,
            errorType: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Fetch batch details for a specific customer and medicine
// export const getBatchDetails = async (req, res) => {
//   const { customerName, itemName } = req.query;

//   if (!customerName || !itemName) {
//     return res.status(400).json({
//       success: false,
//       message: "Customer name and medicine name are required.",
//     });
//   }

//   try {
//     const purchases = await CustomerPurchase.find({
//       customerName,
//       "items.itemName": itemName,
//     });

//     if (purchases.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No purchases found for this customer and medicine.",
//       });
//     }

//     const batchDetails = purchases.flatMap((purchase) =>
//       purchase.items
//         .filter((item) => item.itemName === itemName)
//         .map((item) => ({
//           batch: item.batch,
//           quantity: item.quantity,
//           mrp: item.mrp,
//           discount: item.discount || 0,
//           amount: item.amount,
//         }))
//     );

//     return res.status(200).json({ success: true, data: batchDetails });
//   } catch (error) {
//     console.error("Error fetching batch details:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching batch details.",
//     });
//   }
// };

// export const getBatchDetails = async (req, res) => {
//   const { customerName, itemName } = req.query;

//   if (!customerName || !itemName) {
//     return res.status(400).json({
//       success: false,
//       message: "Customer name and medicine name are required.",
//     });
//   }

//   try {
//     const purchases = await CustomerPurchase.find({
//       customerName,
//       "items.itemName": itemName,
//     });

//     if (purchases.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No purchases found for this customer and medicine.",
//       });
//     }

//     const batchDetails = purchases.flatMap((purchase) =>
//       purchase.items
//         .filter((item) => item.itemName === itemName)
//         .map((item) => ({
//           batch: item.batch,
//           quantity: item.quantity,
//           mrp: item.mrp,
//           discount: item.discount || 0,
//           amount: item.amount,
//         }))
//     );

//     return res.status(200).json({ success: true, data: batchDetails });
//   } catch (error) {
//     console.error("Error fetching batch details:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching batch details.",
//     });
//   }
// };


export const getBatchDetails = async (req, res) => {
  const { customerName, itemName } = req.query;

  // Validate required query parameters
  if (!customerName || !itemName) {
    return res.status(400).json({
      success: false,
      message: "Customer name and medicine name are required.",
    });
  }

  try {
    // Fetch purchases matching customer name and item name
    const purchases = await CustomerPurchase.find({
      customerName,
      "items.itemName": { $regex: new RegExp('^' + itemName + '$', 'i') }, // Case-insensitive match
    });

    // If no matching purchases are found
    if (!purchases || purchases.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No purchases found for this customer and medicine.",
      });
    }

    // Extract batch details for the specified item
    const batchDetails = purchases.flatMap((purchase) =>
      purchase.items
        .filter((item) => item.itemName.toLowerCase() === itemName.toLowerCase()) // Case-insensitive comparison
        .map((item) => ({
          batch: item.batch,
          quantity: item.quantity || 0,
          mrp: item.mrp || 0,
          discount: item.discount || 0,
          amount: item.amount || 0,
        }))
    );

    // Return extracted batch details
    return res.status(200).json({ success: true, data: batchDetails });
  } catch (error) {
    console.error("Error fetching batch details:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching batch details.",
      error: error.message,
    });
  }
};



// Create a return bill
// export const createReturnBill = async (req, res) => {
//   const { customerName, items, returnInvoiceNumber } = req.body;

//   if (!customerName || !items || items.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Customer name and return items are required.",
//     });
//   }

//   try {
//     const returnBill = new ReturnBill({
//       customerName,
//       returnInvoiceNumber,
//       date: new Date(),
//       items,
//     });

//     await returnBill.save();

//     return res.status(201).json({
//       success: true,
//       message: "Return bill created successfully.",
//       data: returnBill,
//     });
//   } catch (error) {
//     console.error("Error creating return bill:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error creating return bill.",
//     });
//   }
// };


/**
 * Get all Bills (Purchase, Sale, Return)
 */
export const getBills = async (req, res) => {
    const id = req.body.id; 
    try {
        const bill = await Bill.findById(id).populate('originalBillNumber');
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.status(200).json(bill);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bill', error: error.message });
    }
};

// export const getCustomerPurchases = async (req, res) => {
//   try {
//       const { customerName } = req.params;

//       if (!customerName) {
//           return res.status(400).json({ message: "Customer name is required." });
//       }

//       const customerPurchases = await CustomerPurchase.findOne({ customerName });

//       if (!customerPurchases) {
//           return res.status(404).json({ message: `No purchases found for customer: ${customerName}` });
//       }

//       return res.status(200).json({ customerPurchases });
//   } catch (error) {
//       return res.status(500).json({
//           message: "Error fetching customer purchases.",
//           error: error.message,
//       });
//   }
// };

export const getCustomerPurchases = async (req, res) => {
  const { customerName } = req.params;

  if (!customerName) {
    return res.status(400).json({ message: "Customer name is required." });
  }

  try {
    const customerPurchases = await CustomerPurchase.findOne({
      customerName: new RegExp(`^${customerName}$`, 'i'),
    }).populate('items'); // Populate if `items` references another schema

    if (!customerPurchases) {
      return res.status(404).json({ message: `No purchases found for ${customerName}` });
    }

    return res.status(200).json({ success: true, data: customerPurchases });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching customer purchases.",
      error: error.message,
    });
  }
};


// export const getInventory = async (req, res) => {
//   const { email } = req.query;  // Get email from query parameters

//   if (!email) {
//       return res.status(400).json({ message: 'Email is required' });
//   }

//   try {
//       // Fetch inventory items associated with the user's email
//       const emailInventory = await Inventory.find({ email: email });

//       // Check if any inventory items were found
//       if (!emailInventory || emailInventory.length === 0) {
//           return res.status(404).json({ message: 'No inventory items found for this email' });
//       }

//       res.status(200).json({ inventory: emailInventory });
//   } catch (error) {
//       // If an error occurs, send a 500 error
//       res.status(500).json({ message: 'Error retrieving inventory items', error: error.message });
//   }
// };

// Get the next invoice number
export const getNextInvoiceNumber = async (req, res) => {
  try {
      const { email } = req.body;
      // Prefer email from authenticated user (req.user set by middleware)
      const userEmail = req.user?.email || email;

      console.log("Request for next invoice number. User Email:", userEmail);

      if (!userEmail) {
          console.log("Email is missing in request");
          return res.status(400).json({ message: "Email is required" });
      }

      // --- Use Aggregation with more flexible matching ---
      const result = await SaleBill.aggregate([
          // 1. Match documents for this user
          { $match: { email: userEmail } },
          
          // 2. Match only invoices with the proper format
          { $match: { saleInvoiceNumber: { $regex: /^INV\d+$/ } } },
          
          // 3. Create a field with the numeric part extracted and converted to integer
          {
              $addFields: {
                  numericPart: {
                      $toInt: {
                          $regexFind: {
                              input: "$saleInvoiceNumber",
                              regex: /\d+$/
                          }.match
                      }
                  }
              }
          },
          
          // 4. Sort by this numeric field in descending order
          { $sort: { numericPart: -1 } },
          
          // 5. Only take the highest one
          { $limit: 1 },
          
          // 6. Project just the numeric part we need
          { $project: { numericPart: 1, _id: 0 } }
      ]);

      let lastNumber = 0; // Default start
      
      // Check if we got a valid result
      if (result.length > 0 && result[0].numericPart !== undefined && !isNaN(result[0].numericPart)) {
          lastNumber = parseInt(result[0].numericPart, 10);
          console.log("Found last invoice number's numeric part:", lastNumber);
      } else {
          // Fallback: If the aggregation fails, try a simpler query
          console.log("Aggregation didn't return results, trying regular find query...");
          
          const lastInvoice = await SaleBill.findOne({ 
              email: userEmail,
              saleInvoiceNumber: { $regex: /^INV\d+$/ }
          }).sort({ createdAt: -1 });
          
          if (lastInvoice && lastInvoice.saleInvoiceNumber) {
              // Extract the numeric part using regex
              const match = lastInvoice.saleInvoiceNumber.match(/^INV(\d+)$/);
              if (match && match[1]) {
                  lastNumber = parseInt(match[1], 10);
                  console.log("Found last invoice from regular query:", lastNumber);
              }
          } else {
              console.log("No previous valid invoice found, starting sequence from 0.");
          }
      }

      // Ensure lastNumber is a valid number
      if (isNaN(lastNumber)) {
          console.log("Warning: lastNumber is NaN, resetting to 0");
          lastNumber = 0;
      }

      // Calculate the next number
      const nextNumber = lastNumber + 1;
      console.log("Calculated next number:", nextNumber);

      // Format the next invoice number (e.g., INV001, INV010, INV100)
      const invoiceNumber = `INV${String(nextNumber).padStart(3, '0')}`;
      console.log("Generated invoice number:", invoiceNumber);

      // Send the successfully generated number
      return res.status(200).json({ invoiceNumber });

  } catch (error) {
      console.error('Error in getNextInvoiceNumber:', error);
      
      // More detailed error handling
      if (error.name === 'MongoServerError') {
          return res.status(500).json({
              message: 'Database server error',
              error: error.message
          });
      } else if (error.name === 'ValidationError') {
          return res.status(400).json({
              message: 'Validation error',
              error: error.message
          });
      }
      
      // Generic error response
      return res.status(500).json({
          message: 'Error getting next invoice number',
          error: error.message
      });
  }
};
export const getMedicineSalesDetails = async (req, res) => {
    try {
        const { medicineName, startDate, endDate, partyName } = req.query;
        const userId = req.user.id;
        const email = req.user.email;

        console.log('Request parameters:', {
            medicineName,
            startDate,
            endDate,
            partyName,
            userId,
            email
        });

        // Validate required fields
        if (!medicineName) {
            return res.status(400).json({ message: 'Medicine name is required' });
        }

        // Build the base query
        const query = {
            $and: [
                {
                    $or: [
                        { userId: userId },
                        { email: email }
                    ]
                },
                {
                    'items.itemName': { $regex: new RegExp(medicineName, 'i') }
                }
            ]
        };

        // Add date range filter if provided
        if (startDate || endDate) {
            query.$and.push({
                date: {
                    ...(startDate && { $gte: new Date(startDate) }),
                    ...(endDate && { $lte: new Date(endDate) })
                }
            });
        }

        // Add party name filter if provided - using exact match
        if (partyName) {
            query.$and.push({
                partyName: partyName // Exact match for party name
            });
        }

        console.log('MongoDB Query:', JSON.stringify(query, null, 2));

        // Find all sale bills matching the criteria
        const saleBills = await SaleBill.find(query);

        console.log(`Found ${saleBills.length} sale bills matching criteria`);

        if (saleBills.length === 0) {
            return res.status(404).json({ 
                message: 'No sales found for the specified criteria',
                debug: {
                    query: query,
                    filters: {
                        medicineName,
                        dateRange: {
                            start: startDate,
                            end: endDate
                        },
                        partyName
                    }
                }
            });
        }

        // Calculate total sales and prepare response
        let totalQuantity = 0;
        let totalAmount = 0;
        let totalDiscount = 0;

        // Prepare detailed response
        const salesDetails = saleBills.map(bill => {
            // Find matching items in the bill
            const matchingItems = bill.items.filter(item => 
                item.itemName.toLowerCase().includes(medicineName.toLowerCase())
            );

            // Calculate totals for matching items
            matchingItems.forEach(item => {
                totalQuantity += item.quantity;
                totalAmount += (item.quantity * item.mrp);
                totalDiscount += (item.discount || 0);
            });

            // Return sale details for each matching item
            return matchingItems.map(item => ({
                saleInvoiceNumber: bill.saleInvoiceNumber,
                date: bill.date,
                partyName: bill.partyName,
                quantity: item.quantity,
                mrp: item.mrp,
                discount: item.discount || 0,
                gstNo: item.gstNo || '',
                batch: item.batch || ''
            }));
        }).flat(); // Flatten the array of arrays

        res.status(200).json({
            totalSales: totalQuantity,
            totalAmount,
            totalDiscount,
            salesDetails,
            summary: {
                totalQuantity,
                totalAmount,
                totalDiscount,
                averagePrice: totalQuantity > 0 ? (totalAmount / totalQuantity).toFixed(2) : 0
            },
            debug: {
                appliedFilters: {
                    medicineName,
                    startDate,
                    endDate,
                    partyName
                },
                resultCount: salesDetails.length,
                query: query
            }
        });
    } catch (error) {
        console.error('Error in getMedicineSalesDetails:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};



// Controller to get filtered purchase history
export const getPurchaseBillHistory = async (req, res) => {
  try {
    const { fromDate, toDate, partyName, medicineName } = req.query;
    const userEmail = req.user.email; // Extract email from authenticated user

    // Step 1: Base filter for purchase bills of the logged-in user
    const filter = {
      billType: 'purchase',
      email: userEmail,
    };

    // Step 2: Add optional filters

    // Filter by date range if provided
    if (fromDate && toDate) {
      filter.date = {
        $gte: new Date(fromDate), // Greater than or equal to fromDate
        $lte: new Date(toDate),   // Less than or equal to toDate
      };
    }

    // Filter by party name if provided
    if (partyName) {
      filter.partyName = { $regex: new RegExp(partyName, 'i') }; // Case-insensitive search
    }

    // Step 3: Fetch filtered bills
    const allBills = await Bill.find(filter);

    let filteredBills = allBills;

    // Step 4: Filter by medicine name if provided
    if (medicineName) {
      filteredBills = allBills.filter(bill =>
        bill.items.some(item =>
          item.itemName.toLowerCase().includes(medicineName.toLowerCase()) // Case-insensitive search for itemName
        )
      );
    }

    // Step 5: Return result
    if (filteredBills.length === 0) {
      return res.status(404).json({ success: false, message: 'No purchase bills found matching the criteria.' });
    }

    res.status(200).json({ success: true, data: filteredBills });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching purchase history.' });
  }
};

// Get sale bill details for return
export const getSaleBillDetails = async (req, res) => {
    try {
        const { billId } = req.params;
        const bill = await Bill.findById(billId);
        
        if (!bill) {
            return res.status(404).json({ message: 'Sale bill not found' });
        }

        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get medicines by party name
export const getMedicinesByParty = async (req, res) => {
    try {
        const { partyName } = req.query;
        const email = req.user?.email || req.query.email;
        
        console.log('Request parameters:', { partyName, email });
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find all sale bills for this email and exact party name
        const saleBills = await SaleBill.find({ 
            email: email.toLowerCase(),
            partyName: partyName // Exact match for party name
        });

        console.log('Total bills found for email and party:', saleBills.length);

        // If no bills found at all, return early
        if (saleBills.length === 0) {
            return res.status(404).json({ 
                message: 'No sales found for this party',
                debug: {
                    email,
                    partyName,
                    totalBills: 0
                }
            });
        }

        // Aggregate medicines and their quantities
        const medicineMap = new Map();
        
        saleBills.forEach(bill => {
            bill.items.forEach(item => {
                const key = `${item.itemName}-${item.batch}`;
                if (medicineMap.has(key)) {
                    const existing = medicineMap.get(key);
                    const newQuantity = existing.quantity + item.quantity;
                    const newAmount = existing.totalAmount + (item.quantity * item.mrp);
                    
                    // Update the entry with new totals and weighted average MRP
                    medicineMap.set(key, {
                        itemName: item.itemName,
                        batch: item.batch,
                        quantity: newQuantity,
                        mrp: newAmount / newQuantity, // Calculate weighted average MRP
                        totalAmount: newAmount
                    });
                } else {
                    medicineMap.set(key, {
                        itemName: item.itemName,
                        batch: item.batch,
                        quantity: item.quantity,
                        mrp: item.mrp,
                        totalAmount: item.quantity * item.mrp
                    });
                }
            });
        });

        // Convert Map to array and sort by medicine name
        const medicines = Array.from(medicineMap.values())
            .sort((a, b) => a.itemName.localeCompare(b.itemName));

        // Format numbers to 2 decimal places
        const formattedMedicines = medicines.map(m => ({
            ...m,
            mrp: Number(m.mrp.toFixed(2)),
            totalAmount: Number(m.totalAmount.toFixed(2))
        }));

        console.log('Final results:', {
            totalBills: saleBills.length,
            medicinesFound: medicines.length,
            medicines: formattedMedicines
        });

        res.json(formattedMedicines);
    } catch (error) {
        console.error('Error in getMedicinesByParty:', error);
        res.status(500).json({ message: error.message });
    }
};


// controllers/ExpiryController.js



// Get expiring items within date range for a specific party
export const getExpiringItems = async (req, res) => {
  try {
    const { partyName, startDate, endDate } = req.query;
    const { email } = req.user;

    if (!email) {
      return res.status(400).json({ message: 'User email is required' });
    }

    if (!partyName) {
      return res.status(400).json({ message: 'Party name is required' });
    }

    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required' });
    }

    // Query parameters for filtering
    const query = {
      email,
      partyName,
      expiryDate: {
        $gte: new Date(startDate),
        $lte: endDate ? new Date(endDate) : new Date()
      },
      quantity: { $gt: 0 } // Only include items with quantity greater than 0
    };

    // Fetch inventory items matching the criteria
    const expiringItems = await Inventory.find(query).sort({ expiryDate: 1 });

    if (!expiringItems.length) {
      return res.status(404).json({ 
        message: 'No expiring items found for the specified party and date range' 
      });
    }

    res.status(200).json(expiringItems);
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    res.status(500).json({ 
      message: 'Error fetching expiring items', 
      error: error.message 
    });
  }
};

// Create expiry bill and update inventory
export const createExpiryBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      partyName, 
      startDate, 
      endDate, 
      selectedItems,
      totalItems,
      totalQuantity,
      totalValue,
      notes
    } = req.body;
    
    const { email } = req.user;

    if (!email) {
      return res.status(400).json({ message: 'User email is required' });
    }

    if (!partyName || !selectedItems || selectedItems.length === 0) {
      return res.status(400).json({ 
        message: 'Party name and at least one item are required' 
      });
    }

    // Generate a unique bill number
    const billCount = await ExpiryBill.countDocuments({ email });
    const expiryBillNumber = `EXP${String(billCount + 1).padStart(3, '0')}`;

    // Create the expiry bill
    const expiryBill = new ExpiryBill({
      expiryBillNumber,
      partyName,
      startDate,
      endDate: endDate || new Date(),
      items: selectedItems,
      totalItems,
      totalQuantity,
      totalValue,
      notes,
      email,
      createdAt: new Date()
    });

    await expiryBill.save({ session });

    // Update inventory for each selected item
    for (const item of selectedItems) {
      // Find the inventory document
      const inventoryItem = await Inventory.findById(item._id);
      
      if (!inventoryItem) {
        throw new Error(`Inventory item with ID ${item._id} not found`);
      }

      // Ensure we don't go below zero
      const newQuantity = Math.max(0, inventoryItem.quantity - item.expiredQuantity);
      
      // Update the inventory quantity
      await Inventory.findByIdAndUpdate(
        item._id,
        { 
          $set: { quantity: newQuantity },
          $push: { 
            transactions: {
              type: 'expired',
              quantity: item.expiredQuantity,
              date: new Date(),
              reference: expiryBillNumber
            }
          }
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ 
      message: 'Expiry bill created successfully', 
      expiryBill 
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error creating expiry bill:', error);
    res.status(500).json({ 
      message: 'Error creating expiry bill', 
      error: error.message 
    });
  }
};

// Get all expiry bills for a user
export const getExpiryBills = async (req, res) => {
  try {
    const { email } = req.user;
    
    if (!email) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const expiryBills = await ExpiryBill.find({ email })
      .sort({ createdAt: -1 });

    res.status(200).json(expiryBills);
  } catch (error) {
    console.error('Error fetching expiry bills:', error);
    res.status(500).json({ 
      message: 'Error fetching expiry bills', 
      error: error.message 
    });
  }
};

// Get a specific expiry bill by ID
export const getExpiryBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.user;

    if (!email) {
      return res.status(400).json({ message: 'User email is required' });
    }

    const expiryBill = await ExpiryBill.findOne({ _id: id, email });

    if (!expiryBill) {
      return res.status(404).json({ message: 'Expiry bill not found' });
    }

    res.status(200).json(expiryBill);
  } catch (error) {
    console.error('Error fetching expiry bill:', error);
    res.status(500).json({ 
      message: 'Error fetching expiry bill', 
      error: error.message 
    });
  }
};

// Get a list of unique clients (party names)
export const getClientsList = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Get unique party names from SaleBill model
    const clients = await SaleBill.aggregate([
      { $match: { email } },
      { $group: { _id: "$partyName" } },
      { $project: { _id: 0, name: "$_id" } },
      { $sort: { name: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients list:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this to an existing function that creates a bill (e.g., createSaleBill)
// After successful bill creation:

// Example of how to add WebSocket emission to an existing function
// Find the function that handles bill creation and add the emit call after successful save
/*
const savedBill = await newBill.save();

// Emit real-time update
if (savedBill && email) {
  // Calculate daily sales total
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dailySales = await Bill.aggregate([
    {
      $match: {
        email: email,
        billType: 'sale',
        date: { $gte: today, $lt: tomorrow }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  const monthlySales = await Bill.aggregate([
    {
      $match: {
        email: email,
        billType: 'sale',
        date: {
          $gte: new Date(today.getFullYear(), today.getMonth(), 1),
          $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
        }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  // Count unique customers this month
  const uniqueCustomers = await Bill.distinct('customerName', {
    email: email,
    billType: 'sale',
    date: {
      $gte: new Date(today.getFullYear(), today.getMonth(), 1),
      $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
    }
  });
  
  // Emit dashboard update with sales data
  emitToUser(email, SOCKET_EVENTS.DASHBOARD_UPDATE, {
    dailySales: dailySales.length > 0 ? dailySales[0].totalAmount : 0,
    monthlySales: monthlySales.length > 0 ? monthlySales[0].totalAmount : 0,
    activeCustomers: uniqueCustomers.length,
    timestamp: new Date().toISOString()
  });
}
*/