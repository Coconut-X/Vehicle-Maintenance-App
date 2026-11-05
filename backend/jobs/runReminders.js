//runs the reminder sweep once by hand, npm run reminders
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { runReminders } = require("./reminderJob");

const run = async () => {
  await connectDB();
  await runReminders();
  await mongoose.disconnect();
};

run();
