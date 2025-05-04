// import mongoose from 'mongoose';

// // Define the schema for Inventory
// const inventorySchema = new mongoose.Schema(
//     {
//         itemName: {
//             type: String,
//             required: [true, 'Item name is required.'],
//             trim: true
//         },
//         batch: {
//             type: String,
//             required: [true, 'Batch number is required.'],
//             trim: true
//         },
//         partyName: { // Supplier name
//             type: String,
//             required: [true, 'Party name (Supplier) is required.'],
//             trim: true
//         },
//         email: { // User associated with this inventory record
//             type: String,
//             required: [true, 'User email is required.'],
//             trim: true,
//             index: true // Index email for faster lookups per user
//         },
//         expiryDate: {
//             type: Date,
//         },
//         pack: { // e.g., "10x1", "Bottle", "Strip"
//             type: String,
//         },
//         quantity: {
//             type: Number,
//             required: true,
//             min: [0, 'Quantity cannot be negative.'],
//             default: 0
//         },
//         purchaseRate: {
//             type: Number,
//             min: [0, 'Purchase rate cannot be negative.']
//         },
//         mrp: { // Maximum Retail Price
//             type: Number,
//             min: [0, 'MRP cannot be negative.']
//         },
//         gstPercentage: {
//             type: Number,
//             min: [0, 'GST percentage cannot be negative.'],
//             max: [100, 'GST percentage cannot exceed 100.']
//         },
//         description: {
//             type: String,
//             trim: true
//         },
//         amount: { // Optional: Calculated total value (qty * rate) or other amount
//             type: Number,
//             min: 0
//         },
//     },
//     {
//         timestamps: true, // Adds createdAt and updatedAt automatically
//     }
// );

// // Add compound index for faster lookups within a user's inventory
// inventorySchema.index({ email: 1, itemName: 1, batch: 1, partyName: 1 });

// // Ensure no problematic pre-save or pre-find hooks exist here

// // Use mongoose.models to prevent OverwriteModelError
// const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

// export default Inventory;

import mongoose from 'mongoose';

// Define the schema for Inventory
const inventorySchema = new mongoose.Schema(
    {
        itemName: {
            type: String,
            required: [true, 'Item name is required.'],
            trim: true
        },
        batch: {
            type: String,
            required: [true, 'Batch number is required.'],
            trim: true
        },
        partyName: { // Supplier name
            type: String,
            required: [true, 'Party name (Supplier) is required.'], // Made required
            trim: true,
            default: 'Unknown Supplier' // Added default value
        },
        email: { // User associated with this inventory record
            type: String,
            required: [true, 'User email is required.'],
            trim: true,
            index: true // Index email for faster lookups per user
        },
        expiryDate: {
            type: Date,
        },
        pack: { // e.g., "10x1", "Bottle", "Strip"
            type: String,
        },
        quantity: {
            type: Number,
            required: true,
            min: [0, 'Quantity cannot be negative.'],
            default: 0
        },
        purchaseRate: {
            type: Number,
            min: [0, 'Purchase rate cannot be negative.']
        },
        mrp: { // Maximum Retail Price
            type: Number,
            min: [0, 'MRP cannot be negative.']
        },
        gstPercentage: {
            type: Number,
            min: [0, 'GST percentage cannot be negative.'],
            max: [100, 'GST percentage cannot exceed 100.']
        },
        description: {
            type: String,
            trim: true
        },
        amount: { // Optional: Calculated total value (qty * rate) or other amount
            type: Number,
            min: 0
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt automatically
    }
);

// Add compound index for faster lookups within a user's inventory
// Updated to include partyName for unique identification
inventorySchema.index({ email: 1, itemName: 1, batch: 1, partyName: 1 });

// Pre-save hook to ensure partyName is never empty
inventorySchema.pre('save', function(next) {
    // If partyName is empty or doesn't exist, set default
    if (!this.partyName || this.partyName.trim() === '') {
        this.partyName = 'Unknown Supplier';
        console.log('[Inventory Model] Applied default partyName in pre-save hook');
    }
    next();
});

// Use mongoose.models to prevent OverwriteModelError
const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

export default Inventory;



// import mongoose from 'mongoose';

// // Define the schema for Inventory
// const inventorySchema = new mongoose.Schema(
//     {
//         itemName: {
//             type: String,
//             required: [true, 'Item name is required.'], // Added error message
//             trim: true
//         },
//         batch: {
//             type: String,
//             required: [true, 'Batch number is required.'],
//             trim: true
//         },
//         partyName: {
//             type: String,
//             required: [true, 'Party name (Supplier) is required.'], // Keep required
//             trim: true // Trim whitespace automatically
//         },
//         email: {
//             type: String,
//             required: [true, 'User email is required.'],
//             trim: true
//         },
//         expiryDate: {
//             type: Date,
//             // required: true // Consider if expiry is always known
//         },
//         pack: {
//             type: String,
//             // required: true // Consider if pack is always known
//         },
//         quantity: {
//             type: Number,
//             required: true,
//             min: [0, 'Quantity cannot be negative.'],
//             default: 0
//         },
//         purchaseRate: {
//             type: Number,
//             // required: true, // Consider if always known
//             min: [0, 'Purchase rate cannot be negative.']
//         },
//         mrp: {
//             type: Number,
//             // required: true, // Consider if always known
//             min: [0, 'MRP cannot be negative.']
//         },
//         gstPercentage: {
//             type: Number,
//             // required: true, // Consider if always known
//             min: [0, 'GST percentage cannot be negative.']
//         },
//         description: {
//             type: String,
//             trim: true
//         },
//         amount: { // Added amount field often useful in inventory
//             type: Number,
//             min: 0
//         },
//     },
//     {
//         timestamps: true, // Adds createdAt and updatedAt automatically
//     }
// );

// // Add compound index for faster lookups if needed (Optional but good)
// inventorySchema.index({ email: 1, itemName: 1, batch: 1, partyName: 1 });

// // ----- REMOVED PROBLEMATIC MIDDLEWARE -----
// // The pre('save') hook that overwrote partyName is removed.
// // The pre('find')/pre('findOne') hooks that filtered results are removed.
// // ----- END REMOVAL -----

// // Use mongoose.models to prevent recompiling the model if it already exists (good practice)
// const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

// export default Inventory;

// import mongoose from 'mongoose';

// const inventorySchema = new mongoose.Schema(
//     {
//         itemName: { type: String, required: true },
//         batch: { type: String, required: true },
//         email: { type: String, required: true }, // Replace gstNo with email
//         expiryDate: { type: Date, required: true },
//         quantity: { type: Number, required: true, default: 0 },
//         amount: { type: Number, required: true },
//         purchaseRate: { type: Number, required: true },
//         mrp: { type: Number, required: true },
//         gstPercentage: { type: Number, required: true },
//         description: { type: String, required: false },
//     },
//     { timestamps: true }
// );

// // Check if the model is already defined to avoid the OverwriteModelError
// const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

// export default Inventory;


