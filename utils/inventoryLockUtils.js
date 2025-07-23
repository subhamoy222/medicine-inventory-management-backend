import InventoryLock from '../models/InventoryLock.js';

const LOCK_DURATION_MINUTES = 20;

// Lock inventory for a specific item/batch/user/type
export async function lockInventory({ itemName, batch, quantity, lockedBy, lockType, email }) {
  const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
  const lock = new InventoryLock({
    itemName,
    batch,
    quantity,
    lockedBy,
    lockType,
    email,
    expiresAt
  });
  await lock.save();
  return lock;
}

// Unlock inventory for a specific lock (by id or by params)
export async function unlockInventory({ itemName, batch, lockedBy, lockType, email }) {
  await InventoryLock.deleteMany({ itemName, batch, lockedBy, lockType, email });
}

// Check if enough inventory is available (considering locks), and lock if possible
export async function checkAndLockInventory({ itemName, batch, quantity, lockedBy, lockType, email, InventoryModel }) {
  // Sum all locked quantities for this item/batch/email
  const activeLocks = await InventoryLock.aggregate([
    { $match: { itemName, batch, email, expiresAt: { $gt: new Date() } } },
    { $group: { _id: null, totalLocked: { $sum: "$quantity" } } }
  ]);
  const totalLocked = activeLocks[0]?.totalLocked || 0;

  // Get current inventory
  const inventoryItem = await InventoryModel.findOne({ itemName, batch, email });
  if (!inventoryItem) throw new Error('Inventory item not found');
  const available = inventoryItem.quantity - totalLocked;
  if (available < quantity) throw new Error(`Insufficient available quantity (locked: ${totalLocked}, available: ${available})`);

  // Lock the quantity
  return lockInventory({ itemName, batch, quantity, lockedBy, lockType, email });
}

// Cleanup expired locks (optional, as TTL index will auto-remove)
export async function cleanupExpiredLocks() {
  await InventoryLock.deleteMany({ expiresAt: { $lte: new Date() } });
} 