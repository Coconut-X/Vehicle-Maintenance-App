const Vehicle = require("../models/Vehicle");
const Group = require("../models/Group");

//the one place that decides who can use a vehicle
//a vehicle is usable by its owner and by everyone in the group it is shared with

const groupIdsOf = async (userId) => {
  const groups = await Group.find({ "members.user": userId }).select("_id");
  return groups.map((g) => g._id);
};

//a query that matches the vehicles of this user, own ones and the ones of the groups, extra conditions can be added
const vehicleQuery = async (userId, extra = {}) => {
  const ids = await groupIdsOf(userId);
  return { $and: [extra, { $or: [{ owner: userId }, { group: { $in: ids } }] }] };
};

const accessibleVehicles = async (userId, extra = {}) => Vehicle.find(await vehicleQuery(userId, extra));

const accessibleVehicleIds = async (userId) => (await accessibleVehicles(userId)).map((v) => v._id);

//the vehicle if the user may use it, otherwise null
const getVehicleForUser = async (userId, vehicleId) => {
  const vehicle = await Vehicle.findOne(await vehicleQuery(userId, { _id: vehicleId }));
  return vehicle || null;
};

module.exports = { groupIdsOf, vehicleQuery, accessibleVehicles, accessibleVehicleIds, getVehicleForUser };
