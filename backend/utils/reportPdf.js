const PDFDocument = require("pdfkit");

//colours of the site
const INK = "#111110";
const ACCENT = "#f26522";
const PAPER = "#f2f2ee";
const LINE = "#d9d9d2";
const MUTED = "#6e6e68";
const YELLOW = "#f2c94c";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 40; //side margin
const W = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 70; //content stops here, the footer is below

//the built in pdf fonts only know latin letters, anything else would print as rubbish
const clean = (value) => String(value == null ? "" : value).replace(/[^\x20-\x7E -ÿ]/g, "?");

const dateText = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const numberText = (n) => Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const moneyText = (n, currency) => (currency ? currency + " " : "") + numberText(n);

//the vault door with a dial and a needle, same drawing as the logo on the site
const drawLogo = (doc, x, y, size) => {
  const s = size / 40;
  doc.save();
  doc.rect(x, y, size, size).fill("#ffffff");
  doc.rect(x + 3 * s, y + 3 * s, size - 6 * s, size - 6 * s).fill(INK);
  doc.circle(x + size / 2, y + size / 2, 13 * s).lineWidth(2 * s).stroke("#ffffff");
  doc.moveTo(x + size / 2, y + size / 2).lineTo(x + size / 2 + 9 * s, y + size / 2 - 9 * s).lineWidth(2.5 * s).stroke(ACCENT);
  doc.circle(x + size / 2, y + size / 2, 2.2 * s).fill("#ffffff");
  doc.restore();
};

//the strip at the top of the first page
const drawHeader = (doc, generated) => {
  doc.rect(0, 0, PAGE_W, 74).fill(INK);
  doc.rect(0, 74, PAGE_W, 3).fill(ACCENT);
  drawLogo(doc, M, 17, 40);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text("CARVAULT", M + 52, 24, { characterSpacing: 1.5, lineBreak: false });
  doc.fillColor(ACCENT).font("Courier").fontSize(9).text("SERVICE REPORT", M + 52, 48, { characterSpacing: 2, lineBreak: false });
  doc.fillColor("#ffffff").font("Courier").fontSize(9).text("generated " + dateText(generated), M, 31, { width: W, align: "right", lineBreak: false });
};

//small strip at the top of the next pages
const drawRunningHeader = (doc, vehicleName, plate) => {
  doc.rect(0, 0, PAGE_W, 34).fill(INK);
  doc.rect(0, 34, PAGE_W, 2).fill(ACCENT);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("CARVAULT", M, 13, { characterSpacing: 1, lineBreak: false });
  doc.fillColor("#ffffff").font("Courier").fontSize(9).text(clean(vehicleName) + "  /  " + clean(plate), M, 13, { width: W, align: "right", lineBreak: false });
};

//registration number drawn like the plate on the site, white with a thick border and a thin line inside
const drawPlate = (doc, text, x, y) => {
  doc.font("Courier-Bold").fontSize(13);
  const w = doc.widthOfString(clean(text), { characterSpacing: 1.5 }) + 20;
  doc.rect(x, y, w, 24).lineWidth(2).stroke(INK);
  doc.rect(x + 3, y + 3, w - 6, 18).lineWidth(0.6).stroke(MUTED);
  doc.fillColor(INK).text(clean(text), x + 10, y + 6, { characterSpacing: 1.5, lineBreak: false });
  return w;
};

const filterText = (filters, itemCount) => {
  const parts = [];
  if (filters.from || filters.to) parts.push("dates " + (filters.from ? dateText(filters.from + "T00:00:00Z") : "any") + " to " + (filters.to ? dateText(filters.to + "T00:00:00Z") : "any"));
  if (filters.kmFrom !== undefined || filters.kmTo !== undefined) parts.push("odometer " + (filters.kmFrom !== undefined ? numberText(filters.kmFrom) : "0") + " to " + (filters.kmTo !== undefined ? numberText(filters.kmTo) : "any") + " km");
  if (filters.costFrom !== undefined || filters.costTo !== undefined) parts.push("cost " + (filters.costFrom !== undefined ? numberText(filters.costFrom) : "0") + " to " + (filters.costTo !== undefined ? numberText(filters.costTo) : "any"));
  parts.push(itemCount ? itemCount + " chosen " + (itemCount === 1 ? "item" : "items") : "all items");
  parts.push(filters.mode === "latest" ? "latest service of each item" : "every service");
  return parts.join("   /   ");
};

