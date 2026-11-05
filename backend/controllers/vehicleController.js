const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const CatalogueItem = require("../models/CatalogueItem");
const ScheduleEntry = require("../models/ScheduleEntry");
const ServiceRecord = require("../models/ServiceRecord");
const ReminderLog = require("../models/ReminderLog");
const { uploadImage, deleteImage } = require("../config/cloudinary");
const { projectionInfo } = require("../utils/projection");
const { calcDue } = require("../utils/dueDate");
const { getStatus, worstStatus } = require("../utils/status");
const { evaluateVehicle } = require("../utils/vehicleStatus");
const { getString, getPaging, escapeRegex, pageInfo } = require("../utils/listQuery");
const { POWERTRAINS } = require("../seed/catalogue");

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
  if (has("powertrain") && !POWERTRAINS.includes(body.powertrain)) {
    errors.powertrain = "powertrain must be petrol, hybrid, phev or electric";
  }
  if (has("nickname") && body.nickname !== "") {
    if (!isText(body.nickname, 1, 40)) errors.nickname = "nickname can be at most 40 characters";
  }

  return errors;
};

//only take the fields we allow, so owner or other stuff cant be sent from client
const pickFields = (body) => {
  const data = {};
  const allowed = ["make", "model", "year", "registrationNo", "nickname", "odometerKm", "avgMonthlyKm", "powertrain"];
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

//uploads the photo if one was sent, returns a warning instead of failing
//losing the whole vehicle because of a photo would be worse
const savePhoto = async (vehicle, file) => {
  if (!file) return null;
  try {
    const oldId = vehicle.photoId;
    const photo = await uploadImage(file.buffer, "carvault/vehicles");
    vehicle.photoUrl = photo.url;
    vehicle.photoId = photo.id;
    await vehicle.save();
    await deleteImage(oldId);
    return null;
  } catch (err) {
    console.log("photo upload failed: " + (err.message || err));
    return "vehicle saved but the photo could not be uploaded, try again later";
  }
};

const newEntry = (vehicle, item) => ({
  owner: vehicle.owner,
  vehicle: vehicle._id,
  item: item._id,
  intervalKm: item.defaultIntervalKm,
  intervalMonths: item.defaultIntervalMonths,
  enabled: item.appliesTo(vehicle.powertrain),
  baselineDate: vehicle.odometerDate,
  baselineKm: vehicle.odometerKm,
  baselineSource: "initial",
});

//after the powertrain changes turn items on or off to match, and add items the car never had
//this also resets items the user turned off by hand, the ui warns about it
const syncPowertrain = async (vehicle) => {
  const items = await CatalogueItem.find();
  const entries = await ScheduleEntry.find({ vehicle: vehicle._id, owner: vehicle.owner });

  for (const item of items) {
    const entry = entries.find((e) => e.item.toString() === item._id.toString());
    if (entry) {
      entry.enabled = item.appliesTo(vehicle.powertrain);
      await entry.save();
    } else {
      await ScheduleEntry.create(newEntry(vehicle, item));
    }
  }
};

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

  //no km per month given, use the default from the users profile if there is one
  if (data.avgMonthlyKm === undefined || data.avgMonthlyKm === "") {
    const user = await User.findById(req.userId);
    if (user && user.defaultMonthlyKm) data.avgMonthlyKm = user.defaultMonthlyKm;
  }

  const vehicle = await Vehicle.create(data);

  //copy every catalogue item into this vehicles schedule
  //copying instead of linking so changing a default later wont move existing due dates
  //items that dont fit the powertrain are copied too but turned off, so a later change can bring them back
  const items = await CatalogueItem.find();
  const entries = items.map((item) => newEntry(vehicle, item));
  await ScheduleEntry.insertMany(entries);

  const warning = await savePhoto(vehicle, req.file);
  res.status(201).json({ vehicle, warning });
};

