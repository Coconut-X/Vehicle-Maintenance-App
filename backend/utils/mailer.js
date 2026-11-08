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
      //fail after 10 seconds, a blocked port would otherwise leave the user waiting for a long time
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  } else {
    console.log("SMTP not set, reminder emails will only be logged");
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
};

const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER || "CarVault <no-reply@carvault.local>";

//some hosts block smtp ports (render free plan does), brevo can send over a normal https request instead
const sendWithBrevo = async (to, subject, text, html) => {
  //MAIL_FROM looks like: CarVault <me@gmail.com>
  const match = fromAddress().match(/^(.*)<(.+)>$/);
  const sender = match ? { name: match[1].trim(), email: match[2].trim() } : { email: fromAddress().trim() };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    //the plain text goes along with the html, for mail apps that only show text
    body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text, ...(html ? { htmlContent: html } : {}) }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error("brevo said " + res.status + " " + (await res.text()).slice(0, 200));
  }
};

//html is optional, the text is always sent too
const sendMail = async (to, subject, text, html) => {
  if (process.env.BREVO_API_KEY) {
    return sendWithBrevo(to, subject, text, html);
  }

  const info = await getTransporter().sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
  });
  if (!process.env.SMTP_HOST) {
    //the text is printed too so a verification link can be copied while developing
    console.log("email (not sent) to " + to + ": " + subject + "\n" + text);
  }
  return info;
};

module.exports = { sendMail };
