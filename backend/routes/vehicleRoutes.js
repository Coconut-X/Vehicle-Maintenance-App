const express = require("express");
const {
  createVehicle,
  getVehicles,
  getVehicle,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

//all vehicle routes need login
router.use(protect);

router.get("/", getVehicles);
router.post("/", createVehicle);
router.get("/:id", getVehicle);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

module.exports = router;
