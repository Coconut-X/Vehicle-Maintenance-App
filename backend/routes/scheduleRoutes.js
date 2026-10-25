const express = require("express");
const { updateEntry } = require("../controllers/scheduleController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/:entryId", protect, updateEntry);

module.exports = router;
