const { DAYS_PER_MONTH } = require("./projection");

const MS_PER_DAY = 1000 * 60 * 60 * 24;

//when a car is added we dont know when each item was last done
//so assume it was done on schedule, at the last multiple of its km interval
//a car with 3500 km and an oil change every 5000 km was last done at 0 km, so 1500 km are left
//the last done date is moved back by the driving since then, only possible when the km per month is known
const initialBaseline = (vehicle, intervalKm) => {
  const km = vehicle.odometerKm;
  const baselineKm = intervalKm ? Math.floor(km / intervalKm) * intervalKm : km;

  let baselineDate = vehicle.odometerDate;
  if (intervalKm && vehicle.avgMonthlyKm > 0 && km > baselineKm) {
    const months = (km - baselineKm) / vehicle.avgMonthlyKm;
    baselineDate = new Date(new Date(vehicle.odometerDate).getTime() - months * DAYS_PER_MONTH * MS_PER_DAY);
  }

  return { baselineKm, baselineDate };
};

module.exports = { initialBaseline };
