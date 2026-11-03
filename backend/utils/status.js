//srs appendix C status rules

const DUE_SOON_DAYS = 30;
const DUE_SOON_KM = 500;

//worst first, used to pick a vehicles overall status
//unknown comes after due soon so a missing usage figure doesnt hide a real due item
const STATUS_ORDER = ["overdue", "due_soon", "unknown", "up_to_date"];

//takes the result of calcDue and gives one of the statuses above
const getStatus = (due) => {
  if (!due || !due.dueDate) {
    return "unknown";
  }

  //overdue if either the date passed or the km went over
  if (due.remainingDays < 0 || (due.remainingKm != null && due.remainingKm < 0)) {
    return "overdue";
  }

  if (due.remainingDays <= DUE_SOON_DAYS || (due.remainingKm != null && due.remainingKm <= DUE_SOON_KM)) {
    return "due_soon";
  }

  return "up_to_date";
};

//vehicle summary is the worst status of its items so one overdue item cant hide
const worstStatus = (statuses) => {
  if (statuses.length === 0) return "up_to_date";
  let worst = statuses[0];
  statuses.forEach((s) => {
    if (STATUS_ORDER.indexOf(s) < STATUS_ORDER.indexOf(worst)) {
      worst = s;
    }
  });
  return worst;
};

module.exports = { DUE_SOON_DAYS, DUE_SOON_KM, STATUS_ORDER, getStatus, worstStatus };
