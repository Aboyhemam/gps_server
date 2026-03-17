require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const dns = require("dns");

const DB_URL = process.env.DB_URL;
const app = express();
app.use(express.json());

const client = new MongoClient(DB_URL);
let collection;

const dbConnect = async () => {
  try {
    await dns.setServers(["8.8.8.8", "8.8.4.4"]);
    await client.connect();
    const db = client.db("gps");
    collection = db.collection("location");
    console.log("DB connected success!");
  } catch (err) {
    console.error("DB connection failed:", err);
    process.exit(1);
  }
};

dbConnect();

app.post("/gps", async (req, res) => {
  if (!collection) return res.status(503).json({ error: "DB not ready" });

  try {
    const { deviceId, lat, lng, speed, altitude, satellites, hdop } = req.body;

    if (!lat || !lng || !deviceId) {
      return res.status(400).json({ error: "Missing deviceId/lat/lng" });
    }

    const updateDoc = {
      $set: {
        location: {
          type: "Point",
          coordinates: [lng, lat]
        },
        speed,
        altitude,
        satellites,
        hdop,
        timestamp: new Date()
      }
    };

    await collection.updateOne(
      { deviceId: deviceId },   // 🔍 filter (find existing doc)
      updateDoc,
      { upsert: true }         // 🔁 create if not exists
    );

    res.status(200).json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));