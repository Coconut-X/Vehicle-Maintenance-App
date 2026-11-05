const nodemailer = require("nodemailer");

let transporter = null;

//makes the transporter once, if SMTP is not set the mail is only printed (for dev)
const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    console.log("SMTP not set, reminder emails will only be logged");
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
};

const sendMail = async (to, subject, text) => {
  const info = await getTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "CarVault <no-reply@carvault.local>",
    to,
    subject,
    text,
  });
  if (!process.env.SMTP_HOST) {
    console.log("email (not sent) to " + to + ": " + subject);
  }
  return info;
};

module.exports = { sendMail };
