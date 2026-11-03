const express = require("express");
const { createService, getServices, updateService, deleteService } = require("../controllers/serviceController");
const protect = require("../middleware/authMiddleware");
const { uploadReceipt } = require("../middleware/uploadMiddleware");

const router = express.Router();

//all service routes need login
router.use(protect);

router.get("/", getServices);
router.post("/", uploadReceipt, createService);
router.put("/:id", uploadReceipt, updateService);
router.delete("/:id", deleteService);

module.exports = router;
