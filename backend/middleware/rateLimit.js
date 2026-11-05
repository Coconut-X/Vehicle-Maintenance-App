const rateLimit = require("express-rate-limit");

//slows down password guessing on login and register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "too many attempts, try again in 15 minutes" },
});

module.exports = { authLimiter };
