const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const catalogueRoutes = require("./routes/catalogueRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { startReminderJob } = require("./jobs/reminderJob");
const { ensureCatalogue } = require("./utils/ensureCatalogue");
const { authLimiter } = require("./middleware/rateLimit");

const app = express();

//render and other hosts sit behind a proxy, needed so the rate limit sees the real ip
app.set("trust proxy", 1);

app.use(helmet());

//only our frontend can call the api from a browser, more urls can be split by commas
const allowed = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""));
app.use(
  cors({
    origin: (origin, callback) => {
      //no origin means curl or postman, not a browser
      if (!origin || allowed.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    //the page needs to read the file name of a downloaded report
    exposedHeaders: ["Content-Disposition"],
  })
);

app.use(express.json({ limit: "100kb" }));

//test route
app.get("/api/test", (req, res) => {
  res.json({ message: "server is working" });
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/verify-email", authLimiter);
app.use("/api/auth/resend-verification", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/catalogue", catalogueRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/reports", reportRoutes);

//these two must stay after all routes
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  app.listen(PORT, () => {
    console.log("server running on port " + PORT);
  });
  startReminderJob();

  //new catalogue items reach existing cars, a failure here must not stop the server
  try {
    const added = await ensureCatalogue();
    if (added.items || added.entries) console.log("catalogue updated: " + JSON.stringify(added));
  } catch (err) {
    console.log("catalogue check failed: " + err.message);
  }
});
