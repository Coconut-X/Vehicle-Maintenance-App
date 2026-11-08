const Group = require("../models/Group");
const Invite = require("../models/Invite");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const { sendMail } = require("../utils/mailer");
const { makeEmailToken, hashToken, appUrl } = require("../utils/emailToken");
const { inviteEmail } = require("../utils/emailTemplates");
const { findPendingInvite, deleteGroup, removeMember } = require("../utils/groupOps");

const MAX_MEMBERS = 10;
const MAX_INVITES_AT_ONCE = 10;
const INVITE_DAYS = 7;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

const checkName = (name) => (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 60 ? "name must be 1 to 60 characters" : null);

//a clean list of addresses from what was sent, lowercase and without repeats
const readEmails = (list) => {
  const raw = Array.isArray(list) ? list : [];
  const seen = new Set();
  const valid = [];
  const invalid = [];
  raw.forEach((item) => {
    const email = typeof item === "string" ? item.trim().toLowerCase() : "";
    if (!email || seen.has(email)) return;
    seen.add(email);
    (emailRegex.test(email) ? valid : invalid).push(email);
  });
  return { valid, invalid };
};

const memberOf = (group, userId) => group.members.find((m) => m.user.toString() === userId.toString());

//the group if the user is in it, otherwise the answer is sent already
//adminOnly is for the things only the admin may do
const loadGroup = async (req, res, adminOnly = false) => {
  const group = isId(req.params.id) ? await Group.findOne({ _id: req.params.id, "members.user": req.userId }) : null;
  if (!group) {
    res.status(404).json({ message: "group not found" });
    return null;
  }
  if (adminOnly && group.admin.toString() !== req.userId.toString()) {
    res.status(403).json({ message: "only the admin of this group can do that" });
    return null;
  }
  return group;
};

//makes the link, saves the invite and sends the email, returns what happened for that address
const sendInvite = async (group, inviter, email) => {
  const { token, hash } = makeEmailToken();
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

  await Invite.findOneAndUpdate(
    { group: group._id, email },
    { tokenHash: hash, expiresAt, invitedBy: inviter._id, status: "pending" },
    { upsert: true, new: true }
  );

  const url = appUrl() + "/join?token=" + token;
  try {
    await sendMail(
      email,
      inviter.name + " invited you to " + group.name + " on CarVault",
      inviter.name + " invited you to the group " + group.name + " on CarVault.\n\nOpen this link to join:\n" + url + "\n\nThe link is only for this email address and works once, for " + INVITE_DAYS + " days.",
      inviteEmail({ inviterName: inviter.name, groupName: group.name, url, days: INVITE_DAYS })
    );
    return { email, status: "sent" };
  } catch (err) {
    console.log("invite email failed: " + err.message);
    return { email, status: "failed" };
  }
};

//invites a list of addresses, people already in the group are skipped
const sendInvites = async (group, inviter, emails) => {
  const members = await User.find({ _id: { $in: group.members.map((m) => m.user) } }).select("email");
  const inside = new Set(members.map((m) => m.email));
  const results = [];
  for (const email of emails) {
    if (inside.has(email)) results.push({ email, status: "already in the group" });
    else results.push(await sendInvite(group, inviter, email));
  }
  return results;
};

//what the frontend gets about a group
const present = async (group, userId, full) => {
  const mine = memberOf(group, userId);
  const isAdmin = group.admin.toString() === userId.toString();
  const vehicles = await Vehicle.find({ group: group._id }).select("make model nickname registrationNo owner year powertrain photoUrl");
  const base = {
    _id: group._id,
    name: group.name,
    isAdmin,
    memberCount: group.members.length,
    vehicleCount: vehicles.length,
    notify: { mode: mine.notify.mode, vehicles: mine.notify.vehicles },
  };
  if (!full) return base;

  const users = await User.find({ _id: { $in: group.members.map((m) => m.user) } }).select("name email");
  const byId = {};
  users.forEach((u) => (byId[u._id.toString()] = u));

  const result = {
    ...base,
    members: group.members
      .map((m) => ({
        user: m.user,
        name: byId[m.user.toString()]?.name || "",
        email: byId[m.user.toString()]?.email || "",
        joinedAt: m.joinedAt,
        isAdmin: m.user.toString() === group.admin.toString(),
      }))
      .sort((a, b) => a.joinedAt - b.joinedAt),
    vehicles,
  };

  //the pending invitations are the admins business
  if (isAdmin) {
    const invites = await Invite.find({ group: group._id, status: "pending" }).sort({ createdAt: -1 });
    result.invites = invites.map((i) => ({ _id: i._id, email: i.email, expiresAt: i.expiresAt, expired: i.expiresAt < new Date() }));
  }
  return result;
};

