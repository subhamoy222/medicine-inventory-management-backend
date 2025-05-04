// import mongoose from 'mongoose';

// const saleBillSchema = new mongoose.Schema(
//     {
//         saleInvoiceNumber: { type: String, required: true }, // Unique identifier for sale bills
//         date: { type: Date, required: true, default: Date.now },
//         receiptNumber: { type: String, required: true },
//         partyName: { type: String, required: true },
//         email: { type: String, required: true }, // Seller's email

//         items: [
//             {
//                 itemName: { type: String, required: true },
//                 batch: { type: String, required: true },
//                 quantity: { type: Number, required: true },
//                 mrp: { type: Number, required: true },
//                 discount: { type: Number, default: 0 }, // Discount in percentage
//                 expiryDate: { type: Date, required: true } // Added expiry date field
//             },
//         ],

//         totalAmount: { type: Number, required: true }, // Sum of (quantity * mrp) for all items
//         discountAmount: { type: Number, default: 0 }, // Total discount amount
//         netAmount: { type: Number, required: true }, // totalAmount - discountAmount
//     },
//     { timestamps: true }
// );

// const SaleBill = mongoose.model('SaleBill', saleBillSchema);

// export default SaleBill;


import mongoose from 'mongoose';

const saleBillSchema = new mongoose.Schema(
  {
    saleInvoiceNumber: { type: String, required: true },
    date: { type: Date, required: true },
    receiptNumber: { type: String, required: true },
    partyName: { type: String, required: true },
    email: { type: String, required: true },
    gstNumber: { type: String, required: true }, // Added GST number field
    items: [
      {
        itemName: { type: String, required: true },
        batch: { type: String, required: true },
        quantity: { type: Number, required: true },
        mrp: { type: Number, required: true },
        discount: { type: Number, required: true },
        gstPercentage: { type: Number, required: true }, // Added GST percentage
        expiryDate: { type: Date, required: true },
        sgst: { type: Number, required: true }, // Split GST components
        cgst: { type: Number, required: true },
        igst: { type: Number, required: true },
        totalGst: { type: Number, required: true },
        netAmount: { type: Number, required: true }
      }
    ],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
    sgstAmount: { type: Number, required: true }, // Total GST components
    cgstAmount: { type: Number, required: true },
    igstAmount: { type: Number, required: true },
    totalGstAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true }
  },
  { timestamps: true }
);

const SaleBill = mongoose.model('SaleBill', saleBillSchema);
export default SaleBill;