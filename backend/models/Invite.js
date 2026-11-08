const mongoose = require("mongoose");

//one invitation to join a group, sent by email, works once and only for that email address
//only a hash of the token is saved, the real one lives only in the email
const inviteSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "revoked"], default: "pending" },
  },
  { timestamps: true }
);

//asking the same address again just makes a new link, so there is one invite per group and address
inviteSchema.index({ group: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("Invite", inviteSchema);
