//default maintenance items from srs appendix A
//null means the item is not checked by that measure
//powertrains says which cars get the item, an electric car has no engine oil or spark plugs

const ALL = ["petrol", "hybrid", "phev", "electric"];
const ENGINE = ["petrol", "hybrid", "phev"];
const HIGH_VOLTAGE = ["hybrid", "phev", "electric"];

const items = [
  { name: "Engine oil change", category: "Engine", defaultIntervalKm: 5000, defaultIntervalMonths: 6, notes: "usually due by km for a daily driver", powertrains: ENGINE },
  { name: "Oil filter", category: "Filters", defaultIntervalKm: 5000, defaultIntervalMonths: 6, notes: "change it with the engine oil", powertrains: ENGINE },
  { name: "Air filter", category: "Filters", defaultIntervalKm: 15000, defaultIntervalMonths: 12, notes: "dirty filter hurts fuel average", powertrains: ENGINE },
  { name: "Cabin / pollen filter", category: "Filters", defaultIntervalKm: 20000, defaultIntervalMonths: 12, notes: "keeps the AC air clean", powertrains: ALL },
  { name: "Fuel filter", category: "Filters", defaultIntervalKm: 30000, defaultIntervalMonths: 24, notes: "stops dirt reaching the injectors", powertrains: ENGINE },
  { name: "Brake pads (front)", category: "Brakes", defaultIntervalKm: 30000, defaultIntervalMonths: null, notes: "wears only with driving", powertrains: ALL },
  { name: "Brake pads (rear)", category: "Brakes", defaultIntervalKm: 45000, defaultIntervalMonths: null, notes: "wears only with driving", powertrains: ALL },
  { name: "Brake fluid", category: "Brakes", defaultIntervalKm: null, defaultIntervalMonths: 24, notes: "takes in moisture with age", powertrains: ALL },
  { name: "Coolant / antifreeze", category: "Fluids", defaultIntervalKm: 60000, defaultIntervalMonths: 36, notes: "old coolant can cause overheating", powertrains: ALL },
  { name: "Transmission fluid", category: "Fluids", defaultIntervalKm: 60000, defaultIntervalMonths: 48, notes: "check your car manual for the type", powertrains: ALL },
  { name: "Spark plugs", category: "Engine", defaultIntervalKm: 40000, defaultIntervalMonths: 36, notes: "worn plugs cause misfires", powertrains: ENGINE },
  { name: "Timing belt", category: "Engine", defaultIntervalKm: 100000, defaultIntervalMonths: 60, notes: "if it breaks the engine can be damaged", powertrains: ENGINE },
  { name: "Tyre rotation", category: "Tyres", defaultIntervalKm: 10000, defaultIntervalMonths: null, notes: "helps tyres wear evenly", powertrains: ALL },
  { name: "Wheel alignment", category: "Tyres", defaultIntervalKm: 20000, defaultIntervalMonths: 12, notes: "car pulling to one side means its due", powertrains: ALL },
  { name: "Tyre replacement", category: "Tyres", defaultIntervalKm: 50000, defaultIntervalMonths: 60, notes: "rubber gets old even if not used", powertrains: ALL },
  { name: "Battery replacement", category: "Electrical", defaultIntervalKm: null, defaultIntervalMonths: 36, notes: "batteries age by time", powertrains: ALL },
  { name: "Wiper fluid", category: "Fluids", defaultIntervalKm: null, defaultIntervalMonths: 6, notes: "top it up so the wipers can clean the glass", powertrains: ALL },
  { name: "Wiper blades", category: "Electrical", defaultIntervalKm: null, defaultIntervalMonths: 12, notes: "replace if they leave streaks", powertrains: ALL },
  { name: "General inspection / tune-up", category: "Inspection", defaultIntervalKm: 20000, defaultIntervalMonths: 12, notes: "full checkup at a workshop", powertrains: ALL },

  //extra item for cars with a high voltage battery, not in appendix A
  { name: "High voltage battery check", category: "Electrical", defaultIntervalKm: 20000, defaultIntervalMonths: 12, notes: "health and cooling check of the drive battery", powertrains: HIGH_VOLTAGE },
];

module.exports = { items, POWERTRAINS: ALL };
