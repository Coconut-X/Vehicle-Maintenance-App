const { initialBaseline } = require("./initialBaseline");

//a schedule entry for one catalogue item on one vehicle, last done is not known yet so it is guessed
//items that dont fit the powertrain are made too but turned off, so a later change can bring them back
const newEntry = (vehicle, item) => {
  const { baselineKm, baselineDate } = initialBaseline(vehicle, item.defaultIntervalKm);
  return {
    owner: vehicle.owner,
    vehicle: vehicle._id,
    item: item._id,
    intervalKm: item.defaultIntervalKm,
    intervalMonths: item.defaultIntervalMonths,
    enabled: item.appliesTo(vehicle.powertrain),
    baselineDate,
    baselineKm,
    baselineSource: "initial",
  };
};

module.exports = { newEntry };
