import PurchaseReturnBill from '../models/PurchaseReturnBill.js';
import Bill from '../models/Bill.js';
import Inventory from '../models/Inventory.js';
import SaleBill from '../models/SaleBillModel.js';
import { generatePurchaseReturnPDF } from '../utils/pdfGenerator.js';

// Get returnable quantities for a supplier
export const getReturnableQuantities = async (req, res) => {
    try {
        const { email, supplierName } = req.query;
        console.log('Query params:', { email, supplierName });

        if (!email || !supplierName) {
            return res.status(400).json({ message: 'Email and supplier name are required' });
        }

        // Get all purchase bills for the supplier
        const purchaseBills = await Bill.find({
            email,
            partyName: supplierName
        });

        console.log('Found purchase bills for supplier:', purchaseBills.length);
        console.log('Purchase bills:', JSON.stringify(purchaseBills.map(bill => ({
            billType: bill.billType,
            partyName: bill.partyName,
            items: bill.items.map(item => ({
                itemName: item.itemName,
                batch: item.batch,
                quantity: item.quantity
            }))
        })), null, 2));

        // Get all return bills for the supplier
        const returnBills = await PurchaseReturnBill.find({
            email,
            supplierName
        });

        console.log('Found return bills for supplier:', returnBills.length);
        console.log('Return bills:', JSON.stringify(returnBills.map(bill => ({
            supplierName: bill.supplierName,
            items: bill.items.map(item => ({
                itemName: item.itemName,
                batch: item.batch,
                quantity: item.quantity
            }))
        })), null, 2));

        // Get all sale bills for calculating sold quantities
        const saleBills = await SaleBill.find({
            email
        });

        console.log('Found sale bills:', saleBills.length);
        console.log('Sale bills:', JSON.stringify(saleBills.map(bill => ({
            partyName: bill.partyName,
            items: bill.items.map(item => ({
                itemName: item.itemName,
                batch: item.batch,
                quantity: item.quantity
            }))
        })), null, 2));

        // Create a map to store total purchased quantities
        const purchasedMap = new Map();
        purchaseBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    if (item.itemName && item.batch && item.quantity) {
                        const key = `${item.itemName.toLowerCase()}-${item.batch}`;
                        const currentData = purchasedMap.get(key) || {
                            itemName: item.itemName,
                            batch: item.batch,
                            quantity: 0,
                            purchaseRate: item.purchaseRate || 0,
                            mrp: item.mrp || 0,
                            expiryDate: item.expiryDate
                        };
                        currentData.quantity += parseInt(item.quantity) || 0;
                        purchasedMap.set(key, currentData);
                    }
                });
            }
        });

        // Create a map to store total returned quantities
        const returnedMap = new Map();
        returnBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    if (item.itemName && item.batch && item.quantity) {
                        const key = `${item.itemName.toLowerCase()}-${item.batch}`;
                        const currentQuantity = returnedMap.get(key) || 0;
                        returnedMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                    }
                });
            }
        });

        // Create a map to store total sold quantities
        const soldMap = new Map();
        saleBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    if (item.itemName && item.batch && item.quantity) {
                        const key = `${item.itemName.toLowerCase()}-${item.batch}`;
                        const currentQuantity = soldMap.get(key) || 0;
                        soldMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                    }
                });
            }
        });

        // Calculate returnable quantities
        const returnableQuantities = [];
        purchasedMap.forEach((purchasedData, key) => {
            const returnedQuantity = returnedMap.get(key) || 0;
            const soldQuantity = soldMap.get(key) || 0;
            const returnableQuantity = purchasedData.quantity - soldQuantity - returnedQuantity;

            if (returnableQuantity > 0) {
                returnableQuantities.push({
                    itemName: purchasedData.itemName,
                    batch: purchasedData.batch,
                    purchasedQuantity: purchasedData.quantity,
                    soldQuantity: soldQuantity,
                    returnedQuantity: returnedQuantity,
                    returnableQuantity: returnableQuantity,
                    purchaseRate: purchasedData.purchaseRate,
                    mrp: purchasedData.mrp,
                    expiryDate: purchasedData.expiryDate
                });
            }
        });

        // Sort by item name and batch
        returnableQuantities.sort((a, b) => {
            if (a.itemName.toLowerCase() === b.itemName.toLowerCase()) {
                return a.batch.localeCompare(b.batch);
            }
            return a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase());
        });

        res.json(returnableQuantities);
    } catch (error) {
        console.error('Error getting returnable quantities:', error);
        res.status(500).json({ message: 'Error getting returnable quantities', error: error.message });
    }
};