//search, status filter, sort and pagination
//status is worked out in code not stored, so filtering and urgency sort happen after the query
//fine for a personal garage of a few vehicles
const getVehicles = async (req, res) => {
  const { page, limit, skip } = getPaging(req.query);
  const search = getString(req.query.search);
  const status = getString(req.query.status);
  const sort = getString(req.query.sort);

  //owner first so nobody can see other peoples vehicles
  const query = { owner: req.userId };
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    query.$or = [{ make: regex }, { model: regex }, { nickname: regex }, { registrationNo: regex }];
  }

  const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });
  const entries = await ScheduleEntry.find({ owner: req.userId, enabled: true, vehicle: { $in: vehicles.map((v) => v._id) } });

  const now = new Date();
  let list = vehicles.map((v) => {
    const own = entries.filter((e) => e.vehicle.toString() === v._id.toString());
    const result = evaluateVehicle(v, own, now);
    return {
      ...v.toObject(),
      projection: projectionInfo(v, now),
      summary: result.summary,
      counts: result.counts,
      minDays: result.minDays,
    };
  });

  const statuses = ["overdue", "due_soon", "unknown", "up_to_date"];
  if (statuses.includes(status)) {
    list = list.filter((v) => v.summary === status);
  }

  //unknown sort keys just keep the default newest first
  if (sort === "name") {
    list.sort((a, b) => (a.make + " " + a.model).localeCompare(b.make + " " + b.model));
  } else if (sort === "year") {
    list.sort((a, b) => b.year - a.year);
  } else if (sort === "urgency") {
    //vehicles with no due dates go last
    list.sort((a, b) => (a.minDays == null ? Infinity : a.minDays) - (b.minDays == null ? Infinity : b.minDays));
  }

  const total = list.length;
  res.json({ vehicles: list.slice(skip, skip + limit), ...pageInfo(total, page, limit) });
};

const getVehicle = async (req, res) => {
  //404 even if it belongs to someone else so we dont leak that it exists
  const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }
  res.json({ vehicle, projection: projectionInfo(vehicle) });
};

const getSchedule = async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }

  const all = await ScheduleEntry.find({ vehicle: vehicle._id, owner: req.userId }).populate(
    "item",
    "name category notes powertrains"
  );
  //an electric car doesnt need to see engine oil at all, not even as turned off
  const schedule = all.filter((entry) => entry.item && entry.item.appliesTo(vehicle.powertrain));

  //add the computed due point and status to every entry
  const now = new Date();
  const result = schedule.map((entry) => {
    if (!entry.enabled) {
      return { ...entry.toObject(), due: null, status: "disabled" };
    }
    const due = calcDue(entry, vehicle, now);
    return { ...entry.toObject(), due, status: getStatus(due) };
  });

  //disabled items dont count towards the vehicle status
  const summary = worstStatus(result.filter((e) => e.enabled).map((e) => e.status));

  res.json({ schedule: result, summary });
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

  const powertrainChanged = data.powertrain !== undefined && data.powertrain !== vehicle.powertrain;

  Object.assign(vehicle, data);
  await vehicle.save();

  if (powertrainChanged) await syncPowertrain(vehicle);

  const warning = await savePhoto(vehicle, req.file);
  res.json({ vehicle, warning });
};

const deleteVehicle = async (req, res) => {
  const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }

  //remove everything that belongs to this vehicle so nothing is left orphaned
  await ScheduleEntry.deleteMany({ vehicle: vehicle._id, owner: req.userId });

  const records = await ServiceRecord.find({ vehicle: vehicle._id, owner: req.userId });
  for (const record of records) {
    await deleteImage(record.receiptId);
  }
  await ServiceRecord.deleteMany({ vehicle: vehicle._id, owner: req.userId });
  await ReminderLog.deleteMany({ vehicle: vehicle._id, owner: req.userId });

  await deleteImage(vehicle.photoId);

  res.json({ message: "vehicle deleted" });
};

module.exports = { createVehicle, getVehicles, getVehicle, getSchedule, updateVehicle, deleteVehicle };
