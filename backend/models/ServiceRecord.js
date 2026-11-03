const mongoose = require("mongoose");

//one completed maintenance job on one vehicle
const serviceRecordSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CatalogueItem",
      required: true,
    },
    serviceDate: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => v <= new Date(),
        message: "service date can't be in the future",
      },
    },
    odometerKm: {
      type: Number,
      required: true,
      min: 0,
      max: 2000000,
    },
    workshop: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    cost: {
      type: Number,
      min: 0,
      max: 10000000,
      //keep only 2 decimal places
      set: (v) => (v == null || v === "" ? v : Math.round(Number(v) * 100) / 100),
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    receiptUrl: String,
    receiptId: String,
  },
  { timestamps: true }
);

//timeline is read newest first per vehicle
serviceRecordSchema.index({ vehicle: 1, serviceDate: -1 });
//for analytics across the whole garage
serviceRecordSchema.index({ owner: 1, serviceDate: -1 });

module.exports = mongoose.model("ServiceRecord", serviceRecordSchema);
