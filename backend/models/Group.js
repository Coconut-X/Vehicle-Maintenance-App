const mongoose = require("mongoose");

//a family or any group of people who share some cars
//the admin makes it and manages the people, everyone in it can use the cars
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
    //which reminder emails this person gets for the cars of this group
    //all = every car, off = none, custom = only the cars listed
    notify: {
      mode: { type: String, enum: ["all", "off", "custom"], default: "all" },
      vehicles: [{ type: mongoose.Schema.Types.ObjectId }],
    },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [memberSchema],
  },
  { timestamps: true }
);

groupSchema.index({ "members.user": 1 });

module.exports = mongoose.model("Group", groupSchema);
