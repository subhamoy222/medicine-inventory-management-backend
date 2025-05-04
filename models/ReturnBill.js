import mongoose from 'mongoose';

const returnBillSchema = new mongoose.Schema({
  returnInvoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  customerGST: {
    type: String,
    required: true
  },
  items: [{
    itemName: String,
    batch: String,
    quantity: Number,
    mrp: Number,
    expiryDate: Date,
    originalInvoice: String,
    returnReason: String
  }],
  totalAmount: Number,
  email: String // Pharmacy's email
}, { timestamps: true });

export default mongoose.model('ReturnBill', returnBillSchema);