//builds the report, returns the pdf document, the caller pipes it somewhere and calls end
//data = { vehicle, user, filters, groups, totals }
const buildReportPdf = (data) => {
  const { vehicle, user, filters, groups, totals } = data;
  const currency = user.currency || "";
  const generated = new Date();
  const name = vehicle.nickname || vehicle.make + " " + vehicle.model;

  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info: { Title: "CarVault service report - " + clean(name), Author: "CarVault" } });

  //page 1
  drawHeader(doc, generated);

  doc.fillColor(INK).font("Helvetica-Bold").fontSize(26).text(clean(name), M, 98, { width: W, lineBreak: false });
  const plateW = drawPlate(doc, vehicle.registrationNo, M, 134);
  doc.fillColor(MUTED).font("Courier").fontSize(9.5).text(
    vehicle.year + "  /  " + { petrol: "Petrol", hybrid: "Hybrid", phev: "Plug-in hybrid", electric: "Electric" }[vehicle.powertrain] + "  /  odometer " + numberText(vehicle.odometerKm) + " km",
    M + plateW + 14, 141, { lineBreak: false }
  );

  doc.fillColor(MUTED).font("Courier").fontSize(8.5).text("FILTERS  " + filterText(filters, filters.items.length), M, 170, { width: W });

  //three dark boxes with the totals
  const boxY = 196;
  const boxW = (W - 20) / 3;
  [
    ["SERVICES", String(totals.services)],
    ["TOTAL COST", moneyText(totals.totalCost, currency)],
    ["ITEMS", String(totals.items)],
  ].forEach(([label, value], i) => {
    const x = M + i * (boxW + 10);
    doc.rect(x, boxY, boxW, 52).fill(INK);
    doc.rect(x, boxY, 4, 52).fill(ACCENT);
    doc.fillColor("#9a9a92").font("Courier").fontSize(8).text(label, x + 14, boxY + 10, { characterSpacing: 1.5, lineBreak: false });
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(19).text(value, x + 14, boxY + 24, { width: boxW - 22, lineBreak: false });
  });

  let y = boxY + 52 + 26;

  //new page when the next block does not fit
  const need = (height) => {
    if (y + height <= BOTTOM) return false;
    doc.addPage();
    drawRunningHeader(doc, name, vehicle.registrationNo);
    y = 56;
    return true;
  };

  //columns of the table
  const col = { date: M + 10, km: M + 105, shop: M + 215, cost: M + 10 };
  const costRight = M + W - 10;

  const tableHead = () => {
    doc.fillColor(MUTED).font("Courier").fontSize(7.5);
    doc.text("DATE", col.date, y, { characterSpacing: 1, lineBreak: false });
    doc.text("ODOMETER", col.km, y, { characterSpacing: 1, lineBreak: false });
    doc.text("WORKSHOP", col.shop, y, { characterSpacing: 1, lineBreak: false });
    doc.text("COST", M, y, { width: W - 10, align: "right", characterSpacing: 1, lineBreak: false });
    y += 13;
    doc.moveTo(M + 10, y).lineTo(M + W - 10, y).lineWidth(0.6).stroke(LINE);
    y += 4;
  };

  groups.forEach((g) => {
    //the title of an item and its first row stay together
    need(26 + 24 + 20);

    doc.rect(M, y, W, 26).fill(PAPER);
    doc.rect(M, y, 4, 26).fill(ACCENT);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(11.5).text(clean(g.item.name), M + 14, y + 8, { width: W * 0.55, lineBreak: false });
    doc.fillColor(MUTED).font("Courier").fontSize(8).text(clean(g.item.category).toUpperCase(), M + 14 + doc.font("Helvetica-Bold").fontSize(11.5).widthOfString(clean(g.item.name)) + 8, y + 10, { characterSpacing: 1, lineBreak: false });
    doc.fillColor(INK).font("Courier-Bold").fontSize(9).text(g.count + (g.count === 1 ? " service" : " services") + "  /  " + moneyText(g.totalCost, currency), M, y + 9, { width: W - 12, align: "right", lineBreak: false });
    y += 26 + 8;

    tableHead();

    g.shown.forEach((r, i) => {
      const noteHeight = r.notes ? 11 : 0;
      if (need(18 + noteHeight)) {
        //continued on a new page, say so and repeat the column names
        doc.fillColor(MUTED).font("Courier").fontSize(8).text(clean(g.item.name) + " (continued)", M + 10, y, { lineBreak: false });
        y += 14;
        tableHead();
      }
      if (i % 2 === 1) doc.rect(M + 10, y - 3, W - 20, 17 + noteHeight).fill("#fafaf8");

      doc.fillColor(INK).font("Courier").fontSize(9);
      doc.text(dateText(r.serviceDate), col.date, y, { lineBreak: false });
      doc.text((r.odometerEstimated ? "~" : "") + numberText(r.odometerKm) + " km", col.km, y, { lineBreak: false });
      doc.font("Helvetica").text(clean(r.workshop || "-").slice(0, 38), col.shop, y, { width: 190, lineBreak: false });
      doc.font("Courier").text(r.cost == null ? "-" : numberText(r.cost), M, y, { width: W - 10, align: "right", lineBreak: false });
      y += 15;

      if (r.notes) {
        doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8).text(clean(r.notes).replace(/\s+/g, " ").slice(0, 110), col.date, y - 2, { width: W - 30, lineBreak: false });
        y += 11;
      }
      y += 3;
    });

    y += 14;
  });

  if (groups.length === 0) {
    doc.fillColor(MUTED).font("Helvetica").fontSize(11).text("No services match these filters.", M, y);
  }

  //an estimated odometer is marked with ~, say what it means once
  if (groups.some((g) => g.shown.some((r) => r.odometerEstimated))) {
    need(24);
    doc.fillColor(MUTED).font("Courier").fontSize(8).text("~ = odometer was not known and was estimated from the date", M, y, { lineBreak: false });
  }

  //footer on every page, a yellow lane line and the page number, added at the end because the page count is known only now
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    for (let x = M; x < PAGE_W - M; x += 24) doc.rect(x, PAGE_H - 52, 14, 2.5).fill(YELLOW);
    doc.fillColor(MUTED).font("Courier").fontSize(8);
    doc.text("CarVault  /  drive safe, service on time", M, PAGE_H - 38, { lineBreak: false });
    doc.text("page " + (i + 1) + " of " + range.count, M, PAGE_H - 38, { width: W, align: "right", lineBreak: false });
  }

  return doc;
};

module.exports = { buildReportPdf };
