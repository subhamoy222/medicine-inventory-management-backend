/**
 * Utility functions for socket.io real-time updates
 */

/**
 * Emit real-time update to a specific user (email)
 * @param {string} email - User's email (used as room name)
 * @param {string} event - Event name
 * @param {object} data - Data to emit
 */
export const emitToUser = (email, event, data) => {
  if (!global.io) {
    console.warn('Socket.io instance not found');
    return;
  }

  try {
    global.io.to(email).emit(event, data);
    console.log(`Emitted ${event} to user ${email}`);
  } catch (error) {
    console.error(`Error emitting ${event} to user ${email}:`, error);
  }
};

/**
 * Emit real-time update to all connected clients
 * @param {string} event - Event name
 * @param {object} data - Data to emit
 */
export const emitToAll = (event, data) => {
  if (!global.io) {
    console.error('Socket.io not initialized');
    return;
  }
  
  global.io.emit(event, data);
};

/**
 * Event names used across the application
 */
export const SOCKET_EVENTS = {
  INVENTORY_UPDATE: 'inventory_update',
  PURCHASE_BILL_CREATED: 'purchase_bill_created',
  SELL_BILL_CREATED: 'sell_bill_created',
  RETURN_BILL_CREATED: 'return_bill_created'
}; 