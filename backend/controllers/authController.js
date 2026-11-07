const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendMail } = require("../utils/mailer");
const { makeEmailToken, hashToken, appUrl } = require("../utils/emailToken");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const makeToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
};

//remove hash before sending user
const cleanUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    remindersEnabled: user.remindersEnabled,
    defaultMonthlyKm: user.defaultMonthlyKm,
  };
};

const passwordOk = (p) => typeof p === "string" && p.length >= 8 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p);

const VERIFY_HOURS = 24;
const RESET_HOURS = 1;
//a new link can only be asked once in this time, so nobody can use us to flood an inbox
const RESEND_WAIT_MS = 60 * 1000;

//makes a fresh link, saves its hash on the user and emails it, an older link stops working
const sendVerification = async (user) => {
  const { token, hash } = makeEmailToken();
  user.verifyTokenHash = hash;
  user.verifyExpires = new Date(Date.now() + VERIFY_HOURS * 60 * 60 * 1000);
  user.verifySentAt = new Date();
  await user.save();

  const link = appUrl() + "/verify-email?token=" + token;
  await sendMail(
    user.email,
    "Verify your CarVault email",
    "Hi " + user.name + ",\n\nconfirm your email to start using CarVault:\n" + link +
      "\n\nThe link works for " + VERIFY_HOURS + " hours. If you did not sign up, ignore this email."
  );
};

const register = async (req, res) => {
  const body = req.body || {}; //body is undefined if nothing was sent
  const { name, password, defaultMonthlyKm } = body;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const errors = {};

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60) {
    errors.name = "name must be 2 to 60 characters";
  }
  if (!emailRegex.test(email)) {
    errors.email = "enter a valid email";
  }
  if (!passwordOk(password)) {
    errors.password = "password must be at least 8 characters with a letter and a number";
  }
  if (defaultMonthlyKm !== undefined) {
    const km = Number(defaultMonthlyKm);
    if (!Number.isInteger(km) || km < 0 || km > 20000) {
      errors.defaultMonthlyKm = "monthly km must be a whole number from 0 to 20000";
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ message: "validation failed", errors });
  }

  const exists = await User.findOne({ email });
  if (exists && exists.emailVerified !== false) {
    return res.status(409).json({ message: "email already registered", errors: { email: "email already registered" } });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const monthlyKm = defaultMonthlyKm !== undefined ? Number(defaultMonthlyKm) : undefined;

  let user = exists;
  if (user) {
    //this email signed up before but was never verified, so the person signing up now takes it over
    //otherwise someone could block an email they dont own just by registering it first
    user.name = name.trim();
    user.passwordHash = passwordHash;
    user.defaultMonthlyKm = monthlyKm;
  } else {
    user = new User({ name: name.trim(), email, passwordHash, defaultMonthlyKm: monthlyKm, emailVerified: false });
  }

  //no token yet, the user has to open the link in the email first
  let emailSent = true;
  try {
    await sendVerification(user);
  } catch (err) {
    //the account is kept, the user can ask for a new link on the login page
    console.log("verification email failed: " + err.message);
    emailSent = false;
    await user.save();
  }

  res.status(201).json({ message: "check your email to verify your account", email, emailSent });
};

const login = async (req, res) => {
  const body = req.body || {};
  const { password } = body;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || typeof password !== "string" || !password) {
    return res.status(422).json({ message: "email and password are required" });
  }

  const user = await User.findOne({ email }).select("+passwordHash");

  //same message for both cases so no one can check which emails exist
  if (!user) {
    return res.status(401).json({ message: "invalid email or password" });
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: "invalid email or password" });
  }

  //checked after the password so only the real owner finds out the account is waiting for verification
  if (user.emailVerified === false) {
    return res.status(403).json({ message: "verify your email first, we sent you a link", code: "email_not_verified", email });
  }

  res.json({ token: makeToken(user._id), user: cleanUser(user) });
};

//the link in the email lands on the frontend, which sends the token here
const verifyEmail = async (req, res) => {
  const token = req.body && typeof req.body.token === "string" ? req.body.token : "";
  const user = token ? await User.findOne({ verifyTokenHash: hashToken(token) }).select("+verifyTokenHash +verifyExpires") : null;

  if (!user || !user.verifyExpires || user.verifyExpires < new Date()) {
    return res.status(422).json({ message: "this link is invalid or has expired", errors: { token: "this link is invalid or has expired" } });
  }

  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyExpires = undefined;
  user.verifySentAt = undefined;
  await user.save();

  res.json({ message: "email verified, you can log in now", email: user.email });
};

//same answer for every email, so this cant be used to find out who has an account
const resendVerification = async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const answer = { message: "if that account is waiting for verification we sent a new link" };

  const user = email ? await User.findOne({ email }).select("+verifySentAt") : null;
  if (!user || user.emailVerified !== false) {
    return res.json(answer);
  }
  if (user.verifySentAt && Date.now() - user.verifySentAt.getTime() < RESEND_WAIT_MS) {
    return res.json(answer);
  }

  try {
    await sendVerification(user);
  } catch (err) {
    console.log("verification email failed: " + err.message);
  }
  res.json(answer);
};

//same answer for every email, so this cant be used to find out who has an account
//the answer goes out before the email is sent so the time it takes doesnt give it away either
const forgotPassword = async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const answer = { message: "if that email has an account we sent a reset link" };

  const user = email ? await User.findOne({ email }).select("+resetSentAt") : null;
  res.json(answer);

  if (!user) return;
  if (user.resetSentAt && Date.now() - user.resetSentAt.getTime() < RESEND_WAIT_MS) return;

  try {
    const { token, hash } = makeEmailToken();
    user.resetTokenHash = hash;
    user.resetExpires = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);
    user.resetSentAt = new Date();
    await user.save();

    const link = appUrl() + "/reset-password?token=" + token;
    await sendMail(
      user.email,
      "Reset your CarVault password",
      "Hi " + user.name + ",\n\nopen this link to choose a new password:\n" + link +
        "\n\nThe link works for " + RESET_HOURS + " hour and only once. If you did not ask for this, ignore this email, your password stays the same."
    );
  } catch (err) {
    console.log("reset email failed: " + err.message);
  }
};

const resetPassword = async (req, res) => {
  const body = req.body || {};
  const token = typeof body.token === "string" ? body.token : "";

  if (!passwordOk(body.password)) {
    const message = "password must be at least 8 characters with a letter and a number";
    return res.status(422).json({ message, errors: { password: message } });
  }

  const user = token ? await User.findOne({ resetTokenHash: hashToken(token) }).select("+resetTokenHash +resetExpires") : null;
  if (!user || !user.resetExpires || user.resetExpires < new Date()) {
    return res.status(422).json({ message: "this link is invalid or has expired", errors: { token: "this link is invalid or has expired" } });
  }

  user.passwordHash = await bcrypt.hash(body.password, 10);
  user.resetTokenHash = undefined;
  user.resetExpires = undefined;
  user.resetSentAt = undefined;
  //opening a link we emailed proves the address is theirs, so an unverified account is verified too
  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyExpires = undefined;
  await user.save();

  res.json({ message: "password changed, you can log in now" });
};

const getMe = async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  res.json({ user: cleanUser(user) });
};

module.exports = { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, getMe, cleanUser };
