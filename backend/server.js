const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const catalogueRoutes = require("./routes/catalogueRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

//test route
app.get("/api/test", (req, res) => {
  res.json({ message: "server is working" });
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/catalogue", catalogueRoutes);
app.use("/api/schedule", scheduleRoutes);

//these two must stay after all routes
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("server running on port " + PORT);
  });
});
