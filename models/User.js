import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  gstNo: {
    type: String,
    required: true,
    unique: true,
  },
  verificationToken: { type: String }, // Field to store the verification token
  isVerified: { type: Boolean, default: false }, // Field to track if the user is verified
  verificationTokenExpiry: {
    type: Date,
    default: null,
  },
});

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;
