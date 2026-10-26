const multer = require("multer");

const MAX_SIZE = 5 * 1024 * 1024; //5MB

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "photo"));
    }
  },
});

//wraps multer so its errors come back as normal 422 validation errors
const uploadPhoto = (req, res, next) => {
  photoUpload.single("photo")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(422).json({ message: "validation failed", errors: { photo: "photo must be 5MB or less" } });
    }
    if (err instanceof multer.MulterError) {
      return res.status(422).json({ message: "validation failed", errors: { photo: "photo must be a jpg, png or webp image" } });
    }
    next(err);
  });
};

module.exports = { uploadPhoto };
