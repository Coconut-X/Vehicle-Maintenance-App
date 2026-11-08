const ServiceRecord = require("../models/ServiceRecord");
const { projectOdometer } = require("./projection");

const day = (d) => new Date(d).toISOString().slice(0, 10);

//what the odometer can have been on a date, from the real readings we already know
//from = the reading just before that date (the newest service or the car's own reading), 0 at the start of the car's year if there is none
//to = the reading just after it, or the odometer today when nothing is after
//estimate = a guess in between by date, used when the user doesnt remember the reading
//readings that were estimated before are not used, a guess must not build on a guess
const odometerRange = async (vehicle, date, skipId) => {
  const query = { vehicle: vehicle._id, odometerEstimated: { $ne: true } };
  if (skipId) query._id = { $ne: skipId };
  const records = await ServiceRecord.find(query).select("serviceDate odometerKm");

  const readings = records.map((r) => ({ date: r.serviceDate, km: r.odometerKm }));
  readings.push({ date: vehicle.odometerDate, km: vehicle.odometerKm });

  const target = day(date);
  const before = readings.filter((r) => day(r.date) <= target).sort((a, b) => b.date - a.date);
  const after = readings.filter((r) => day(r.date) > target).sort((a, b) => a.date - b.date);

  const start = { date: new Date(Date.UTC(vehicle.year, 0, 1)), km: 0 };
  const prev = before[0] || start;

  //nothing after means the date is past the last reading, so the end is the odometer today
  let next = after[0];
  if (!next) {
    const now = new Date();
    next = { date: now, km: projectOdometer(vehicle, now) ?? prev.km };
  }

  const from = prev.km;
  const to = Math.max(from, next.km);

  let estimate = from;
  const span = new Date(next.date) - new Date(prev.date);
  if (span > 0) {
    const passed = Math.min(Math.max(new Date(date) - new Date(prev.date), 0), span);
    estimate = Math.round(from + ((to - from) * passed) / span);
  }

  return { from: Math.round(from), to: Math.round(to), estimate };
};

module.exports = { odometerRange };
