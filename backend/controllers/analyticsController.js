const ServiceRecord = require("../models/ServiceRecord");
const { accessibleVehicleIds, getVehicleForUser } = require("../utils/access");

const isValidId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

//list of the last 12 months as "2026-11" so empty months still show as 0
const lastMonths = (count) => {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
};

//cost totals for the whole garage or for one vehicle with ?vehicle=id
const getAnalytics = async (req, res) => {
  //the cars of the user, own and of the groups
  const usable = await accessibleVehicleIds(req.userId);
  const match = { vehicle: { $in: usable } };

  const vehicleId = req.query.vehicle;
  if (vehicleId) {
    //another users vehicle gives 404 same as a missing one
    const vehicle = isValidId(vehicleId) ? await getVehicleForUser(req.userId, vehicleId) : null;
    if (!vehicle) {
      return res.status(404).json({ message: "vehicle not found" });
    }
    match.vehicle = vehicle._id;
  }

  //total cost and km driven per vehicle, km is from the lowest to the highest service reading
  const perVehicle = await ServiceRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$vehicle",
        cost: { $sum: { $ifNull: ["$cost", 0] } },
        count: { $sum: 1 },
        //guessed readings are skipped, they would make the km driven look more exact than it is
        minKm: { $min: { $cond: [{ $eq: ["$odometerEstimated", true] }, null, "$odometerKm"] } },
        maxKm: { $max: { $cond: [{ $eq: ["$odometerEstimated", true] }, null, "$odometerKm"] } },
      },
    },
  ]);

  let totalCost = 0;
  let serviceCount = 0;
  let distanceKm = 0;
  perVehicle.forEach((v) => {
    totalCost += v.cost;
    serviceCount += v.count;
    if (v.maxKm != null && v.minKm != null) distanceKm += v.maxKm - v.minKm;
  });

  //need at least two readings far apart, otherwise cost per km means nothing
  const costPerKm = distanceKm > 0 ? Math.round((totalCost / distanceKm) * 100) / 100 : null;

  const byCategory = await ServiceRecord.aggregate([
    { $match: match },
    { $lookup: { from: "catalogueitems", localField: "item", foreignField: "_id", as: "item" } },
    { $unwind: "$item" },
    {
      $group: {
        _id: "$item.category",
        cost: { $sum: { $ifNull: ["$cost", 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { cost: -1 } },
  ]);

  const months = lastMonths(12);
  const monthly = await ServiceRecord.aggregate([
    { $match: { ...match, serviceDate: { $gte: new Date(months[0] + "-01T00:00:00Z") } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$serviceDate" } },
        cost: { $sum: { $ifNull: ["$cost", 0] } },
        count: { $sum: 1 },
      },
    },
  ]);

  const monthlyCost = months.map((m) => {
    const found = monthly.find((x) => x._id === m);
    return { month: m, cost: found ? Math.round(found.cost * 100) / 100 : 0, count: found ? found.count : 0 };
  });

  res.json({
    totalCost: Math.round(totalCost * 100) / 100,
    serviceCount,
    distanceKm,
    costPerKm,
    byCategory: byCategory.map((c) => ({ category: c._id, cost: Math.round(c.cost * 100) / 100, count: c.count })),
    monthly: monthlyCost,
  });
};

module.exports = { getAnalytics };
