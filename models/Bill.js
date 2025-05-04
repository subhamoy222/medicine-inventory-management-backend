import mongoose from 'mongoose';

// Item schema for individual items in a bill
const itemSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    batch: { type: String, required: true },
    quantity: { type: Number, required: true },
    purchaseRate: { type: Number, required: true },
    mrp: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    gstPercentage: { type: Number, required: true },
    pack: { type: String, required: false }, // Optional, e.g., "strip", "bottle"
    description: { type: String, required: false }, // Optional
    discount: { type: Number, required: false, default: 0 }, // Discount per item
    gstAmount: { type: Number, required: false }, // Computed GST amount (quantity * gstPercentage * purchaseRate)
    totalAmount: { type: Number, required: false } // Computed total amount per item
});

// Main bill schema
const billSchema = new mongoose.Schema({
    billType: { 
        type: String, 
        required: true, 
        enum: ['purchase', 'return'] // Only 'purchase' is supported here
    },
    supplierInvoiceNumber: { type: String, required: true },
    receiptNumber: { type: String, required: true },
    partyName: { type: String, required: true },
    date: { type: Date, required: true },
    items: [itemSchema], // Array of items in the bill
    purchaseAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    email: { type: String, required: true } // Added for inventory association
}, {
    timestamps: true
});

// Export the model
const Bill = mongoose.model('Bill', billSchema);
export default Bill;





// import mongoose from 'mongoose';

// // Item schema for individual items in a bill
// const itemSchema = new mongoose.Schema({
//     itemName: { type: String, required: true },
//     batch: { type: String, required: true },
//     quantity: { type: Number, required: true },
//     purchaseRate: { type: Number, required: true },
//     mrp: { type: Number, required: true },
//     expiryDate: { type: Date, required: true },
//     gstPercentage: { type: Number, required: true },
//     pack: { type: String, required: false }, // Optional
//     description: { type: String, required: false } // Optional
// });

// // Main bill schema
// const billSchema = new mongoose.Schema({
//     billType: { 
//         type: String, 
//         required: true, 
//         enum: [ 'purchase', 'return'] // Only 'purchase' is supported here
//     },
//     supplierInvoiceNumber: { type: String, required: true },
//     receiptNumber: { type: String, required: true },
//     partyName: { type: String, required: true },
//     date: { type: Date, required: true },
//     items: [itemSchema], // Array of items in the bill
//     purchaseAmount: { type: Number, required: true },
//     totalAmount: { type: Number, required: true },
//     discountAmount: { type: Number, required: true },
//     email: { type: String, required: true } // Added for inventory association
// }, {
//     timestamps: true
// });

// // Export the model
// const Bill = mongoose.model('Bill', billSchema);
// export default Bill;


// import mongoose from 'mongoose';

// // Item schema for individual items in a bill
// const itemSchema = new mongoose.Schema({
//     itemName: { type: String, required: true },
//     batch: { type: String, required: true },
//     quantity: { type: Number, required: true },
//     purchaseRate: { type: Number, required: true },
//     mrp: { type: Number, required: true },
//     expiryDate: { type: Date, required: true },
//     gstPercentage: { type: Number, required: true },
//     pack: { type: String, required: false }, // Optional, e.g., "strip", "bottle"
//     description: { type: String, required: false }, // Optional
//     discount: { type: Number, required: false, default: 0 }, // Discount per item
//     gstAmount: { type: Number, required: false }, // Computed GST amount (quantity * gstPercentage * purchaseRate)
//     totalAmount: { type: Number, required: false } // Computed total amount per item
// });

// // Main bill schema
// const billSchema = new mongoose.Schema({
//     billType: { 
//         type: String, 
//         required: true, 
//         enum: ['sale', 'purchase', 'return'] // Extendable with new bill types
//     },
//     supplierInvoiceNumber: { type: String, required: function () { return this.billType === 'purchase'; } },
//     receiptNumber: { type: String, required: function () { return this.billType === 'sale' || this.billType === 'return'; } },
//     partyName: { type: String, required: true }, // Supplier or Customer name
//     date: { type: Date, required: true },
//     items: [itemSchema], // Array of items in the bill
//     purchaseAmount: { type: Number, required: function () { return this.billType === 'purchase'; } }, // Sum of purchase rates for 'purchase' bills
//     saleAmount: { type: Number, required: function () { return this.billType === 'sale'; } }, // Sum of MRPs for 'sale' bills
//     totalAmount: { type: Number, required: true }, // Final total amount of the bill
//     discountAmount: { type: Number, required: true, default: 0 }, // Overall discount on the bill
//     gstAmount: { type: Number, required: true, default: 0 }, // Total GST amount
//     email: { type: String, required: true }, // Associated user's email
//     invoiceNumber: { type: String, required: true, unique: true }, // Unique invoice number for each bill
//     status: { type: String, required: true, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }, // Status of the bill
//     remarks: { type: String, required: false } // Optional remarks or notes
// }, {
//     timestamps: true
// });

// // Export the model
// const Bill = mongoose.model('Bill', billSchema);
// export default Bill;

