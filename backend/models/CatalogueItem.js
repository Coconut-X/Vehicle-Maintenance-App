const mongoose = require("mongoose");

const catalogueItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["Engine", "Brakes", "Fluids", "Tyres", "Electrical", "Filters", "Inspection"],
  },
  defaultIntervalKm: {
    type: Number,
    min: 100,
    max: 200000,
  },
  defaultIntervalMonths: {
    type: Number,
    min: 1,
    max: 120,
  },
  notes: {
    type: String,
    trim: true,
  },
  //which powertrains need this item, empty means all of them
  powertrains: {
    type: [String],
    default: [],
  },
});

//true when this item is needed for a car with that powertrain
catalogueItemSchema.methods.appliesTo = function (powertrain) {
  return !this.powertrains || this.powertrains.length === 0 || this.powertrains.includes(powertrain);
};

//an item needs km or months or both
catalogueItemSchema.pre("validate", function () {
  if (this.defaultIntervalKm == null && this.defaultIntervalMonths == null) {
    this.invalidate("defaultIntervalKm", "item needs a km interval or a month interval");
  }
});

module.exports = mongoose.model("CatalogueItem", catalogueItemSchema);
