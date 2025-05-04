// import mongoose from "mongoose";

// const customerPurchaseSchema = new mongoose.Schema({
//   customerName: {
//     type: String,
//     required: true,
//   },
//   items: [
//     {
//       itemName: String,
//       batch: String,
//       quantity: Number,
//       mrp: Number,
//       discount: Number,
//       amount: Number,
//     },
//   ],
// });

// const CustomerPurchase = mongoose.model("CustomerPurchase", customerPurchaseSchema);

// export default CustomerPurchase;


// import mongoose from "mongoose";

// const customerPurchaseSchema = new mongoose.Schema({
//     customerName: {
//         type: String,
//         required: true,
//     },
//     items: [
//         {
//             itemName: {
//                 type: String,
//                 required: true,
//             },
//             batch: {
//                 type: String,
//                 required: true,
//             },
//             quantity: {
//                 type: Number,
//                 required: true,
//                 min: 1,
//             },
//             mrp: {
//                 type: Number,
//                 required: true,
//                 min: 0,
//             },
//             discount: {
//                 type: Number,
//                 required: true,
//                 min: 0,
//                 max: 100,
//             },
//             amount: {
//                 type: Number,
//                 required: true,
//                 min: 0,
//             },
//         },
//     ],
// });

// const CustomerPurchase = mongoose.model("CustomerPurchase", customerPurchaseSchema);

// export default CustomerPurchase;

import mongoose from 'mongoose';

const customerPurchaseSchema = new mongoose.Schema({
  gstNo: { 
    type: String, 
    required: true,
    index: true
  },
  partyName: { 
    type: String, 
    required: true 
  },
  purchaseHistory: {
    type: [
      {
        date: { 
          type: Date, 
          default: Date.now 
        },
        invoiceNumber: { 
          type: String, 
          required: true,
          index: true 
        },
        items: [
          {
            itemName: { 
              type: String, 
              required: true,
              index: true 
            },
            batch: { 
              type: String, 
              required: true,
              index: true 
            },
            quantity: { 
              type: Number, 
              required: true 
            },
            rate: { 
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
            // expiryDate: {  // Add expiry date field
            //   type: Date,
            //   required: true
            // }
          }
        ],
        totalAmount: { 
          type: Number, 
          required: true 
        },
        soldQuantity: Number
      }
    ],
    default: []
  }
}, { timestamps: true });

const CustomerPurchase = mongoose.model('CustomerPurchase', customerPurchaseSchema);
export default CustomerPurchase;