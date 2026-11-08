//srs reminders, once a day email each user about items at 30, 7, 1 days or overdue
const cron = require("node-cron");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const ScheduleEntry = require("../models/ScheduleEntry");
const Group = require("../models/Group");
//needed for populate when this runs on its own with npm run reminders
require("../models/CatalogueItem");
const ReminderLog = require("../models/ReminderLog");
const { calcDue } = require("../utils/dueDate");
const { getStatus } = require("../utils/status");
const { sendMail } = require("../utils/mailer");
const { reminderEmail } = require("../utils/emailTemplates");
const { appUrl } = require("../utils/emailToken");

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

//the cars this person gets reminders about
//their own cars that are not shared, and the cars of every group they are in as far as they chose in that group
//all = every car of the group, off = none, custom = only the cars they picked
const carsToWatch = async (user) => {
  const cars = (await Vehicle.find({ owner: user._id, group: null })).map((vehicle) => ({ vehicle, groupName: "" }));

  const groups = await Group.find({ "members.user": user._id });
  for (const group of groups) {
    const me = group.members.find((m) => m.user.toString() === user._id.toString());
    const mode = me ? me.notify.mode : "all";
    if (mode === "off") continue;

    const query = { group: group._id };
    if (mode === "custom") query._id = { $in: me.notify.vehicles };
    const shared = await Vehicle.find(query);
    shared.forEach((vehicle) => cars.push({ vehicle, groupName: group.name }));
  }
  return cars;
};

//finds the reminders one user still needs, skips the ones already sent to this same person
//the log belongs to the person who got the email, so everyone in a family gets their own
const findReminders = async (user, evalDate) => {
  const cars = await carsToWatch(user);
  const reminders = [];

  for (const { vehicle, groupName } of cars) {
    const entries = await ScheduleEntry.find({ vehicle: vehicle._id, enabled: true }).populate("item", "name");

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

      reminders.push({ vehicle, groupName, entry, due, threshold, baselineDate });
    }
  }

  return reminders;
};

const prettyDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const carName = (v) => v.nickname || v.make + " " + v.model;

//one block per car, so a person with four cars sees which car each item belongs to
//inside a car the most urgent item is first, overdue ones before the rest
const groupByCar = (reminders) => {
  const cars = {};
  reminders.forEach((r) => {
    const key = r.vehicle._id.toString();
    if (!cars[key]) cars[key] = { vehicle: r.vehicle, name: carName(r.vehicle), groupName: r.groupName, items: [] };
    cars[key].items.push(r);
  });

  return Object.values(cars).map((car) => {
    car.items.sort((a, b) => (a.due.remainingDays ?? 0) - (b.due.remainingDays ?? 0));
    return car;
  });
};

const buildEmail = (user, reminders) => {
  const cars = groupByCar(reminders);

  //plain text, for mail apps that dont show html, a heading per car and one line per item
  let text = "Hi " + user.name + ",\n\nThese maintenance items are coming up or overdue:\n";
  cars.forEach((car) => {
    text += "\n" + car.name.toUpperCase() + " (" + car.vehicle.registrationNo + ")" + (car.groupName ? " - " + car.groupName : "") + "\n";
    car.items.forEach((r) => {
      let line = "  - " + r.entry.item.name + ": " + thresholdText(r.threshold, r.due) + ", " + prettyDate(r.due.dueDate);
      if (r.due.dueKm != null) line += " or at " + r.due.dueKm.toLocaleString("en-US") + " km";
      text += line + "\n";
    });
  });
  text += "\nOpen your dashboard: " + appUrl() + "/dashboard\n";
  text += "Log the service in CarVault once it is done. You can turn reminders off in your profile.\n";

  const html = reminderEmail({
    userName: user.name,
    itemCount: reminders.length,
    cars: cars.map((car) => ({
      vehicle: car.vehicle,
      name: car.name,
      groupName: car.groupName,
      rows: car.items.map((r) => ({
        name: r.entry.item.name,
        status: r.threshold === "overdue" ? "overdue" : "due_soon",
        //due today or tomorrow is as pressing as overdue, so it gets the red too
        urgent: r.due.remainingDays != null && r.due.remainingDays <= 1,
        statusText: thresholdText(r.threshold, r.due),
        dueDate: prettyDate(r.due.dueDate),
        dueKm: r.due.dueKm != null ? r.due.dueKm.toLocaleString("en-US") + " km" : "",
      })),
    })),
  });

  const subject = "CarVault: " + reminders.length + (reminders.length === 1 ? " item needs" : " items need") + " attention";
  return { subject, text, html };
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

        const { subject, text, html } = buildEmail(user, reminders);
        await sendMail(user.email, subject, text, html);

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

module.exports = { getThreshold, findReminders, buildEmail, runReminders, startReminderJob };
