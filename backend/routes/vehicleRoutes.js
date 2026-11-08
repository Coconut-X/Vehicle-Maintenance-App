const express = require("express");
const {
  createVehicle,
  getVehicles,
  setOrder,
  getVehicle,
  getSchedule,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");
const protect = require("../middleware/authMiddleware");
const { uploadPhoto } = require("../middleware/uploadMiddleware");

const router = express.Router();

//all vehicle routes need login
router.use(protect);

router.get("/", getVehicles);
router.post("/", uploadPhoto, createVehicle);
//before the routes with an id, otherwise "order" would be read as an id
router.put("/order", setOrder);
router.get("/:id", getVehicle);
router.get("/:id/schedule", getSchedule);
router.put("/:id", uploadPhoto, updateVehicle);
router.delete("/:id", deleteVehicle);

module.exports = router;
