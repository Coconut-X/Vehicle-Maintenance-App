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

const uploadPhoto = makeUpload("photo", IMAGE_TYPES, "photo must be a jpg, png or webp image");
const uploadReceipt = makeUpload("receipt", RECEIPT_TYPES, "receipt must be a jpg, png, webp or pdf file");

module.exports = { uploadPhoto, uploadReceipt };
