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
