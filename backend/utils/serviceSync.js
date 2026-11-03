//keeps schedule baselines and vehicle odometer in sync with the service history
//called after a service is added, edited or deleted
const ServiceRecord = require("../models/ServiceRecord");
const ScheduleEntry = require("../models/ScheduleEntry");
const { monthsBetween } = require("./projection");

//baseline of an item is its newest service record
//if no records are left we dont know when it was last done so it goes to unknown
const resetBaseline = async (vehicleId, itemId) => {
  const entry = await ScheduleEntry.findOne({ vehicle: vehicleId, item: itemId });
  if (!entry) return null;

  const latest = await ServiceRecord.findOne({ vehicle: vehicleId, item: itemId }).sort({ serviceDate: -1, odometerKm: -1 });

  if (latest) {
    entry.baselineDate = latest.serviceDate;
    entry.baselineKm = latest.odometerKm;
    entry.baselineSource = "service";
  } else if (entry.baselineSource === "service") {
    entry.baselineDate = undefined;
    entry.baselineKm = undefined;
    entry.baselineSource = "unknown";
  }

  await entry.save();
  return entry;
};

//a newer reading from a service replaces the vehicles last known odometer
const updateOdometer = (vehicle, record) => {
  if (record.serviceDate > vehicle.odometerDate) {
    vehicle.odometerKm = record.odometerKm;
    vehicle.odometerDate = record.serviceDate;
  }
};

//srs 4.1 self correction, work out avg km per month from the earliest and latest readings
//needs at least 30 days between them, otherwise the users own figure is kept
const recalcUsage = async (vehicle) => {
  const records = await ServiceRecord.find({ vehicle: vehicle._id }).select("serviceDate odometerKm");

  const readings = records.map((r) => ({ date: r.serviceDate, km: r.odometerKm }));
  readings.push({ date: vehicle.odometerDate, km: vehicle.odometerKm });
  readings.sort((a, b) => a.date - b.date);

  const first = readings[0];
  const last = readings[readings.length - 1];
  const days = (last.date - first.date) / (1000 * 60 * 60 * 24);

  if (readings.length < 2 || days < 30 || last.km < first.km) {
    return;
  }

  const avg = Math.round((last.km - first.km) / monthsBetween(first.date, last.date));
  vehicle.avgMonthlyKm = Math.min(avg, 20000);
  vehicle.usageDerived = true;
};

module.exports = { resetBaseline, updateOdometer, recalcUsage };
