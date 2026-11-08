const express = require("express");
const { previewReport, downloadReport } = require("../controllers/reportController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

//all report routes need login
router.use(protect);

router.get("/vehicle/:id/preview", previewReport);
router.get("/vehicle/:id/pdf", downloadReport);

module.exports = router;
