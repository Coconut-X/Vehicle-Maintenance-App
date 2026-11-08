const express = require("express");
const { getDocuments, createDocument, addFiles, renameDocument, removeFile, deleteDocument } = require("../controllers/documentController");
const protect = require("../middleware/authMiddleware");
const { uploadDocumentFiles } = require("../middleware/uploadMiddleware");

const router = express.Router();

//all document routes need login
router.use(protect);

router.get("/", getDocuments);
router.post("/", uploadDocumentFiles, createDocument);
router.post("/:id/files", uploadDocumentFiles, addFiles);
router.put("/:id", renameDocument);
router.delete("/:id/files/:fileId", removeFile);
router.delete("/:id", deleteDocument);

module.exports = router;
