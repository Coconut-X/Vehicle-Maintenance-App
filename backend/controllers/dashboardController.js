const Vehicle = require("../models/Vehicle");
const ScheduleEntry = require("../models/ScheduleEntry");
const { evaluateVehicle } = require("../utils/vehicleStatus");

//status of every vehicle plus a list of overdue and due soon items across the garage
const getDashboard = async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.userId }).sort({ createdAt: -1 });
  const entries = await ScheduleEntry.find({ owner: req.userId, enabled: true }).populate("item", "name category");

  //group entries by vehicle so each vehicle only looks at its own items
  const byVehicle = {};
  entries.forEach((e) => {
    const key = e.vehicle.toString();
    if (!byVehicle[key]) byVehicle[key] = [];
    byVehicle[key].push(e);
  });

  const now = new Date();
  const cards = [];
  const urgent = [];

  vehicles.forEach((v) => {
    const result = evaluateVehicle(v, byVehicle[v._id.toString()] || [], now);

    cards.push({
      _id: v._id,
      make: v.make,
      model: v.model,
      nickname: v.nickname,
      registrationNo: v.registrationNo,
      photoUrl: v.photoUrl,
      summary: result.summary,
      counts: result.counts,
    });

    result.items.forEach((i) => {
      if (i.status === "overdue" || i.status === "due_soon") {
        urgent.push({
          entryId: i.entry._id,
          vehicle: { _id: v._id, make: v.make, model: v.model, nickname: v.nickname, registrationNo: v.registrationNo },
          item: i.entry.item,
          status: i.status,
          due: i.due,
        });
      }
    });
  });

  //most urgent first, overdue items have negative days so they come on top
  urgent.sort((a, b) => a.due.remainingDays - b.due.remainingDays);

  const totals = { overdue: 0, due_soon: 0, unknown: 0, up_to_date: 0 };
  cards.forEach((c) => {
    Object.keys(totals).forEach((k) => (totals[k] += c.counts[k]));
  });

  res.json({ vehicles: cards, urgent, totals });
};

module.exports = { getDashboard };
