import mongoose from 'mongoose';

const returnBillSchema = new mongoose.Schema({
    returnInvoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    originalBillNumber: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        
    },
    date: {
        type: Date,
        required: true
    },
    receiptNumber: {
        type: String,
        required: true
    },
    customerName: {
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
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        amount: {
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
        default: 0
    },
    gstAmount: {
        type: Number,
        default: 0
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

const ReturnBill = mongoose.model('ReturnBill', returnBillSchema);
export default ReturnBill; 