const createGroup = async (req, res) => {
  const body = req.body || {};
  const errors = {};

  const nameError = checkName(body.name);
  if (nameError) errors.name = nameError;

  const { valid, invalid } = readEmails(body.emails);
  const me = await User.findById(req.userId).select("name email");
  const emails = valid.filter((e) => e !== me.email);
  if (invalid.length) errors.emails = "these are not valid emails: " + invalid.join(", ");
  else if (emails.length === 0) errors.emails = "invite at least one person by email";
  else if (emails.length > MAX_INVITES_AT_ONCE) errors.emails = "invite at most " + MAX_INVITES_AT_ONCE + " people at a time";

  const ids = Array.isArray(body.vehicles) ? body.vehicles : [];
  if (ids.some((id) => !isId(id))) errors.vehicles = "choose cars from the list";
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  //only the creators own cars that are not in a group already
  const cars = await Vehicle.find({ _id: { $in: ids }, owner: req.userId, group: null }).select("_id");
  if (cars.length !== new Set(ids).size) {
    return res.status(422).json({ message: "validation failed", errors: { vehicles: "you can only add your own cars that are not in a group yet" } });
  }

  const group = await Group.create({ name: body.name.trim(), admin: req.userId, members: [{ user: req.userId }] });
  await Vehicle.updateMany({ _id: { $in: cars.map((c) => c._id) } }, { group: group._id });
  const invites = await sendInvites(group, me, emails);

  res.status(201).json({ group: await present(group, req.userId, true), invites });
};

const getGroups = async (req, res) => {
  const groups = await Group.find({ "members.user": req.userId }).sort({ createdAt: 1 });
  const list = [];
  for (const g of groups) list.push(await present(g, req.userId, false));
  res.json({ groups: list });
};

const getGroup = async (req, res) => {
  const group = await loadGroup(req, res);
  if (!group) return;
  res.json({ group: await present(group, req.userId, true) });
};

const renameGroup = async (req, res) => {
  const group = await loadGroup(req, res, true);
  if (!group) return;
  const nameError = checkName(req.body && req.body.name);
  if (nameError) {
    return res.status(422).json({ message: "validation failed", errors: { name: nameError } });
  }
  group.name = req.body.name.trim();
  await group.save();
  res.json({ group: await present(group, req.userId, true) });
};

const removeGroup = async (req, res) => {
  const group = await loadGroup(req, res, true);
  if (!group) return;
  await deleteGroup(group);
  res.json({ message: "group deleted, its cars are back with their owners" });
};

const addInvites = async (req, res) => {
  const group = await loadGroup(req, res, true);
  if (!group) return;

  const { valid, invalid } = readEmails(req.body && req.body.emails);
  if (invalid.length || valid.length === 0 || valid.length > MAX_INVITES_AT_ONCE) {
    const message = invalid.length ? "these are not valid emails: " + invalid.join(", ") : valid.length === 0 ? "enter at least one email" : "at most " + MAX_INVITES_AT_ONCE + " at a time";
    return res.status(422).json({ message: "validation failed", errors: { emails: message } });
  }

  const me = await User.findById(req.userId).select("name email");
  const invites = await sendInvites(group, me, valid.filter((e) => e !== me.email));
  res.json({ invites, group: await present(group, req.userId, true) });
};

const revokeInvite = async (req, res) => {
  const group = await loadGroup(req, res, true);
  if (!group) return;
  const gone = isId(req.params.inviteId) ? await Invite.findOneAndDelete({ _id: req.params.inviteId, group: group._id }) : null;
  if (!gone) {
    return res.status(404).json({ message: "invitation not found" });
  }
  res.json({ group: await present(group, req.userId, true) });
};

const resendInvite = async (req, res) => {
  const group = await loadGroup(req, res, true);
  if (!group) return;
  const invite = isId(req.params.inviteId) ? await Invite.findOne({ _id: req.params.inviteId, group: group._id }) : null;
  if (!invite) {
    return res.status(404).json({ message: "invitation not found" });
  }
  const me = await User.findById(req.userId).select("name email");
  const result = await sendInvite(group, me, invite.email);
  res.json({ invites: [result], group: await present(group, req.userId, true) });
};

//the admin takes someone out
const kickMember = async (req, res) => {
  const group = await loadGroup(req, res, true);
  if (!group) return;
  if (!isId(req.params.userId) || !memberOf(group, req.params.userId)) {
    return res.status(404).json({ message: "member not found" });
  }
  if (req.params.userId === req.userId.toString()) {
    return res.status(422).json({ message: "validation failed", errors: { member: "to go yourself use leave group" } });
  }
  await removeMember(group, req.params.userId);
  res.json({ group: await present(group, req.userId, true) });
};

