const ServiceRecord = require("../models/ServiceRecord");

const isId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

//reads the filters from the query string, returns the clean filters and the errors found
//every filter is optional and works on each single service, not on the item as a whole
const parseFilters = (query) => {
  const errors = {};
  const filters = { items: [], mode: "all" };

  if (query.items) {
    const ids = String(query.items).split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > 40 || ids.some((id) => !isId(id))) errors.items = "choose items from the list";
    else filters.items = ids;
  }

  const date = (name) => {
    if (query[name] === undefined || query[name] === "") return;
    const d = new Date(query[name] + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query[name]) || isNaN(d.getTime())) errors[name] = "enter a valid date";
    else filters[name] = query[name];
  };
  date("from");
  date("to");
  if (filters.from && filters.to && filters.from > filters.to) errors.to = "the end date is before the start date";

  const number = (name, whole) => {
    if (query[name] === undefined || query[name] === "") return;
    const n = Number(query[name]);
    if (isNaN(n) || n < 0 || (whole && !Number.isInteger(n))) errors[name] = whole ? "enter a whole number" : "enter an amount";
    else filters[name] = n;
  };
  number("kmFrom", true);
  number("kmTo", true);
  number("costFrom", false);
  number("costTo", false);
  if (filters.kmFrom !== undefined && filters.kmTo !== undefined && filters.kmFrom > filters.kmTo) errors.kmTo = "the end is lower than the start";
  if (filters.costFrom !== undefined && filters.costTo !== undefined && filters.costFrom > filters.costTo) errors.costTo = "the end is lower than the start";

  if (query.mode === "latest") filters.mode = "latest";
  else if (query.mode !== undefined && query.mode !== "" && query.mode !== "all") errors.mode = "choose all or latest";

  return { filters, errors };
};

//the services of one vehicle that pass every filter, oldest first
const findRecords = async (vehicleId, filters) => {
  const query = { vehicle: vehicleId };

  if (filters.items.length) query.item = { $in: filters.items };
  if (filters.from || filters.to) {
    query.serviceDate = {};
    if (filters.from) query.serviceDate.$gte = new Date(filters.from + "T00:00:00.000Z");
    if (filters.to) query.serviceDate.$lte = new Date(filters.to + "T23:59:59.999Z");
  }
  if (filters.kmFrom !== undefined || filters.kmTo !== undefined) {
    query.odometerKm = {};
    if (filters.kmFrom !== undefined) query.odometerKm.$gte = filters.kmFrom;
    if (filters.kmTo !== undefined) query.odometerKm.$lte = filters.kmTo;
  }
  //a service with no cost entered cant be inside a cost range, so it is left out when one is set
  if (filters.costFrom !== undefined || filters.costTo !== undefined) {
    query.cost = {};
    if (filters.costFrom !== undefined) query.cost.$gte = filters.costFrom;
    if (filters.costTo !== undefined) query.cost.$lte = filters.costTo;
  }

  return ServiceRecord.find(query).populate("item", "name category").sort({ serviceDate: 1, odometerKm: 1 });
};

//one group per item, combined cost over all its matching services
//in latest mode only the newest service is listed, the count and cost still cover all of them
const groupByItem = (records, mode) => {
  const groups = {};
  records.forEach((r) => {
    if (!r.item) return;
    const key = r.item._id.toString();
    if (!groups[key]) groups[key] = { item: { _id: r.item._id, name: r.item.name, category: r.item.category }, records: [], count: 0, totalCost: 0 };
    groups[key].records.push(r);
    groups[key].count++;
    groups[key].totalCost += r.cost || 0;
  });

  return Object.values(groups)
    .map((g) => {
      g.totalCost = Math.round(g.totalCost * 100) / 100;
      const newestFirst = [...g.records].reverse();
      g.shown = mode === "latest" ? newestFirst.slice(0, 1) : newestFirst;
      return g;
    })
    .sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name));
};

//which items this vehicle has any services for, for the list of choices, filters are ignored here
const availableItems = async (vehicleId) => {
  const rows = await ServiceRecord.aggregate([
    { $match: { vehicle: vehicleId } },
    { $group: { _id: "$item", count: { $sum: 1 } } },
    { $lookup: { from: "catalogueitems", localField: "_id", foreignField: "_id", as: "item" } },
    { $unwind: "$item" },
    { $project: { _id: 1, count: 1, name: "$item.name", category: "$item.category" } },
    { $sort: { category: 1, name: 1 } },
  ]);
  return rows;
};

const totalsOf = (groups) => ({
  items: groups.length,
  services: groups.reduce((n, g) => n + g.count, 0),
  totalCost: Math.round(groups.reduce((n, g) => n + g.totalCost, 0) * 100) / 100,
});

module.exports = { parseFilters, findRecords, groupByItem, availableItems, totalsOf, isId };
