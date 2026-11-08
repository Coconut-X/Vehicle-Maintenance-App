const Document = require("../models/Document");
const { uploadPrivate, signedUrl, deletePrivate } = require("../config/cloudinary");
const { getVehicleForUser } = require("../utils/access");

const MAX_FILES_PER_DOCUMENT = 10;
const MAX_DOCUMENTS_PER_VEHICLE = 30;

const isValidId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

//small preview picture for the list, a pdf has no preview
const THUMB = [{ width: 480, height: 320, crop: "fill", gravity: "auto", quality: "auto" }];

//what the frontend gets, every file comes with a signed link
const present = (doc) => ({
  _id: doc._id,
  vehicle: doc.vehicle,
  name: doc.name,
  createdAt: doc.createdAt,
  files: doc.files.map((f) => ({
    _id: f._id,
    kind: f.kind,
    originalName: f.originalName,
    url: signedUrl(f),
    thumbUrl: f.kind === "image" ? signedUrl(f, THUMB) : null,
  })),
});

const checkName = (name) => {
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 60) return "name must be 1 to 60 characters";
  return null;
};

//sends the uploaded files to cloudinary, if one fails the ones already sent are removed again
const storeFiles = async (files, folder) => {
  const done = [];
  try {
    for (const file of files) {
      const stored = await uploadPrivate(file.buffer, folder);
      done.push({
        id: stored.id,
        resourceType: stored.resourceType,
        format: stored.format,
        kind: file.mimetype === "application/pdf" ? "pdf" : "image",
        originalName: (file.originalname || "").slice(0, 120),
      });
    }
    return done;
  } catch (err) {
    console.log("document upload failed: " + (err.message || err));
    for (const f of done) await deletePrivate(f);
    return null;
  }
};

//the document, only if the user can use its vehicle, the vehicle check is in one place so sharing can change it later
const findDocument = async (req) => {
  if (!isValidId(req.params.id)) return null;
  const doc = await Document.findById(req.params.id);
  if (!doc) return null;
  const vehicle = await getVehicleForUser(req.userId, doc.vehicle);
  return vehicle ? doc : null;
};

const uploadFailed = (res) => res.status(502).json({ message: "the files could not be uploaded, try again later" });

const getDocuments = async (req, res) => {
  if (!isValidId(req.query.vehicle)) {
    return res.status(422).json({ message: "validation failed", errors: { vehicle: "choose a vehicle" } });
  }
  const vehicle = await getVehicleForUser(req.userId, req.query.vehicle);
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }

  const docs = await Document.find({ vehicle: vehicle._id }).sort({ createdAt: -1 });
  res.json({ documents: docs.map(present) });
};

const createDocument = async (req, res) => {
  const body = req.body || {};
  const errors = {};
  const nameError = checkName(body.name);
  if (nameError) errors.name = nameError;
  if (!isValidId(body.vehicle)) errors.vehicle = "choose a vehicle";
  if (!req.files || req.files.length === 0) errors.files = "add at least one photo or pdf";
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const vehicle = await getVehicleForUser(req.userId, body.vehicle);
  if (!vehicle) {
    return res.status(404).json({ message: "vehicle not found" });
  }
  if ((await Document.countDocuments({ vehicle: vehicle._id })) >= MAX_DOCUMENTS_PER_VEHICLE) {
    return res.status(422).json({ message: "validation failed", errors: { name: "this vehicle already has " + MAX_DOCUMENTS_PER_VEHICLE + " documents" } });
  }

  const files = await storeFiles(req.files, "carvault/documents");
  if (!files) return uploadFailed(res);

  const doc = await Document.create({ owner: vehicle.owner, createdBy: req.userId, vehicle: vehicle._id, name: body.name.trim(), files });
  res.status(201).json({ document: present(doc) });
};

//more pages for a document that exists, like the back of a card
const addFiles = async (req, res) => {
  const doc = await findDocument(req);
  if (!doc) {
    return res.status(404).json({ message: "document not found" });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(422).json({ message: "validation failed", errors: { files: "add at least one photo or pdf" } });
  }
  if (doc.files.length + req.files.length > MAX_FILES_PER_DOCUMENT) {
    return res.status(422).json({ message: "validation failed", errors: { files: "a document can have " + MAX_FILES_PER_DOCUMENT + " pages at most" } });
  }

  const files = await storeFiles(req.files, "carvault/documents");
  if (!files) return uploadFailed(res);

  doc.files.push(...files);
  await doc.save();
  res.json({ document: present(doc) });
};

const renameDocument = async (req, res) => {
  const doc = await findDocument(req);
  if (!doc) {
    return res.status(404).json({ message: "document not found" });
  }
  const nameError = checkName(req.body && req.body.name);
  if (nameError) {
    return res.status(422).json({ message: "validation failed", errors: { name: nameError } });
  }

  doc.name = req.body.name.trim();
  await doc.save();
  res.json({ document: present(doc) });
};

const removeFile = async (req, res) => {
  const doc = await findDocument(req);
  const file = doc && isValidId(req.params.fileId) ? doc.files.id(req.params.fileId) : null;
  if (!file) {
    return res.status(404).json({ message: "page not found" });
  }
  if (doc.files.length === 1) {
    return res.status(422).json({ message: "validation failed", errors: { files: "a document needs at least one page, delete the whole document instead" } });
  }

  const gone = { id: file.id, resourceType: file.resourceType };
  file.deleteOne();
  await doc.save();
  await deletePrivate(gone);
  res.json({ document: present(doc) });
};

const deleteDocument = async (req, res) => {
  const doc = await findDocument(req);
  if (!doc) {
    return res.status(404).json({ message: "document not found" });
  }

  for (const f of doc.files) await deletePrivate(f);
  await doc.deleteOne();
  res.json({ message: "document deleted" });
};

module.exports = { getDocuments, createDocument, addFiles, renameDocument, removeFile, deleteDocument };
