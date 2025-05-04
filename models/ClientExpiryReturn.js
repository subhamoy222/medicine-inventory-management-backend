import mongoose from 'mongoose';

const clientExpiryReturnSchema = new mongoose.Schema({
  returnBillNumber: {
    type: String,
    required: true,
    unique: true
  },
  partyName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  email: {
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
    expiryDate: {
      type: Date,
      required: true
    },
    originalSaleInvoiceNumber: {
      type: String,
      required: true
    },
    purchaseDate: {
      type: Date,
      required: true
    },
    soldQuantity: {
      type: Number,
      required: true
    },
    returnQuantity: {
      type: Number,
      required: true,
      validate: {
        validator: function(value) {
          return value > 0 && value <= this.soldQuantity;
        },
        message: props => `Return quantity (${props.value}) must be greater than 0 and less than or equal to sold quantity (${props.soldQuantity})`
      }
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ClientExpiryReturn = mongoose.model('ClientExpiryReturn', clientExpiryReturnSchema);

export default ClientExpiryReturn; 