//anyone can leave, if the admin leaves the one who joined first takes over
const leaveGroup = async (req, res) => {
  const group = await loadGroup(req, res);
  if (!group) return;
  const result = await removeMember(group, req.userId);
  res.json({ message: result.groupDeleted ? "you were the last one, the group is deleted" : "you left the group", groupDeleted: result.groupDeleted });
};

//members put their own cars into the group or take cars out of it, everyone in the group can take a car out
const setVehicles = async (req, res) => {
  const group = await loadGroup(req, res);
  if (!group) return;
  const add = Array.isArray(req.body && req.body.add) ? req.body.add : [];
  const remove = Array.isArray(req.body && req.body.remove) ? req.body.remove : [];
  if ([...add, ...remove].some((id) => !isId(id))) {
    return res.status(422).json({ message: "validation failed", errors: { vehicles: "choose cars from the list" } });
  }

  if (add.length) {
    const cars = await Vehicle.find({ _id: { $in: add }, owner: req.userId, group: null }).select("_id");
    if (cars.length !== new Set(add).size) {
      return res.status(422).json({ message: "validation failed", errors: { vehicles: "you can only add your own cars that are not in a group yet" } });
    }
    await Vehicle.updateMany({ _id: { $in: cars.map((c) => c._id) } }, { group: group._id });
  }
  if (remove.length) {
    await Vehicle.updateMany({ _id: { $in: remove }, group: group._id }, { group: null });
  }
  res.json({ group: await present(group, req.userId, true) });
};

//each person decides which reminder emails of this group they want
const setNotify = async (req, res) => {
  const group = await loadGroup(req, res);
  if (!group) return;
  const body = req.body || {};
  if (!["all", "off", "custom"].includes(body.mode)) {
    return res.status(422).json({ message: "validation failed", errors: { mode: "choose all, off or custom" } });
  }

  let ids = [];
  if (body.mode === "custom") {
    ids = Array.isArray(body.vehicles) ? body.vehicles : [];
    if (ids.some((id) => !isId(id))) {
      return res.status(422).json({ message: "validation failed", errors: { vehicles: "choose cars from the list" } });
    }
    //only cars that are in this group count
    ids = (await Vehicle.find({ _id: { $in: ids }, group: group._id }).select("_id")).map((v) => v._id);
  }

  const me = memberOf(group, req.userId);
  me.notify.mode = body.mode;
  me.notify.vehicles = ids;
  await group.save();
  res.json({ group: await present(group, req.userId, true) });
};

//the page of the link in the email asks this, no login needed, it only says who invited and to which address
const inviteInfo = async (req, res) => {
  const invite = await findPendingInvite(req.params.token);
  if (!invite) {
    return res.status(404).json({ message: "this invitation is not valid any more" });
  }
  const group = await Group.findById(invite.group).select("name");
  const inviter = await User.findById(invite.invitedBy).select("name");
  if (!group) {
    return res.status(404).json({ message: "this invitation is not valid any more" });
  }
  res.json({
    email: invite.email,
    groupName: group.name,
    invitedBy: inviter ? inviter.name : "",
    hasAccount: !!(await User.exists({ email: invite.email, emailVerified: { $ne: false } })),
  });
};

//after logging in the person joins, with the account that has the address the invitation was sent to
const acceptInvite = async (req, res) => {
  const invite = await findPendingInvite(req.body && req.body.token);
  if (!invite) {
    return res.status(404).json({ message: "this invitation is not valid any more" });
  }
  const user = await User.findById(req.userId).select("email");
  if (user.email !== invite.email) {
    return res.status(403).json({ message: "this invitation was sent to " + invite.email + ", log in with that email to join" });
  }

  const group = await Group.findById(invite.group);
  if (!group) {
    return res.status(404).json({ message: "this invitation is not valid any more" });
  }
  if (!memberOf(group, user._id)) {
    if (group.members.length >= MAX_MEMBERS) {
      return res.status(422).json({ message: "this group is full" });
    }
    group.members.push({ user: user._id });
    await group.save();
  }

  invite.status = "accepted";
  await invite.save();
  res.json({ group: await present(group, req.userId, false) });
};

module.exports = {
  createGroup,
  getGroups,
  getGroup,
  renameGroup,
  removeGroup,
  addInvites,
  revokeInvite,
  resendInvite,
  kickMember,
  leaveGroup,
  setVehicles,
  setNotify,
  inviteInfo,
  acceptInvite,
};
