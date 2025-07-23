import mongoose from 'mongoose';

const InventoryLockSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  batch: { type: String, required: true },
  quantity: { type: Number, required: true },
  lockedBy: { type: String, required: true }, // user/session identifier
  lockType: { type: String, enum: ['sale', 'return'], required: true },
  email: { type: String, required: true }, // for multi-tenant
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

InventoryLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-remove expired locks

export default mongoose.model('InventoryLock', InventoryLockSchema); 