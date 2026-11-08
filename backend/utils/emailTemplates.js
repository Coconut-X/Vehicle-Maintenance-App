//html for the emails, written the old way with tables and inline styles because mail apps ignore most css
//the same look as the site: dark bar, orange accent, square corners, bold headings
const { appUrl } = require("./emailToken");

const INK = "#111110";
const ACCENT = "#f26522";
const LINE = "#e4e4de";
const MUTED = "#6e6e68";
const FONT = "Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

//names and plates are typed by users so they must never be put in html as they are
const esc = (value) =>
  String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const button = (url, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px 0;">
    <tr><td style="background:${INK};border-bottom:3px solid ${ACCENT};">
      <a href="${esc(url)}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-family:${FONT};font-size:15px;font-weight:bold;text-decoration:none;">${esc(label)} &rarr;</a>
    </td></tr>
  </table>`;

//the frame around every email, preheader is the grey preview line mail apps show next to the subject
const layout = ({ preheader, body }) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f2f2ee;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2ee;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${LINE};">
        <tr><td style="background:${INK};padding:18px 28px;border-bottom:3px solid ${ACCENT};">
          <span style="font-family:${FONT};font-size:20px;font-weight:bold;letter-spacing:1px;color:#ffffff;">CARVAULT</span>
        </td></tr>
        <tr><td style="padding:28px;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK};">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid ${LINE};font-family:${FONT};font-size:12px;color:${MUTED};">
          CarVault, car maintenance tracked by km and by date. Drive safe.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const heading = (text) =>
  `<h1 style="margin:0 0 14px 0;font-family:${FONT};font-size:26px;line-height:1.15;font-weight:bold;text-transform:uppercase;color:${INK};">${esc(text)}</h1>`;

//verification and reset emails are one message and one big button
const linkEmail = ({ preheader, title, intro, label, url, note }) =>
  layout({
    preheader,
    body: `
      ${heading(title)}
      <p style="margin:0 0 6px 0;">${intro}</p>
      ${button(url, label)}
      <p style="margin:18px 0 4px 0;font-size:13px;color:${MUTED};">Button not working? Copy this link into your browser:</p>
      <p style="margin:0 0 18px 0;font-family:${MONO};font-size:12px;word-break:break-all;color:${INK};">${esc(url)}</p>
      <p style="margin:0;font-size:13px;color:${MUTED};">${esc(note)}</p>`,
  });

//one table per car, the most urgent item first
//cars is a list of { vehicle, rows: [{ name, status, statusText, dueDate, dueKm }] }
const reminderEmail = ({ userName, cars, itemCount }) => {
  const dashboard = appUrl() + "/dashboard";

  const carBlocks = cars
    .map((car) => {
      const v = car.vehicle;
      const rows = car.rows
        .map((r) => {
          const colour = r.status === "overdue" || r.urgent ? "#c2352b" : "#b7791f";
          return `
          <tr>
            <td style="padding:10px 8px;border-top:1px solid ${LINE};font-family:${FONT};font-size:14px;font-weight:bold;">${esc(r.name)}</td>
            <td style="padding:10px 8px;border-top:1px solid ${LINE};font-family:${FONT};font-size:12px;font-weight:bold;letter-spacing:.5px;text-transform:uppercase;color:${colour};white-space:nowrap;">${esc(r.statusText)}</td>
            <td style="padding:10px 8px;border-top:1px solid ${LINE};font-family:${MONO};font-size:13px;">${esc(r.dueDate)}${r.dueKm ? `<br><span style="color:${MUTED};">or at ${esc(r.dueKm)}</span>` : ""}</td>
          </tr>`;
        })
        .join("");

      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0 0;border:1px solid ${INK};">
        <tr><td colspan="3" style="background:${INK};padding:11px 12px;">
          <a href="${esc(appUrl() + "/vehicles/" + v._id)}" style="font-family:${FONT};font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;">${esc(car.name)}</a>
          <span style="display:inline-block;margin-left:10px;padding:1px 7px;background:#ffffff;border:2px solid #ffffff;font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:1px;color:${INK};">${esc(v.registrationNo)}</span>
          ${car.groupName ? `<span style="margin-left:10px;font-family:${MONO};font-size:11px;color:#9a9a92;">${esc(car.groupName)}</span>` : ""}
        </td></tr>
        <tr>
          <th align="left" style="padding:8px;font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">Item</th>
          <th align="left" style="padding:8px;font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">Status</th>
          <th align="left" style="padding:8px;font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};">Due</th>
        </tr>
        ${rows}
      </table>`;
    })
    .join("");

  const intro =
    itemCount + (itemCount === 1 ? " item needs" : " items need") + " attention on " + cars.length + (cars.length === 1 ? " car." : " cars.");

  return layout({
    preheader: intro,
    body: `
      ${heading("Service reminder")}
      <p style="margin:0;">Hi ${esc(userName)}, ${esc(intro)}</p>
      ${carBlocks}
      ${button(dashboard, "Open your dashboard")}
      <p style="margin:18px 0 0 0;font-size:13px;color:${MUTED};">Log the service in CarVault once it is done, so its reminders start again.
      You can turn these emails off in your <a href="${esc(appUrl() + "/profile")}" style="color:${INK};">profile</a>.</p>`,
  });
};

//the invitation to a group, one button, the names are escaped because users type them
const inviteEmail = ({ inviterName, groupName, url, days }) =>
  linkEmail({
    preheader: inviterName + " invited you to share cars on CarVault.",
    title: "You are invited",
    intro: `<strong>${esc(inviterName)}</strong> invited you to the group <strong>${esc(groupName)}</strong> on CarVault. Everyone in the group can see its cars, log services and get the reminders.`,
    label: "Join " + groupName,
    url,
    note: "This link is only for this email address and works once, for " + days + " days. If you do not know " + inviterName + ", ignore this email.",
  });

module.exports = { esc, layout, linkEmail, reminderEmail, inviteEmail };
