// models/ExpiryBill.js

import mongoose from 'mongoose';

const expiryBillSchema = new mongoose.Schema({
  expiryBillNumber: {
    type: String,
    required: true,
    unique: true
  },
  partyName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  items: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    itemName: {
      type: String,
      required: true
    },
    batch: {
      type: String,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    expiredQuantity: {
      type: Number,
      required: true
    },
    mrp: {
      type: Number,
      required: true
    },
    purchaseRate: {
      type: Number,
      required: true
    },
    value: {
      type: Number,
      required: true
    }
  }],
  totalItems: {
    type: Number,
    required: true
  },
  totalQuantity: {
    type: Number,
    required: true
  },
  totalValue: {
    type: Number,
    required: true
  },
  notes: {
    type: String
  },
  email: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ExpiryBill = mongoose.model('ExpiryBill', expiryBillSchema);

export default ExpiryBill;