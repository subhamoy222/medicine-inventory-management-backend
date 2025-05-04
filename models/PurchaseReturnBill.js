import mongoose from 'mongoose';

const purchaseReturnBillSchema = new mongoose.Schema({
    returnInvoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    receiptNumber: {
        type: String,
        required: true
    },
    supplierName: {
        type: String,
        required: true
    },
    supplierGST: {
        type: String,
        required: true
    },
    items: [{
        itemName: {
            type: String,
            required: true
        },
        batch: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        purchaseRate: {
            type: Number,
            required: true,
            min: 0
        },
        mrp: {
            type: Number,
            required: true,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        gstPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        expiryDate: {
            type: Date,
            required: true
        },
        totalAmount: {
            type: Number,
            required: true
        },
        discountAmount: {
            type: Number,
            required: true
        },
        gstAmount: {
            type: Number,
            required: true
        },
        netAmount: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    totalDiscount: {
        type: Number,
        required: true
    },
    totalGst: {
        type: Number,
        required: true
    },
    netAmount: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Add index for faster queries
purchaseReturnBillSchema.index({ email: 1, supplierName: 1 });
purchaseReturnBillSchema.index({ returnInvoiceNumber: 1 }, { unique: true });

const PurchaseReturnBill = mongoose.model('PurchaseReturnBill', purchaseReturnBillSchema);

export default PurchaseReturnBill; 