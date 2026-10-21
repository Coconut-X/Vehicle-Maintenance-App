const express = require("express");
const CatalogueItem = require("../models/CatalogueItem");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

//list of all default maintenance items
router.get("/", protect, async (req, res) => {
  const items = await CatalogueItem.find().sort({ category: 1, name: 1 });
  res.json({ items });
});

module.exports = router;
