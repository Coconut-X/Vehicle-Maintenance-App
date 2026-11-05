const express = require("express");
const { updateMe, changePassword, deleteMe } = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.put("/me", protect, updateMe);
router.put("/me/password", protect, changePassword);
router.delete("/me", protect, deleteMe);

module.exports = router;
