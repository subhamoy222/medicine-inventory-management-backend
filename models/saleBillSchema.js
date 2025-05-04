const mongoose = require("mongoose");

const saleBillSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true },
    date: { type: Date, required: true },
    customerName: { type: String, required: true },
    email: { type: String, required: false },
    items: [
        {
            itemName: { type: String, required: true },
            batch: { type: String, required: true },
            quantity: { type: Number, required: true },
            mrp: { type: Number, required: true },
            discount: { type: Number, required: true },
            gstPercentage: { type: Number, required: true },
            expiryDate: { type: Date, required: true },
            purchaseRate: { type: Number, required: true }
        }
    ]
});

const SaleBill = mongoose.model("SaleBill", saleBillSchema);
module.exports = SaleBill;
