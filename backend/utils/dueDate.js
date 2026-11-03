//srs 4.2 dual interval due date engine
//works out when an item is due by time and by km and picks whichever comes first
const { DAYS_PER_MONTH, projectOdometer } = require("./projection");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

//adds calendar months, 31 jan + 1 month gives 28 feb not 3 march
const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
};

const daysBetween = (from, to) => {
  return Math.round((new Date(to) - new Date(from)) / MS_PER_DAY);
};

//entry is a schedule entry, vehicle gives the odometer and avg km
//returns dueDate and basis as null when neither branch can give a date
const calcDue = (entry, vehicle, evalDate = new Date()) => {
  const result = {
    dueDate: null,
    basis: null, //"time" or "distance"
    dueKm: null,
    remainingDays: null,
    remainingKm: null,
    projectedKm: null,
  };

  const hasBaselineDate = entry.baselineSource !== "unknown" && entry.baselineDate;
  const hasBaselineKm = entry.baselineSource !== "unknown" && entry.baselineKm != null;

  //time branch
  let timeDate = null;
  if (entry.intervalMonths != null && hasBaselineDate) {
    timeDate = addMonths(entry.baselineDate, entry.intervalMonths);
  }

  //distance branch
  let distanceDate = null;
  if (entry.intervalKm != null && hasBaselineKm) {
    result.dueKm = entry.baselineKm + entry.intervalKm;

    const projected = projectOdometer(vehicle, evalDate);
    if (projected != null) {
      result.projectedKm = projected;
      result.remainingKm = result.dueKm - projected;

      //turn the km left into days using avg km per month
      const monthsLeft = result.remainingKm / vehicle.avgMonthlyKm;
      distanceDate = new Date(new Date(evalDate).getTime() + monthsLeft * DAYS_PER_MONTH * MS_PER_DAY);
    }
  }

  //pick the earlier one, if only one exists that one wins
  if (timeDate && distanceDate) {
    if (distanceDate < timeDate) {
      result.dueDate = distanceDate;
      result.basis = "distance";
    } else {
      result.dueDate = timeDate;
      result.basis = "time";
    }
  } else if (timeDate) {
    result.dueDate = timeDate;
    result.basis = "time";
  } else if (distanceDate) {
    result.dueDate = distanceDate;
    result.basis = "distance";
  }

  if (result.dueDate) {
    result.remainingDays = daysBetween(evalDate, result.dueDate);
  }

  return result;
};

module.exports = { addMonths, daysBetween, calcDue };
