const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//multer keeps the file in memory so we send the buffer straight to cloudinary
//resource type auto so pdf receipts work too
const uploadImage = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto" }, (err, result) => {
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

//private files, they can only be opened with a link we sign, used for documents like a registration card
//the signed link cant be made without our secret, so it cant be guessed from the file name
const uploadPrivate = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto", type: "authenticated" }, (err, result) => {
      if (err) return reject(err);
      resolve({ id: result.public_id, resourceType: result.resource_type, format: result.format });
    });
    stream.end(buffer);
  });
};

//transformation is optional, for example a small preview picture
const signedUrl = (file, transformation) => {
  return cloudinary.url(file.id, {
    resource_type: file.resourceType || "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
    format: file.format,
    ...(transformation ? { transformation } : {}),
  });
};

const deletePrivate = async (file) => {
  if (!file || !file.id) return;
  try {
    await cloudinary.uploader.destroy(file.id, { resource_type: file.resourceType || "image", type: "authenticated" });
  } catch (err) {
    console.log("could not delete file " + file.id + ": " + err.message);
  }
};

module.exports = { uploadImage, deleteImage, uploadPrivate, signedUrl, deletePrivate };
