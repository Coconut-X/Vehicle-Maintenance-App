const mongoose = require("mongoose");

//one catalogue item applied to one vehicle, intervals can be changed per vehicle
const scheduleEntrySchema = new mongoose.Schema(
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
    intervalKm: {
      type: Number,
      min: 100,
      max: 200000,
    },
    intervalMonths: {
      type: Number,
      min: 1,
      max: 120,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    //when the item was last done and at what km
    baselineDate: Date,
    baselineKm: Number,
    baselineSource: {
      type: String,
      enum: ["initial", "service", "unknown"],
      default: "initial",
    },
  },
  { timestamps: true }
);

//an entry needs km or months or both
scheduleEntrySchema.pre("validate", function () {
  if (this.intervalKm == null && this.intervalMonths == null) {
    this.invalidate("intervalKm", "item needs a km interval or a month interval");
  }
});

scheduleEntrySchema.index({ vehicle: 1, item: 1 }, { unique: true });
scheduleEntrySchema.index({ owner: 1, enabled: 1 });

module.exports = mongoose.model("ScheduleEntry", scheduleEntrySchema);
