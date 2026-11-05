const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const ScheduleEntry = require("../models/ScheduleEntry");
const ServiceRecord = require("../models/ServiceRecord");
const ReminderLog = require("../models/ReminderLog");
const { deleteImage } = require("../config/cloudinary");
const { cleanUser } = require("./authController");

const passwordOk = (p) => typeof p === "string" && p.length >= 8 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p);

//name, reminder toggle and default km, email is not changed here
const updateMe = async (req, res) => {
  const body = req.body || {};
  const errors = {};
  const data = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 60) {
      errors.name = "name must be 2 to 60 characters";
    } else {
      data.name = body.name.trim();
    }
  }
  if (body.remindersEnabled !== undefined) {
    if (typeof body.remindersEnabled !== "boolean") {
      errors.remindersEnabled = "reminders must be true or false";
    } else {
      data.remindersEnabled = body.remindersEnabled;
    }
  }
  if (body.defaultMonthlyKm !== undefined) {
    //empty means remove the default
    if (body.defaultMonthlyKm === "" || body.defaultMonthlyKm === null) {
      data.defaultMonthlyKm = null;
    } else {
      const km = Number(body.defaultMonthlyKm);
      if (!Number.isInteger(km) || km < 0 || km > 20000) {
        errors.defaultMonthlyKm = "monthly km must be a whole number from 0 to 20000";
      } else {
        data.defaultMonthlyKm = km;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const user = await User.findByIdAndUpdate(req.userId, data, { new: true, runValidators: true });
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  res.json({ user: cleanUser(user) });
};

//422 and not 401 for a wrong current password, 401 would log the user out on the frontend
const changePassword = async (req, res) => {
  const body = req.body || {};
  const errors = {};

  if (typeof body.currentPassword !== "string" || !body.currentPassword) {
    errors.currentPassword = "enter your current password";
  }
  if (!passwordOk(body.newPassword)) {
    errors.newPassword = "password must be at least 8 characters with a letter and a number";
  }
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  const match = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!match) {
    return res.status(422).json({ message: "validation failed", errors: { currentPassword: "current password is wrong" } });
  }

  user.passwordHash = await bcrypt.hash(body.newPassword, 10);
  await user.save();
  res.json({ message: "password changed" });
};

//deletes the account and everything that belongs to it, password is asked again
const deleteMe = async (req, res) => {
  const body = req.body || {};

  const user = await User.findById(req.userId).select("+passwordHash");
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }

  const match = typeof body.password === "string" && (await bcrypt.compare(body.password, user.passwordHash));
  if (!match) {
    return res.status(422).json({ message: "validation failed", errors: { password: "password is wrong" } });
  }

  //images first because we need the ids from the records
  const records = await ServiceRecord.find({ owner: user._id });
  for (const record of records) {
    await deleteImage(record.receiptId);
  }
  const vehicles = await Vehicle.find({ owner: user._id });
  for (const vehicle of vehicles) {
    await deleteImage(vehicle.photoId);
  }

  await ReminderLog.deleteMany({ owner: user._id });
  await ServiceRecord.deleteMany({ owner: user._id });
  await ScheduleEntry.deleteMany({ owner: user._id });
  await Vehicle.deleteMany({ owner: user._id });
  await User.deleteOne({ _id: user._id });

  res.json({ message: "account deleted" });
};

module.exports = { updateMe, changePassword, deleteMe };
