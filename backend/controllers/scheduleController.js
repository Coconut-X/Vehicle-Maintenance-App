const ScheduleEntry = require("../models/ScheduleEntry");
const Vehicle = require("../models/Vehicle");
const CatalogueItem = require("../models/CatalogueItem");
const { getVehicleForUser } = require("../utils/access");

//null or empty string means the user wants to clear that interval
const isCleared = (v) => v === null || v === "";

const isWholeNumber = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max;
};

//change intervals or turn an item on or off
//when an item was last done is never edited here, only logging a service moves it
const updateEntry = async (req, res) => {
  const body = req.body || {};
  //the entry of a car the user can use, own or of a group
  const found = /^[a-f0-9]{24}$/i.test(String(req.params.entryId)) ? await ScheduleEntry.findById(req.params.entryId) : null;
  const entry = found && (await getVehicleForUser(req.userId, found.vehicle)) ? found : null;
  if (!entry) {
    return res.status(404).json({ message: "schedule entry not found" });
  }

  //an item that doesnt fit the car is hidden, so nothing about it can be changed
  //otherwise an ev would get oil change reminders
  const vehicle = await Vehicle.findById(entry.vehicle);
  const item = await CatalogueItem.findById(entry.item);
  if (vehicle && item && !item.appliesTo(vehicle.powertrain)) {
    return res.status(422).json({
      message: "validation failed",
      errors: { item: "this item is not used on a " + vehicle.powertrain + " car" },
    });
  }

  const errors = {};

  if (body.intervalKm !== undefined) {
    if (isCleared(body.intervalKm)) {
      entry.intervalKm = null;
    } else if (isWholeNumber(body.intervalKm, 100, 200000)) {
      entry.intervalKm = Number(body.intervalKm);
    } else {
      errors.intervalKm = "km interval must be a whole number from 100 to 200000";
    }
  }

  if (body.intervalMonths !== undefined) {
    if (isCleared(body.intervalMonths)) {
      entry.intervalMonths = null;
    } else if (isWholeNumber(body.intervalMonths, 1, 120)) {
      entry.intervalMonths = Number(body.intervalMonths);
    } else {
      errors.intervalMonths = "month interval must be a whole number from 1 to 120";
    }
  }

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      errors.enabled = "enabled must be true or false";
    } else {
      entry.enabled = body.enabled;
    }
  }

  if (Object.keys(errors).length === 0 && entry.intervalKm == null && entry.intervalMonths == null) {
    errors.intervalKm = "an item must be checked by km, by months or both";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  await entry.save();
  await entry.populate("item", "name category notes");
  res.json({ entry });
};

module.exports = { updateEntry };
