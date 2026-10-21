//default maintenance items from srs appendix A
//null means the item is not checked by that measure
const items = [
  { name: "Engine oil change", category: "Engine", defaultIntervalKm: 5000, defaultIntervalMonths: 6, notes: "usually due by km for a daily driver" },
  { name: "Oil filter", category: "Filters", defaultIntervalKm: 5000, defaultIntervalMonths: 6, notes: "change it with the engine oil" },
  { name: "Air filter", category: "Filters", defaultIntervalKm: 15000, defaultIntervalMonths: 12, notes: "dirty filter hurts fuel average" },
  { name: "Cabin / pollen filter", category: "Filters", defaultIntervalKm: 20000, defaultIntervalMonths: 12, notes: "keeps the AC air clean" },
  { name: "Fuel filter", category: "Filters", defaultIntervalKm: 30000, defaultIntervalMonths: 24, notes: "stops dirt reaching the injectors" },
  { name: "Brake pads (front)", category: "Brakes", defaultIntervalKm: 30000, defaultIntervalMonths: null, notes: "wears only with driving" },
  { name: "Brake pads (rear)", category: "Brakes", defaultIntervalKm: 45000, defaultIntervalMonths: null, notes: "wears only with driving" },
  { name: "Brake fluid", category: "Brakes", defaultIntervalKm: null, defaultIntervalMonths: 24, notes: "takes in moisture with age" },
  { name: "Coolant / antifreeze", category: "Fluids", defaultIntervalKm: 60000, defaultIntervalMonths: 36, notes: "old coolant can cause overheating" },
  { name: "Transmission fluid", category: "Fluids", defaultIntervalKm: 60000, defaultIntervalMonths: 48, notes: "check your car manual for the type" },
  { name: "Spark plugs", category: "Engine", defaultIntervalKm: 40000, defaultIntervalMonths: 36, notes: "worn plugs cause misfires" },
  { name: "Timing belt", category: "Engine", defaultIntervalKm: 100000, defaultIntervalMonths: 60, notes: "if it breaks the engine can be damaged" },
  { name: "Tyre rotation", category: "Tyres", defaultIntervalKm: 10000, defaultIntervalMonths: null, notes: "helps tyres wear evenly" },
  { name: "Wheel alignment", category: "Tyres", defaultIntervalKm: 20000, defaultIntervalMonths: 12, notes: "car pulling to one side means its due" },
  { name: "Tyre replacement", category: "Tyres", defaultIntervalKm: 50000, defaultIntervalMonths: 60, notes: "rubber gets old even if not used" },
  { name: "Battery replacement", category: "Electrical", defaultIntervalKm: null, defaultIntervalMonths: 36, notes: "batteries age by time" },
  { name: "Wiper blades", category: "Electrical", defaultIntervalKm: null, defaultIntervalMonths: 12, notes: "replace if they leave streaks" },
  { name: "General inspection / tune-up", category: "Inspection", defaultIntervalKm: 20000, defaultIntervalMonths: 12, notes: "full checkup at a workshop" },
];

module.exports = items;
