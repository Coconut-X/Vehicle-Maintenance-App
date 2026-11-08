const multer = require("multer");

const MAX_SIZE = 5 * 1024 * 1024; //5MB

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RECEIPT_TYPES = [...IMAGE_TYPES, "application/pdf"];

//makes an upload middleware for one file field
//errors come back as normal 422 validation errors
const makeUpload = (field, allowed, typeMessage) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => {
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", field));
      }
    },
  });

  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(422).json({ message: "validation failed", errors: { [field]: field + " must be 5MB or less" } });
      }
      if (err instanceof multer.MulterError) {
        return res.status(422).json({ message: "validation failed", errors: { [field]: typeMessage } });
      }
      next(err);
    });
  };
};

//same idea for several files in one field, used for the pages of a document
const makeUploadMany = (field, allowed, typeMessage, maxCount) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE, files: maxCount },
    fileFilter: (req, file, cb) => {
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", field));
      }
    },
  });

  return (req, res, next) => {
    upload.array(field, maxCount)(req, res, (err) => {
      if (!err) return next();

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(422).json({ message: "validation failed", errors: { [field]: "each file must be 5MB or less" } });
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(422).json({ message: "validation failed", errors: { [field]: "at most " + maxCount + " files at a time" } });
      }
      if (err instanceof multer.MulterError) {
        return res.status(422).json({ message: "validation failed", errors: { [field]: typeMessage } });
      }
      next(err);
    });
  };
};

const uploadPhoto = makeUpload("photo", IMAGE_TYPES, "photo must be a jpg, png or webp image");
const uploadReceipt = makeUpload("receipt", RECEIPT_TYPES, "receipt must be a jpg, png, webp or pdf file");

const uploadDocumentFiles = makeUploadMany("files", RECEIPT_TYPES, "files must be jpg, png, webp or pdf", 6);

module.exports = { uploadPhoto, uploadReceipt, uploadDocumentFiles };
