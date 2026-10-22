const Vehicle = require("../models/Vehicle");
const CatalogueItem = require("../models/CatalogueItem");
const ScheduleEntry = require("../models/ScheduleEntry");

const isWholeNumber = (v, min, max) => {
  const n = Number(v);
  return v !== "" && v !== null && Number.isInteger(n) && n >= min && n <= max;
};

const isText = (v, min, max) => {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
};

//checks the body, if partial is true only fields that were sent are checked (for update)
const validateVehicle = (body, partial) => {
  const errors = {};
  const has = (field) => body[field] !== undefined;
  const maxYear = new Date().getFullYear() + 1;

  if (!partial || has("make")) {
    if (!isText(body.make, 1, 40)) errors.make = "make must be 1 to 40 characters";
  }
  if (!partial || has("model")) {
    if (!isText(body.model, 1, 40)) errors.model = "model must be 1 to 40 characters";
  }
  if (!partial || has("year")) {
    if (!isWholeNumber(body.year, 1950, maxYear)) errors.year = "year must be between 1950 and " + maxYear;
  }
  if (!partial || has("registrationNo")) {
    if (!isText(body.registrationNo, 1, 20)) errors.registrationNo = "registration number must be 1 to 20 characters";
  }
  if (!partial || has("odometerKm")) {
    if (!isWholeNumber(body.odometerKm, 0, 2000000)) errors.odometerKm = "odometer must be a whole number from 0 to 2000000";
  }
  if (has("avgMonthlyKm")) {
    if (!isWholeNumber(body.avgMonthlyKm, 0, 20000)) errors.avgMonthlyKm = "monthly km must be a whole number from 0 to 20000";
  }
  if (has("nickname") && body.nickname !== "") {
    if (!isText(body.nickname, 1, 40)) errors.nickname = "nickname can be at most 40 characters";
  }

  return errors;
};

//only take the fields we allow, so owner or other stuff cant be sent from client
const pickFields = (body) => {
  const data = {};
  const allowed = ["make", "model", "year", "registrationNo", "nickname", "odometerKm", "avgMonthlyKm"];
  allowed.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  });
  return data;
};

//reg number has to be unique only inside one users garage
const regTaken = async (owner, registrationNo, skipId) => {
  const query = { owner, registrationNo: registrationNo.trim().toUpperCase() };
  if (skipId) query._id = { $ne: skipId };
  const found = await Vehicle.findOne(query);
  return !!found;
};

const regError = { message: "registration number already in your garage", errors: { registrationNo: "you already have a vehicle with this registration number" } };

const createVehicle = async (req, res) => {
  const body = req.body || {};
  const errors = validateVehicle(body, false);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  if (await regTaken(req.userId, body.registrationNo)) {
    return res.status(409).json(regError);
  }

  const data = pickFields(body);
  data.owner = req.userId;
  data.odometerDate = new Date();

  const vehicle = await Vehicle.create(data);

  //copy every catalogue item into this vehicles schedule
  //copying instead of linking so changing a default later wont move existing due dates
  const items = await CatalogueItem.find();
  const entries = items.map((item) => ({
    owner: req.userId,
    vehicle: vehicle._id,
    item: item._id,
    intervalKm: item.defaultIntervalKm,
    intervalMonths: item.defaultIntervalMonths,
    baselineDate: vehicle.odometerDate,
    baselineKm: vehicle.odometerKm,
    baselineSource: "initial",
  }));
  await ScheduleEntry.insertMany(entries);

  res.status(201).json({ vehicle });
};

const getVehicles = async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.userId }).sort({ createdAt: -1 });
  res.json({ vehicles });
};

const getVehicle = async (req, res) => {
  //404 even if it belongs to someone else so we dont leak that it exists
  const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }
  res.json({ vehicle });
};

const getSchedule = async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }

  const schedule = await ScheduleEntry.find({ vehicle: vehicle._id, owner: req.userId }).populate(
    "item",
    "name category notes"
  );
  res.json({ schedule });
};

const updateVehicle = async (req, res) => {
  const body = req.body || {};
  const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }

  const errors = validateVehicle(body, true);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  if (body.registrationNo !== undefined && (await regTaken(req.userId, body.registrationNo, vehicle._id))) {
    return res.status(409).json(regError);
  }

  const data = pickFields(body);

  //new odometer reading means the reading date is today
  if (data.odometerKm !== undefined && Number(data.odometerKm) !== vehicle.odometerKm) {
    data.odometerDate = new Date();
  }

  //user set the usage by hand so its not from history anymore
  if (data.avgMonthlyKm !== undefined) {
    data.usageDerived = false;
  }

  Object.assign(vehicle, data);
  await vehicle.save();
  res.json({ vehicle });
};

const deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }
  res.json({ message: "vehicle deleted" });
};

module.exports = { createVehicle, getVehicles, getVehicle, getSchedule, updateVehicle, deleteVehicle };
