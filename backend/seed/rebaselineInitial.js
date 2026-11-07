//one time fix for vehicles made before baselines followed the schedule
//only entries that were never changed by a service are touched, history always wins
//run with: npm run rebaseline
require("dotenv").config();
const mongoose = require("mongoose");
const ScheduleEntry = require("../models/ScheduleEntry");
const Vehicle = require("../models/Vehicle");
const { initialBaseline } = require("../utils/initialBaseline");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const entries = await ScheduleEntry.find({ baselineSource: "initial" });
  const vehicles = {};
  let changed = 0;

  for (const entry of entries) {
    const key = entry.vehicle.toString();
    if (!vehicles[key]) vehicles[key] = await Vehicle.findById(entry.vehicle);
    const vehicle = vehicles[key];
    if (!vehicle) continue;

    const { baselineKm, baselineDate } = initialBaseline(vehicle, entry.intervalKm);
    entry.baselineKm = baselineKm;
    entry.baselineDate = baselineDate;
    await entry.save();
    changed++;
  }

  console.log("entries fixed: " + changed + " of " + entries.length);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.log(err);
  process.exit(1);
});
