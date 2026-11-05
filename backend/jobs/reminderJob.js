//srs reminders, once a day email each user about items at 30, 7, 1 days or overdue
const cron = require("node-cron");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const ScheduleEntry = require("../models/ScheduleEntry");
const ReminderLog = require("../models/ReminderLog");
const { calcDue } = require("../utils/dueDate");
const { getStatus } = require("../utils/status");
const { sendMail } = require("../utils/mailer");

//which threshold an item is at right now, null means nothing to send
const getThreshold = (due, status) => {
  if (status === "overdue") return "overdue";
  if (due.remainingDays == null) return null;
  if (due.remainingDays <= 1) return "1";
  if (due.remainingDays <= 7) return "7";
  if (due.remainingDays <= 30) return "30";
  return null;
};

const thresholdText = (threshold, due) => {
  if (threshold === "overdue") return "OVERDUE";
  if (due.remainingDays <= 0) return "due today";
  return "due in " + due.remainingDays + (due.remainingDays === 1 ? " day" : " days");
};

const formatDate = (d) => new Date(d).toISOString().slice(0, 10);

//finds the reminders one user still needs, skips the ones already in the log
const findReminders = async (user, evalDate) => {
  const vehicles = await Vehicle.find({ owner: user._id });
  const reminders = [];

  for (const vehicle of vehicles) {
    const entries = await ScheduleEntry.find({ owner: user._id, vehicle: vehicle._id, enabled: true }).populate("item", "name");

    for (const entry of entries) {
      if (!entry.item) continue;
      const due = calcDue(entry, vehicle, evalDate);
      const status = getStatus(due);
      const threshold = getThreshold(due, status);
      if (!threshold) continue;

      //baseline date tells two service cycles of the same item apart
      const baselineDate = entry.baselineDate || entry.createdAt;
      const sent = await ReminderLog.exists({
        owner: user._id,
        vehicle: vehicle._id,
        item: entry.item._id,
        threshold,
        baselineDate,
      });
      if (sent) continue;

      reminders.push({ vehicle, entry, due, threshold, baselineDate });
    }
  }

  return reminders;
};

const buildEmail = (user, reminders) => {
  const lines = reminders.map((r) => {
    const name = r.vehicle.nickname || r.vehicle.make + " " + r.vehicle.model;
    let line = "- " + name + " (" + r.vehicle.registrationNo + "): " + r.entry.item.name + ", " + thresholdText(r.threshold, r.due);
    line += ", due date " + formatDate(r.due.dueDate);
    if (r.due.dueKm != null) line += " or at " + r.due.dueKm + " km";
    return line;
  });

  const subject = "CarVault: " + reminders.length + (reminders.length === 1 ? " item needs" : " items need") + " attention";
  const text =
    "Hi " + user.name + ",\n\n" +
    "These maintenance items are coming up or overdue:\n\n" +
    lines.join("\n") +
    "\n\nLog the service in CarVault once it is done.\n" +
    "You can turn reminders off in your profile.\n";

  return { subject, text };
};

let running = false;

//one sweep over all users, returns counts so it can be checked in tests
const runReminders = async (evalDate = new Date()) => {
  const result = { users: 0, emails: 0, items: 0, failed: 0 };

  //stops two sweeps at the same time sending the same email twice
  if (running) {
    console.log("reminder job already running, skipped");
    return result;
  }
  running = true;

  try {
    const users = await User.find({ remindersEnabled: true });
    result.users = users.length;

    for (const user of users) {
      //one bad user must not stop the others
      try {
        const reminders = await findReminders(user, evalDate);
        if (reminders.length === 0) continue;

        const { subject, text } = buildEmail(user, reminders);
        await sendMail(user.email, subject, text);

        //log only after the send worked, so a failed send is tried again tomorrow
        for (const r of reminders) {
          try {
            await ReminderLog.create({
              owner: user._id,
              vehicle: r.vehicle._id,
              item: r.entry.item._id,
              threshold: r.threshold,
              baselineDate: r.baselineDate,
            });
          } catch (err) {
            //11000 is duplicate key, already logged so fine
            if (err.code !== 11000) throw err;
          }
        }

        result.emails++;
        result.items += reminders.length;
      } catch (err) {
        result.failed++;
        console.log("reminder failed for user " + user._id + ": " + err.message);
      }
    }
  } finally {
    running = false;
  }

  console.log("reminder job done: " + JSON.stringify(result));
  return result;
};

//runs every day at 8am, time zone can be changed in .env
const startReminderJob = () => {
  cron.schedule("0 8 * * *", () => {
    runReminders().catch((err) => console.log("reminder job error: " + err.message));
  }, { timezone: process.env.CRON_TZ || "Asia/Karachi" });
  console.log("reminder job scheduled");
};

module.exports = { getThreshold, runReminders, startReminderJob };
