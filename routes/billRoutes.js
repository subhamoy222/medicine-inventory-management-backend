import express from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { 
  createPurchaseBill,
  createSaleBill,
  createReturnBill,
  getBills,
  getBatchDetails,
  getPurchaseHistory,
  getNextInvoiceNumber,
  getMedicineSalesDetails,
  getSaleBillDetails,
  getMedicinesByParty,
  getClientsList
} from '../controllers/billController.js';
import inventoryRoutes from './inventoryRoutes.js';
import { getPurchaseBillHistory } from '../controllers/billController.js';
import SaleBill from '../models/SaleBillModel.js';
import ReturnBill from '../models/ReturnBillModel.js';
import Inventory from '../models/Inventory.js';

const router = express.Router();

// Bill Management Routes
router.post('/purchase', isAuthenticated, createPurchaseBill);
router.post('/sale', isAuthenticated, createSaleBill);
router.post('/return', isAuthenticated, createReturnBill);

// Get bill details
router.get('/sale-bill/:billId', isAuthenticated, getSaleBillDetails);
router.get('/batch-details', isAuthenticated, getBatchDetails);
router.get('/purchase-history', isAuthenticated, getPurchaseHistory);
router.post('/next-invoice-number', isAuthenticated, getNextInvoiceNumber);
router.get('/medicine-sales', isAuthenticated, getMedicineSalesDetails);
router.get('/medicines-by-party', isAuthenticated, getMedicinesByParty);
router.get('/clients', isAuthenticated, getClientsList);

// Inventory Sub-routes
router.use('/inventory', inventoryRoutes);

// Get returnable quantities for medicines by party
router.get('/returnable-quantities', isAuthenticated, async (req, res) => {
  try {
    const { email, partyName } = req.query;
    console.log('Query params:', { email, partyName });

    if (!email || !partyName) {
      return res.status(400).json({ message: 'Email and party name are required' });
    }

    // Get all sale bills for the party (case-insensitive exact match)
    const saleBills = await SaleBill.find({
      email,
      partyName: { $regex: new RegExp(`^${partyName}$`, 'i') } // Exact match, case-insensitive
    });
    console.log('Found sale bills for party:', saleBills.length);

    // Get all return bills for the party (case-insensitive exact match)
    const returnBills = await ReturnBill.find({
      email,
      customerName: { $regex: new RegExp(`^${partyName}$`, 'i') } // Exact match, case-insensitive
    });
    console.log('Found return bills for party:', returnBills.length);

    // Create a map to store total sold quantities to this party
    const partySoldMap = new Map();
    saleBills.forEach(bill => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => {
          if (item.itemName && item.batch && item.quantity) {
            const key = `${item.itemName.toLowerCase()}-${item.batch}`;
            const currentData = partySoldMap.get(key) || {
              itemName: item.itemName,
              batch: item.batch,
              quantity: 0,
              mrp: item.mrp || 0
            };
            currentData.quantity += parseInt(item.quantity) || 0;
            partySoldMap.set(key, currentData);
          }
        });
      }
    });
    console.log('Party sold map size:', partySoldMap.size);

    // Create a map to store total returned quantities from this party
    const partyReturnedMap = new Map();
    returnBills.forEach(bill => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => {
          if (item.itemName && item.batch && item.quantity) {
            const key = `${item.itemName.toLowerCase()}-${item.batch}`;
            const currentQuantity = partyReturnedMap.get(key) || 0;
            partyReturnedMap.set(key, currentQuantity + (parseInt(item.quantity) || 0));
          }
        });
      }
    });
    console.log('Party returned map size:', partyReturnedMap.size);

    // Get purchase rates from inventory
    const inventoryItems = await Inventory.find({
      email,
      itemName: { $in: Array.from(partySoldMap.keys()).map(key => key.split('-')[0]) }
    });
    console.log('Found inventory items:', inventoryItems.length);

    // Create a map of purchase rates by item and batch
    const purchaseRateMap = new Map();
    inventoryItems.forEach(item => {
      const key = `${item.itemName.toLowerCase()}-${item.batch}`;
      purchaseRateMap.set(key, item.purchaseRate);
    });

    // Calculate returnable quantities
    const returnableQuantities = [];
    partySoldMap.forEach((soldData, key) => {
      const returnedQuantity = partyReturnedMap.get(key) || 0;
      const returnableQuantity = soldData.quantity - returnedQuantity;
      const purchaseRate = purchaseRateMap.get(key) || 0;

      if (returnableQuantity > 0) {
        returnableQuantities.push({
          itemName: soldData.itemName,
          batch: soldData.batch,
          soldQuantity: soldData.quantity, // Total sold to this specific party
          returnedQuantity: returnedQuantity, // Total returned by this specific party
          returnableQuantity: returnableQuantity, // What they can still return
          mrp: soldData.mrp,
          purchaseRate: purchaseRate
        });
      }
    });
    console.log('Returnable quantities:', returnableQuantities.length);

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
});

export default router;