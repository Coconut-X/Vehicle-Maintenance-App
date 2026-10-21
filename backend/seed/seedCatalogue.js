//run with npm run seed
//safe to run again because it updates by name instead of adding duplicates
require("dotenv").config();
const mongoose = require("mongoose");
const CatalogueItem = require("../models/CatalogueItem");
const items = require("./catalogue");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const item of items) {
      await CatalogueItem.findOneAndUpdate({ name: item.name }, item, {
        upsert: true,
        runValidators: true,
      });
    }

    const count = await CatalogueItem.countDocuments();
    console.log("catalogue seeded, items in db: " + count);
  } catch (err) {
    console.log("seed failed: " + err.message);
  }
  await mongoose.disconnect();
};

seed();
