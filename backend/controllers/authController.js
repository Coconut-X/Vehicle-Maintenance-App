const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

const register = async (req, res) => {
  try {
    const { name, password, defaultMonthlyKm } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const errors = {};

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 60) {
      errors.name = "name must be 2 to 60 characters";
    }
    if (!emailRegex.test(email)) {
      errors.email = "enter a valid email";
    }
    if (typeof password !== "string" || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
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
    if (exists) {
      return res.status(409).json({ message: "email already registered", errors: { email: "email already registered" } });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email,
      passwordHash,
      defaultMonthlyKm: defaultMonthlyKm !== undefined ? Number(defaultMonthlyKm) : undefined,
    });

    res.status(201).json({ token: makeToken(user._id), user: cleanUser(user) });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "something went wrong" });
  }
};

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

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

    res.json({ token: makeToken(user._id), user: cleanUser(user) });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "something went wrong" });
  }
};

module.exports = { register, login };
