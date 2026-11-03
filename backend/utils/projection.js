//srs 4.1 mileage projection
//estimate todays odometer from the last real reading and avg km per month

const DAYS_PER_MONTH = 30.44; //average month length so months dont drift
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const monthsBetween = (from, to) => {
  const days = (new Date(to) - new Date(from)) / MS_PER_DAY;
  return days / DAYS_PER_MONTH;
};

//returns the projected km or null when it cant be worked out
//null means distance based due dates should be skipped
const projectOdometer = (vehicle, evalDate = new Date()) => {
  const lastKm = vehicle.odometerKm;
  const lastDate = vehicle.odometerDate;
  const avg = vehicle.avgMonthlyKm;

  if (lastKm == null || !lastDate || !avg) {
    return null;
  }

  const months = monthsBetween(lastDate, evalDate);

  //eval date before the reading means nothing to project yet
  if (months <= 0) {
    return lastKm;
  }

  return Math.round(lastKm + avg * months);
};

//everything the frontend needs to show the estimate
const projectionInfo = (vehicle, evalDate = new Date()) => {
  return {
    projectedKm: projectOdometer(vehicle, evalDate),
    lastReadingKm: vehicle.odometerKm,
    lastReadingDate: vehicle.odometerDate,
    usageDerived: !!vehicle.usageDerived,
  };
};

module.exports = { DAYS_PER_MONTH, monthsBetween, projectOdometer, projectionInfo };
