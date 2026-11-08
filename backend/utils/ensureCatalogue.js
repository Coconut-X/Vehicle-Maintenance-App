const CatalogueItem = require("../models/CatalogueItem");
const ScheduleEntry = require("../models/ScheduleEntry");
const Vehicle = require("../models/Vehicle");
const { items } = require("../seed/catalogue");
const { newEntry } = require("./newEntry");

//runs when the server starts, only ever adds things
//1 catalogue items from seed/catalogue.js that are not in the database yet
//2 a schedule entry for every vehicle that does not have that item yet
//so an item added to the catalogue later reaches cars that already exist, no manual step
//items already there are left alone, so edits made in the database are not overwritten
//filter limits it to some vehicles, used by tests
const ensureCatalogue = async (filter = {}) => {
  const result = { items: 0, entries: 0 };

  for (const item of items) {
    const found = await CatalogueItem.exists({ name: item.name });
    if (!found) {
      await CatalogueItem.create(item);
      result.items++;
    }
  }

  const catalogue = await CatalogueItem.find();
  const vehicles = await Vehicle.find(filter);

  for (const vehicle of vehicles) {
    const have = new Set((await ScheduleEntry.find({ vehicle: vehicle._id }).select("item")).map((e) => e.item.toString()));
    const missing = catalogue.filter((item) => !have.has(item._id.toString()));
    if (missing.length === 0) continue;

    await ScheduleEntry.insertMany(missing.map((item) => newEntry(vehicle, item)));
    result.entries += missing.length;
  }

  return result;
};

module.exports = { ensureCatalogue };