// Create a purchase return bill
export const createPurchaseReturnBill = async (req, res) => {
    try {
        const {
            date,
            receiptNumber,
            supplierName,
            supplierGST,
            items,
            email: emailFromBody
        } = req.body;

        // Get email from authenticated user
        const authenticatedEmail = req.user?.email;
        const email = authenticatedEmail || emailFromBody;

        // Validate required fields
        if (!date || !receiptNumber || !supplierName || !supplierGST || !items || !email) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        console.log('Processing purchase return for:', {
            supplierName,
            email,
            itemCount: items.length
        });

        // Get all purchase bills for the supplier
        const purchaseBills = await Bill.find({
            email,
            partyName: { $regex: new RegExp(`^${supplierName}$`, 'i') }
        });

        // Get all return bills for the supplier
        const returnBills = await PurchaseReturnBill.find({
            email,
            supplierName: { $regex: new RegExp(`^${supplierName}$`, 'i') }
        });

        // Get all sale bills for calculating sold quantities
        const saleBills = await SaleBill.find({
            email
        });

        // Create maps to store quantities
        const purchasedMap = new Map();
        const returnedMap = new Map();
        const soldMap = new Map();

        // Calculate total purchased quantities
        purchaseBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    if (item.itemName && item.batch && item.quantity) {
                        const key = `${item.itemName.toLowerCase()}-${item.batch.toLowerCase()}`;
                        const currentQuantity = purchasedMap.get(key) || 0;
                        purchasedMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                    }
                });
            }
        });

        // Calculate total returned quantities
        returnBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    if (item.itemName && item.batch && item.quantity) {
                        const key = `${item.itemName.toLowerCase()}-${item.batch.toLowerCase()}`;
                        const currentQuantity = returnedMap.get(key) || 0;
                        returnedMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                    }
                });
            }
        });

        // Calculate total sold quantities
        saleBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    if (item.itemName && item.batch && item.quantity) {
                        const key = `${item.itemName.toLowerCase()}-${item.batch.toLowerCase()}`;
                        const currentQuantity = soldMap.get(key) || 0;
                        soldMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                    }
                });
            }
        });

        // Validate each item is returnable
        for (const item of items) {
            const key = `${item.itemName.toLowerCase()}-${item.batch.toLowerCase()}`;
            const purchasedQuantity = purchasedMap.get(key) || 0;
            const returnedQuantity = returnedMap.get(key) || 0;
            const soldQuantity = soldMap.get(key) || 0;

            // Calculate returnable quantity
            const returnableQuantity = purchasedQuantity - soldQuantity - returnedQuantity;

            if (returnableQuantity <= 0) {
                return res.status(400).json({ 
                    message: `Item ${item.itemName} (Batch: ${item.batch}) is not returnable. Purchase: ${purchasedQuantity}, Sold: ${soldQuantity}, Already Returned: ${returnedQuantity}` 
                });
            }

            if (item.quantity > returnableQuantity) {
                return res.status(400).json({ 
                    message: `Return quantity (${item.quantity}) exceeds returnable quantity (${returnableQuantity}) for item ${item.itemName} (Batch: ${item.batch})` 
                });
            }

            // Verify item exists in inventory with sufficient quantity
            const inventoryItem = await Inventory.findOne({
                email,
                itemName: { $regex: new RegExp(`^${item.itemName}$`, 'i') },
                batch: { $regex: new RegExp(`^${item.batch}$`, 'i') }
            });

            if (!inventoryItem) {
                return res.status(400).json({
                    message: `Item ${item.itemName} (Batch: ${item.batch}) not found in inventory`
                });
            }

            if (inventoryItem.quantity < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient quantity in inventory for ${item.itemName} (Batch: ${item.batch}). Available: ${inventoryItem.quantity}, Requested: ${item.quantity}`
                });
            }
        }

        // Calculate totals for each item
        const processedItems = items.map(item => {
            const totalAmount = item.purchaseRate * item.quantity;
            const discountAmount = (totalAmount * item.discount) / 100;
            const amountAfterDiscount = totalAmount - discountAmount;
            const gstAmount = (amountAfterDiscount * item.gstPercentage) / 100;
            const netAmount = amountAfterDiscount + gstAmount;

            return {
                ...item,
                totalAmount,
                discountAmount,
                gstAmount,
                netAmount
            };
        });

        // Calculate bill totals
        const billTotals = processedItems.reduce((acc, item) => {
            acc.totalAmount += item.totalAmount;
            acc.totalDiscount += item.discountAmount;
            acc.totalGst += item.gstAmount;
            acc.netAmount += item.netAmount;
            return acc;
        }, {
            totalAmount: 0,
            totalDiscount: 0,
            totalGst: 0,
            netAmount: 0
        });

        // Generate return invoice number
        const returnInvoiceNumber = `PRET${Date.now().toString().slice(-6)}`;

        // Create return bill
        const returnBill = new PurchaseReturnBill({
            returnInvoiceNumber,
            date,
            receiptNumber,
            supplierName,
            supplierGST,
            items: processedItems,
            ...billTotals,
            email
        });

        // Start a session for transaction
        const session = await PurchaseReturnBill.startSession();
        session.startTransaction();

        try {
            // Save the return bill
            await returnBill.save({ session });

            // Update inventory for each item
            for (const item of items) {
                console.log('Updating inventory for:', {
                    itemName: item.itemName,
                    batch: item.batch,
                    quantityToDeduct: item.quantity
                });

                const result = await Inventory.findOneAndUpdate(
                    { 
                        itemName: item.itemName, 
                        batch: item.batch,
                        email
                    },
                    { $inc: { quantity: -item.quantity } },
                    { 
                        new: true,
                        session
                    }
                );

                if (!result) {
                    throw new Error(`Failed to update inventory for ${item.itemName} (${item.batch})`);
                }

                console.log('Inventory updated:', {
                    itemName: item.itemName,
                    batch: item.batch,
                    newQuantity: result.quantity
                });
            }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            // Generate PDF
            const pdfPath = await generatePurchaseReturnPDF(returnBill);

            res.status(201).json({
                success: true,
                message: 'Purchase return bill created successfully',
                returnBill,
                pdfUrl: `/download/pdf/${returnBill.returnInvoiceNumber}.pdf`
            });
        } catch (error) {
            // If anything fails, abort the transaction
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error('Error in createPurchaseReturnBill:', error);
        res.status(500).json({
            message: error.message,
            errorType: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Helper function to get returnable quantities
const getReturnableQuantitiesForSupplier = async (email, supplierName) => {
    // Get all purchase bills for the supplier
    const purchaseBills = await Bill.find({
        email,
        partyName: { $regex: new RegExp(`^${supplierName}$`, 'i') }
    });

    // Get all return bills for the supplier
    const returnBills = await PurchaseReturnBill.find({
        email,
        supplierName: { $regex: new RegExp(`^${supplierName}$`, 'i') }
    });

    // Get all sale bills for calculating sold quantities
    const saleBills = await SaleBill.find({
        email
    });

    // Create a map to store total purchased quantities
    const purchasedMap = new Map();
    purchaseBills.forEach(bill => {
        if (bill.items && Array.isArray(bill.items)) {
            bill.items.forEach(item => {
                if (item.itemName && item.batch && item.quantity) {
                    const key = `${item.itemName.toLowerCase()}-${item.batch.toLowerCase()}`;
                    const currentData = purchasedMap.get(key) || {
                        itemName: item.itemName,
                        batch: item.batch,
                        quantity: 0,
                        purchaseRate: item.purchaseRate || 0,
                        mrp: item.mrp || 0,
                        expiryDate: item.expiryDate
                    };
                    currentData.quantity += parseInt(item.quantity) || 0;
                    purchasedMap.set(key, currentData);
                }
            });
        }
    });

    // Create a map to store total returned quantities
    const returnedMap = new Map();
    returnBills.forEach(bill => {
        if (bill.items && Array.isArray(bill.items)) {
            bill.items.forEach(item => {
                if (item.itemName && item.batch && item.quantity) {
                    const key = `${item.itemName.toLowerCase()}-${item.batch.toLowerCase()}`;
                    const currentQuantity = returnedMap.get(key) || 0;
                    returnedMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                }
            });
        }
    });

    // Create a map to store total sold quantities
    const soldMap = new Map();
    saleBills.forEach(bill => {
        if (bill.items && Array.isArray(bill.items)) {
            bill.items.forEach(item => {
                if (item.itemName && item.batch && item.quantity) {
                    const key = `${item.itemName.toLowerCase()}-${item.batch.toLowerCase()}`;
                    const currentQuantity = soldMap.get(key) || 0;
                    soldMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
                }
            });
        }
    });

    // Calculate returnable quantities
    const returnableQuantities = [];
    purchasedMap.forEach((purchasedData, key) => {
        const returnedQuantity = returnedMap.get(key) || 0;
        const soldQuantity = soldMap.get(key) || 0;

        // Calculate returnable quantity based on original purchase and current state
        const returnableQuantity = purchasedData.quantity - soldQuantity - returnedQuantity;

        // Check if the item has expired
        const today = new Date();
        const expiryDate = new Date(purchasedData.expiryDate);
        const isExpired = expiryDate < today;

        if (returnableQuantity > 0 && !isExpired) {
            returnableQuantities.push({
                itemName: purchasedData.itemName,
                batch: purchasedData.batch,
                originalPurchaseQuantity: purchasedData.quantity,
                soldQuantity: soldQuantity,
                returnedQuantity: returnedQuantity,
                returnableQuantity: returnableQuantity,
                purchaseRate: purchasedData.purchaseRate,
                mrp: purchasedData.mrp,
                expiryDate: purchasedData.expiryDate
            });
        }
    });

    // Sort by item name and batch
    returnableQuantities.sort((a, b) => {
        if (a.itemName.toLowerCase() === b.itemName.toLowerCase()) {
            return a.batch.localeCompare(b.batch);
        }
        return a.itemName.toLowerCase().localeCompare(b.itemName.toLowerCase());
    });

    return returnableQuantities;
};

// Get all purchase return bills for a supplier
export const getPurchaseReturnBills = async (req, res) => {
    try {
        const { email, supplierName } = req.query;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const query = { email };
        if (supplierName) {
            query.supplierName = supplierName;
        }

        const returnBills = await PurchaseReturnBill.find(query)
            .sort({ date: -1 });

        res.json(returnBills);
    } catch (error) {
        console.error('Error getting purchase return bills:', error);
        res.status(500).json({ message: error.message });
    }
}; 