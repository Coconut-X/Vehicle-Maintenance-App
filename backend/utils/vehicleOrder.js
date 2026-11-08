//puts vehicles in the order the user arranged, cars not in that list yet (new ones) come after, in the order they came in
const orderVehicles = (vehicles, order = []) => {
  const rank = new Map(order.map((id, i) => [id.toString(), i]));
  const saved = vehicles
    .filter((v) => rank.has(v._id.toString()))
    .sort((a, b) => rank.get(a._id.toString()) - rank.get(b._id.toString()));
  const rest = vehicles.filter((v) => !rank.has(v._id.toString()));
  return [...saved, ...rest];
};

module.exports = { orderVehicles };
