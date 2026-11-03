//works out due point and status for every enabled item of one vehicle
//used by the dashboard and the vehicle list
const { calcDue } = require("./dueDate");
const { getStatus, worstStatus } = require("./status");

const evaluateVehicle = (vehicle, entries, evalDate = new Date()) => {
  const counts = { overdue: 0, due_soon: 0, unknown: 0, up_to_date: 0 };
  const items = [];

  entries.forEach((entry) => {
    if (!entry.enabled) return;
    const due = calcDue(entry, vehicle, evalDate);
    const status = getStatus(due);
    counts[status]++;
    items.push({ entry, due, status });
  });

  //smallest days left is the most urgent, used for sorting by urgency
  let minDays = null;
  items.forEach((i) => {
    if (i.due.remainingDays != null && (minDays === null || i.due.remainingDays < minDays)) {
      minDays = i.due.remainingDays;
    }
  });

  return {
    items,
    counts,
    summary: worstStatus(items.map((i) => i.status)),
    minDays,
  };
};

module.exports = { evaluateVehicle };
