const mongoose = require("mongoose");

//a paper kept for a car, like a smart card, with a name and one or more pages (photos or a pdf)
const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    //who added it, the owner field is the owner of the car
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    files: [
      {
        id: { type: String, required: true },
        resourceType: String,
        format: String,
        kind: { type: String, enum: ["image", "pdf"], required: true },
        originalName: { type: String, maxlength: 120 },
      },
    ],
  },
  { timestamps: true }
);

documentSchema.index({ vehicle: 1, createdAt: -1 });

module.exports = mongoose.model("Document", documentSchema);
