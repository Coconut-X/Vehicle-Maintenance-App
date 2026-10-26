const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//multer keeps the file in memory so we send the buffer straight to cloudinary
const uploadImage = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve({ url: result.secure_url, id: result.public_id });
    });
    stream.end(buffer);
  });
};

const deleteImage = async (id) => {
  if (!id) return;
  try {
    await cloudinary.uploader.destroy(id);
  } catch (err) {
    //not a big deal if this fails, the record is already gone
    console.log("could not delete image " + id + ": " + err.message);
  }
};

module.exports = { uploadImage, deleteImage };
