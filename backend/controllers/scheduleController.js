const ScheduleEntry = require("../models/ScheduleEntry");

//null or empty string means the user wants to clear that interval
const isCleared = (v) => v === null || v === "";

const isWholeNumber = (v, min, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max;
};

//change intervals, turn an item on or off, or set a baseline for an item never serviced
const updateEntry = async (req, res) => {
  const body = req.body || {};
  const entry = await ScheduleEntry.findOne({ _id: req.params.entryId, owner: req.userId });
  if (!entry) {
    return res.status(404).json({ message: "schedule entry not found" });
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
    if (typeof body.enabled === "boolean") {
      entry.enabled = body.enabled;
    } else {
      errors.enabled = "enabled must be true or false";
    }
  }

  //baseline is when the item was last done before using the app
  if (body.baselineDate !== undefined) {
    const date = new Date(body.baselineDate);
    if (isNaN(date.getTime()) || date > new Date()) {
      errors.baselineDate = "baseline date must be a valid date and not in the future";
    } else {
      entry.baselineDate = date;
      entry.baselineSource = "initial";
    }
  }

  if (body.baselineKm !== undefined) {
    if (isWholeNumber(body.baselineKm, 0, 2000000)) {
      entry.baselineKm = Number(body.baselineKm);
    } else {
      errors.baselineKm = "baseline km must be a whole number from 0 to 2000000";
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
