import mongoose from "mongoose";
const returnBillSchema = new mongoose.Schema({
  buyerGSTIN: {
    type: String,
    required: true,
    trim: true
  },
  returnInvoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sellerEmail: { // Changed from GSTIN to email
    type: String,
    required: true,
    index: true
  },
  items: [{
    itemName: { type: String, required: true },
    batch: { type: String, required: true },
    quantity: { type: Number, required: true },
    mrp: { type: Number, required: true },
    rate: { type: Number, required: true },
    expiryDate: { type: Date, required: true }
  }]
}, {
  timestamps: true
});

export default returnBillSchema;