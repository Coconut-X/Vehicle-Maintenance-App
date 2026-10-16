const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    make: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 40,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 40,
    },
    year: {
      type: Number,
      required: true,
      min: 1950,
      //max is checked in a validator because current year changes
      validate: {
        validator: (v) => v <= new Date().getFullYear() + 1,
        message: "year can't be more than next year",
      },
    },
    registrationNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 1,
      maxlength: 20,
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    odometerKm: {
      type: Number,
      required: true,
      min: 0,
      max: 2000000,
    },
    //date of the last real odometer reading
    odometerDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    avgMonthlyKm: {
      type: Number,
      min: 0,
      max: 20000,
      default: 0,
    },
    //true when avg km comes from service history not the user
    usageDerived: {
      type: Boolean,
      default: false,
    },
    photoUrl: String,
    photoId: String,
  },
  { timestamps: true }
);

//same reg number allowed for different users but not twice for one user
vehicleSchema.index({ owner: 1, registrationNo: 1 }, { unique: true });

module.exports = mongoose.model("Vehicle", vehicleSchema);
