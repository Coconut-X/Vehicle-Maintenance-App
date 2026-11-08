const Group = require("../models/Group");
const Invite = require("../models/Invite");
const Vehicle = require("../models/Vehicle");
const ScheduleEntry = require("../models/ScheduleEntry");
const ServiceRecord = require("../models/ServiceRecord");
const Document = require("../models/Document");
const { hashToken } = require("./emailToken");

//the invite behind a token from an email, only if it can still be used
const findPendingInvite = async (token) => {
  if (typeof token !== "string" || token.length < 20) return null;
  const invite = await Invite.findOne({ tokenHash: hashToken(token) });
  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) return null;
  return invite;
};

//a car gets a new owner, everything of the car follows so the owner is the same everywhere
const transferVehicle = async (vehicle, newOwnerId) => {
  try {
    vehicle.owner = newOwnerId;
    await vehicle.save();
  } catch (err) {
    //the new owner already has a car with the same number, so this one gets a small mark and stays in the group
    if (err.code !== 11000) throw err;
    vehicle.registrationNo = (vehicle.registrationNo + " (2)").slice(0, 20);
    await vehicle.save();
  }
  const filter = { vehicle: vehicle._id };
  await ScheduleEntry.updateMany(filter, { owner: newOwnerId });
  await ServiceRecord.updateMany(filter, { owner: newOwnerId });
  await Document.updateMany(filter, { owner: newOwnerId });
  //reminder logs are not moved, each one belongs to the person who got that email
};

//the person who has been in the group longest, used when the admin goes away
const longestMember = (group, exceptUserId) => {
  const others = group.members.filter((m) => m.user.toString() !== exceptUserId.toString());
  others.sort((a, b) => a.joinedAt - b.joinedAt);
  return others.length ? others[0].user : null;
};

//the group goes away, its cars go back to being the private cars of their owners
const deleteGroup = async (group) => {
  await Vehicle.updateMany({ group: group._id }, { group: null });
  await Invite.deleteMany({ group: group._id });
  await Group.deleteOne({ _id: group._id });
};

//takes a person out of a group, by the admin, by themselves or because their account is deleted
//their cars in the group move to the admin so the family keeps them
//if the admin goes, the member who joined first becomes the admin, and with nobody left the group is deleted
const removeMember = async (group, userId) => {
  const result = { groupDeleted: false, newAdmin: null };
  const remaining = group.members.filter((m) => m.user.toString() !== userId.toString());

  if (remaining.length === 0) {
    await deleteGroup(group);
    result.groupDeleted = true;
    return result;
  }

  if (group.admin.toString() === userId.toString()) {
    group.admin = longestMember(group, userId);
    result.newAdmin = group.admin;
  }

  const cars = await Vehicle.find({ group: group._id, owner: userId });
  for (const car of cars) await transferVehicle(car, group.admin);

  group.members = remaining;
  await group.save();
  return result;
};

module.exports = { findPendingInvite, transferVehicle, longestMember, deleteGroup, removeMember };
