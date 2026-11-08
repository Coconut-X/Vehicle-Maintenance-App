const Vehicle = require("../models/Vehicle");

//the one place that decides who can use a vehicle, for now only its owner
const getVehicleForUser = (userId, vehicleId) => Vehicle.findOne({ _id: vehicleId, owner: userId });

module.exports = { getVehicleForUser };
