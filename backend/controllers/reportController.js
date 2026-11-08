const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const { getVehicleForUser } = require("../utils/access");
const { parseFilters, findRecords, groupByItem, availableItems, totalsOf, isId } = require("../utils/reportData");
const { buildReportPdf } = require("../utils/reportPdf");

//the vehicle if the user can use it, otherwise the response is already sent
const loadVehicle = async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(404).json({ message: "vehicle not found" });
    return null;
  }
  const vehicle = await getVehicleForUser(req.userId, req.params.id);
  if (!vehicle) res.status(404).json({ message: "vehicle not found" });
  return vehicle;
};

//what the filters would give, shown on the page before the pdf is made
const previewReport = async (req, res) => {
  const vehicle = await loadVehicle(req, res);
  if (!vehicle) return;

  const { filters, errors } = parseFilters(req.query);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const groups = groupByItem(await findRecords(vehicle._id, filters), filters.mode);
  res.json({
    ...totalsOf(groups),
    groups: groups.map((g) => ({ item: g.item, count: g.count, totalCost: g.totalCost })),
    availableItems: await availableItems(vehicle._id),
  });
};

const downloadReport = async (req, res) => {
  const vehicle = await loadVehicle(req, res);
  if (!vehicle) return;

  const { filters, errors } = parseFilters(req.query);
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const groups = groupByItem(await findRecords(vehicle._id, filters), filters.mode);
  if (groups.length === 0) {
    return res.status(422).json({ message: "no services match these filters" });
  }

  const user = await User.findById(req.userId).select("currency");
  const doc = buildReportPdf({ vehicle, user, filters, groups, totals: totalsOf(groups) });

  const file = "carvault-" + vehicle.registrationNo.replace(/[^A-Z0-9]+/gi, "-").toLowerCase() + "-report.pdf";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="' + file + '"');
  doc.pipe(res);
  doc.end();
};

module.exports = { previewReport, downloadReport };
