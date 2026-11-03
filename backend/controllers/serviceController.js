const ServiceRecord = require("../models/ServiceRecord");
const Vehicle = require("../models/Vehicle");
const CatalogueItem = require("../models/CatalogueItem");
const { uploadImage, deleteImage } = require("../config/cloudinary");

const isWholeNumber = (v, min, max) => {
  const n = Number(v);
  return v !== "" && v !== null && Number.isInteger(n) && n >= min && n <= max;
};

const isValidId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

//checks the body, if partial is true only fields that were sent are checked (for update)
const validateService = (body, partial) => {
  const errors = {};
  const has = (field) => body[field] !== undefined;

  if (!partial || has("serviceDate")) {
    const date = new Date(body.serviceDate);
    if (!body.serviceDate || isNaN(date.getTime())) {
      errors.serviceDate = "enter a valid service date";
    } else if (date > new Date()) {
      errors.serviceDate = "service date can't be in the future";
    }
  }
  if (!partial || has("odometerKm")) {
    if (!isWholeNumber(body.odometerKm, 0, 2000000)) errors.odometerKm = "odometer must be a whole number from 0 to 2000000";
  }
  if (has("cost") && body.cost !== "") {
    const cost = Number(body.cost);
    if (isNaN(cost) || cost < 0 || cost > 10000000) errors.cost = "cost must be from 0 to 10000000";
  }
  if (has("workshop") && (typeof body.workshop !== "string" || body.workshop.length > 80)) {
    errors.workshop = "workshop can be at most 80 characters";
  }
  if (has("notes") && (typeof body.notes !== "string" || body.notes.length > 1000)) {
    errors.notes = "notes can be at most 1000 characters";
  }

  return errors;
};

//odometer cant go backwards, so a service cant have less km than an earlier one
//or more km than a later one, skipId is used when editing a record
const checkChronology = async (vehicleId, serviceDate, odometerKm, skipId) => {
  const query = { vehicle: vehicleId };
  if (skipId) query._id = { $ne: skipId };

  const earlier = await ServiceRecord.findOne({ ...query, serviceDate: { $lte: serviceDate }, odometerKm: { $gt: odometerKm } })
    .sort({ serviceDate: -1 })
    .populate("item", "name");
  if (earlier) {
    return earlier;
  }

  const later = await ServiceRecord.findOne({ ...query, serviceDate: { $gte: serviceDate }, odometerKm: { $lt: odometerKm } })
    .sort({ serviceDate: 1 })
    .populate("item", "name");
  return later;
};

const chronologyError = (record) => {
  const date = record.serviceDate.toISOString().slice(0, 10);
  return {
    message: "validation failed",
    errors: {
      odometerKm: "this reading conflicts with " + record.item.name + " on " + date + " at " + record.odometerKm + " km",
    },
  };
};

//same idea as the vehicle photo, record is saved even if upload fails
const saveReceipt = async (record, file) => {
  if (!file) return null;
  try {
    const oldId = record.receiptId;
    const receipt = await uploadImage(file.buffer, "carvault/receipts");
    record.receiptUrl = receipt.url;
    record.receiptId = receipt.id;
    await record.save();
    await deleteImage(oldId);
    return null;
  } catch (err) {
    console.log("receipt upload failed: " + (err.message || err));
    return "service saved but the receipt could not be uploaded, try again later";
  }
};

const pickFields = (body) => {
  const data = {};
  ["serviceDate", "odometerKm", "workshop", "cost", "notes"].forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  });
  if (data.cost === "") data.cost = undefined;
  return data;
};

const createService = async (req, res) => {
  const body = req.body || {};
  const errors = validateService(body, false);

  if (!isValidId(body.vehicle)) errors.vehicle = "choose a vehicle";
  if (!isValidId(body.item)) errors.item = "choose a maintenance item";
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const vehicle = await Vehicle.findOne({ _id: body.vehicle, owner: req.userId });
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }
  const item = await CatalogueItem.findById(body.item);
  if (!item) {
    return res.status(422).json({ message: "validation failed", errors: { item: "maintenance item not found" } });
  }

  const data = pickFields(body);
  data.serviceDate = new Date(data.serviceDate);
  data.odometerKm = Number(data.odometerKm);

  //cant be serviced before the car was made
  if (data.serviceDate.getUTCFullYear() < vehicle.year) {
    return res.status(422).json({ message: "validation failed", errors: { serviceDate: "service date is before the vehicle was made" } });
  }

  const conflict = await checkChronology(vehicle._id, data.serviceDate, data.odometerKm);
  if (conflict) {
    return res.status(422).json(chronologyError(conflict));
  }

  data.owner = req.userId;
  data.vehicle = vehicle._id;
  data.item = item._id;
  const record = await ServiceRecord.create(data);

  const warning = await saveReceipt(record, req.file);
  await record.populate("item", "name category");
  res.status(201).json({ record, warning });
};

//simple list for now, search and pagination come later
const getServices = async (req, res) => {
  const query = { owner: req.userId };
  if (isValidId(req.query.vehicle)) {
    query.vehicle = req.query.vehicle;
  }

  const records = await ServiceRecord.find(query)
    .sort({ serviceDate: -1 })
    .populate("item", "name category")
    .populate("vehicle", "make model nickname registrationNo");
  res.json({ records });
};

const updateService = async (req, res) => {
  const body = req.body || {};
  const record = await ServiceRecord.findOne({ _id: req.params.id, owner: req.userId });
  if (!record) {
    return res.status(404).json({ message: "service record not found" });
  }

  const errors = validateService(body, true);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const data = pickFields(body);
  if (data.serviceDate !== undefined) data.serviceDate = new Date(data.serviceDate);
  if (data.odometerKm !== undefined) data.odometerKm = Number(data.odometerKm);

  const newDate = data.serviceDate || record.serviceDate;
  const newKm = data.odometerKm !== undefined ? data.odometerKm : record.odometerKm;

  const vehicle = await Vehicle.findById(record.vehicle);
  if (vehicle && newDate.getUTCFullYear() < vehicle.year) {
    return res.status(422).json({ message: "validation failed", errors: { serviceDate: "service date is before the vehicle was made" } });
  }

  const conflict = await checkChronology(record.vehicle, newDate, newKm, record._id);
  if (conflict) {
    return res.status(422).json(chronologyError(conflict));
  }

  Object.assign(record, data);
  await record.save();

  const warning = await saveReceipt(record, req.file);
  await record.populate("item", "name category");
  res.json({ record, warning });
};

const deleteService = async (req, res) => {
  const record = await ServiceRecord.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!record) {
    return res.status(404).json({ message: "service record not found" });
  }
  await deleteImage(record.receiptId);
  res.json({ message: "service record deleted" });
};

module.exports = { createService, getServices, updateService, deleteService };
