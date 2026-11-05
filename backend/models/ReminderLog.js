const mongoose = require("mongoose");

//one reminder that was already emailed, so the same one is never sent twice
const reminderLogSchema = new mongoose.Schema(
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
    //30, 7, 1 days before or overdue
    threshold: {
      type: String,
      enum: ["30", "7", "1", "overdue"],
      required: true,
    },
    //baseline of the schedule entry when sent, a new service gives a new baseline
    baselineDate: {
      type: Date,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

reminderLogSchema.index({ owner: 1, vehicle: 1, item: 1, threshold: 1, baselineDate: 1 }, { unique: true });

module.exports = mongoose.model("ReminderLog", reminderLogSchema);
