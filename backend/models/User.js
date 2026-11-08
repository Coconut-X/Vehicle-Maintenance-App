const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, //never send hash back unless asked
    },
    //no default on purpose, accounts made before verification existed have no value and count as verified
    //only a new signup is saved as false
    emailVerified: {
      type: Boolean,
    },
    verifyTokenHash: {
      type: String,
      select: false,
    },
    verifyExpires: {
      type: Date,
      select: false,
    },
    verifySentAt: {
      type: Date,
      select: false,
    },
    resetTokenHash: {
      type: String,
      select: false,
    },
    resetExpires: {
      type: Date,
      select: false,
    },
    resetSentAt: {
      type: Date,
      select: false,
    },
    //vehicle ids in the order the user arranged them, shown that way on the dashboard and in the garage
    vehicleOrder: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
    },
    remindersEnabled: {
      type: Boolean,
      default: true,
    },
    defaultMonthlyKm: {
      type: Number,
      min: 0,
      max: 20000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
