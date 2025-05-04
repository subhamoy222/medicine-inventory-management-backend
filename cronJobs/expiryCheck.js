import cron from 'node-cron';
import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js'; // Adjust the path if necessary
import ExpiryBill from '../models/ExpiryBill.js'; // Adjust the path if necessary

// Cron job to check for expired items every day at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const today = new Date();
        // Get items that are expired
        const expiredItems = await Inventory.find({ expiryDate: { $lt: today } });

        for (const item of expiredItems) {
            // Create an Expiry Bill for each expired item
            const expiryBill = new ExpiryBill({
                itemName: item.itemName,
                batch: item.batch,
                expiryDate: item.expiryDate,
                quantity: item.quantity,
                purchaseRate: item.purchaseRate,
                mrp: item.mrp,
                gstPercentage: item.gstPercentage,
                description: item.description
            });

            await expiryBill.save();

            // Optionally, you can remove the expired item from inventory
            await Inventory.findByIdAndDelete(item._id);
        }

        console.log('Expired items processed and expiry bills created:', expiredItems.length);
    } catch (error) {
        console.error('Error processing expired items:', error);
    }
});
