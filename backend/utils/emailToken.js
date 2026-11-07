const crypto = require("crypto");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

//random token for the links we email, only its hash is saved so a leaked database cant be used to verify or reset
const makeEmailToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
};

//first url in CLIENT_URL, it can hold several urls split by commas
const appUrl = () => {
  const first = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0];
  return first.trim().replace(/\/$/, "");
};

module.exports = { makeEmailToken, hashToken, appUrl };
