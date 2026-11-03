const ServiceRecord = require("../models/ServiceRecord");
const Vehicle = require("../models/Vehicle");
const CatalogueItem = require("../models/CatalogueItem");
const { uploadImage, deleteImage } = require("../config/cloudinary");
const { resetBaseline, updateOdometer, recalcUsage } = require("../utils/serviceSync");
const { calcDue } = require("../utils/dueDate");
const { getStatus } = require("../utils/status");
const { getString, getPaging, escapeRegex, pageInfo } = require("../utils/listQuery");

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

//after any change to history, reset the item baseline, update odometer and usage
//returns the new due point of the item so the client can show it straight away
const syncAfterChange = async (vehicle, itemId, record) => {
  const entry = await resetBaseline(vehicle._id, itemId);
  if (record) updateOdometer(vehicle, record);
  await recalcUsage(vehicle);
  await vehicle.save();

  if (!entry || !entry.enabled) return null;
  const due = calcDue(entry, vehicle);
  return { ...due, status: getStatus(due) };
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

  const due = await syncAfterChange(vehicle, item._id, record);

  const warning = await saveReceipt(record, req.file);
  await record.populate("item", "name category");
  res.status(201).json({ record, due, warning });
};

//history with search, filters, sort and pagination, all done in the database
const getServices = async (req, res) => {
  const { page, limit, skip } = getPaging(req.query);
  const search = getString(req.query.search);
  const category = getString(req.query.category);
  const from = getString(req.query.from);
  const to = getString(req.query.to);
  const sort = getString(req.query.sort);
  const order = getString(req.query.order) === "asc" ? 1 : -1;

  //owner first so nobody can see other peoples records
  const query = { owner: req.userId };

  if (isValidId(req.query.vehicle)) query.vehicle = req.query.vehicle;
  if (isValidId(req.query.item)) query.item = req.query.item;

  //category lives on the catalogue item so find those items first
  if (category) {
    const items = await CatalogueItem.find({ category }).select("_id");
    const ids = items.map((i) => i._id.toString());
    if (query.item) {
      if (!ids.includes(query.item)) query.item = null;
    } else {
      query.item = { $in: ids };
    }
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    query.$or = [{ workshop: regex }, { notes: regex }];
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (from && !isNaN(fromDate.getTime())) query.serviceDate = { $gte: fromDate };
  if (to && !isNaN(toDate.getTime())) {
    //include the whole last day
    toDate.setUTCHours(23, 59, 59, 999);
    query.serviceDate = { ...query.serviceDate, $lte: toDate };
  }

  //unknown sort keys fall back to newest first
  const sortBy = sort === "cost" ? { cost: order, serviceDate: -1 } : { serviceDate: order };

  const total = await ServiceRecord.countDocuments(query);
  const records = await ServiceRecord.find(query)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .populate("item", "name category")
    .populate("vehicle", "make model nickname registrationNo");

  res.json({ records, ...pageInfo(total, page, limit) });
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

  const due = vehicle ? await syncAfterChange(vehicle, record.item, record) : null;

  const warning = await saveReceipt(record, req.file);
  await record.populate("item", "name category");
  res.json({ record, due, warning });
};

const deleteService = async (req, res) => {
  const record = await ServiceRecord.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (!record) {
    return res.status(404).json({ message: "service record not found" });
  }
  await deleteImage(record.receiptId);

  //baseline goes back to the previous record of the same item
  const vehicle = await Vehicle.findById(record.vehicle);
  const due = vehicle ? await syncAfterChange(vehicle, record.item, null) : null;

  res.json({ message: "service record deleted", due });
};

module.exports = { createService, getServices, updateService, deleteService };
