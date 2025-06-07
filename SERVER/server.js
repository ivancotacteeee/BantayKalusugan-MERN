import express from "express";
import bodyParser from "body-parser";
import {
  connectMongoDB,
  writeData,
  updateData,
  readData,
  refreshData,
} from "./src/db/mongoConnection.js";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import OpenAI from "openai";
import cron from "node-cron";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();
connectMongoDB();
const PORT = process.env.PORT || 3000;
const app = express();

const rawData = fs.readFileSync('./firebase-service-key.json', 'utf8');
const serviceAccount = JSON.parse(rawData);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://test-websocket-951a0-default-rtdb.asia-southeast1.firebasedatabase.app/"
});
const db = admin.database();

const currentTime = moment().tz("Asia/Manila").format();
const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

cron.schedule("0 9 1 * *", async () => {
  const users = await readData("users");
  for (const user of users) {
    if (!user?.data?.email || user?.data?.remind !== true) continue;
    const mailOptions = {
      from: '"ICCT SAN MATEO 👻" <cotactearmenion@gmail.com>',
      to: user.data.email,
      subject: "Monthly Health Check Reminder",
      text: `Hello ${user.data.firstName},\n\nThis is your monthly reminder from ICCT Health Monitoring to check and update your health data. Please ensure you monitor your heart rate, SpO2, and weight regularly.\n\nStay healthy!\n\nICCT Health Monitoring Team`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(`Failed to send monthly reminder to ${user.data.email}:`, error);
      } else {
        console.log(`Monthly reminder sent to ${user.data.email}:`, info.response);
      }
    });
  }
});

const authorize = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Missing Authorization header.",
    });
  }
  const token = authHeader.split(" ")[1];
  if (!token || token !== process.env.API_KEY) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Invalid token." });
  }
  next();
};

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Welcome to the Health Monitoring API!" });
});

app.post("/api/v1/device-status", authorize, async (req, res) => {
  const { deviceId, status } = req.body;
  if (!deviceId || !status) {
    return res.status(400).json({ success: false, message: "Device ID and status are required." });
  }

  try {
    const payload = { deviceId, status, timestamp: new Date().toISOString() };
    
    // Write to Firebase Realtime Database
    const deviceRef = db.ref("deviceStatus");
    await deviceRef.set(payload);
    
    return res.status(200).json({ success: true, message: "Device status updated.", data: payload });
  } catch (err) {
    console.error("Device status error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

app.post("/api/v1/users/register", authorize, async (req, res) => {
  const { firstName, lastName, email, age, contactNumber, gender, height, remind } = req.body;
  if (!firstName || !lastName || !email || !age || !contactNumber || !gender || !height) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    const userData = {
      userId: uuidv4(),
      data: {
        firstName,
        lastName,
        email,
        age,
        contactNumber,
        gender,
        height,
        remind: false,
        healthStatus: { heartRate: null, SpO2: null, weight: null, BMI: null },
      },
      created_at: currentTime,
      updated_at: currentTime,
    };
    await writeData("users", userData);
    await refreshData("users");
    return res
      .status(201)
      .json({ success: true, message: "User registered.", userId: userData.userId });
  } catch (err) {
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
});

app.post("/api/v1/test", authorize, async (req, res) => {
  const { heartRate, SpO2, weight } = req.body;
  if (!heartRate && !SpO2 && !weight) {
    return res
      .status(400)
      .json({ success: false, message: "No data provided." });
  }

  try {
    if (weight) {
      const payload = { weight, timestamp: new Date().toISOString() };
      
      const weightRef = db.ref("healthData/weight");
      await weightRef.set(payload);
      
      return res
        .status(200)
        .json({ success: true, message: "Weight received.", weight });
    }
    
    if (heartRate && SpO2) {
      const payload = { heartRate, SpO2, timestamp: new Date().toISOString() };
      
      const vitalsRef = db.ref("healthData/vitals");
      await vitalsRef.set(payload);
      
      return res.status(200).json({
        success: true,
        message: "Heart rate and SpO2 received.",
        heartRate,
        SpO2,
      });
    }
    
    return res.status(400).json({
      success: false,
      message: "Invalid data. Provide heart rate, SpO2, or weight.",
    });
  } catch (err) {
    console.error("Test endpoint error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

app.post("/api/v1/users", authorize, async (req, res) => {
  const { heartRate, SpO2, weight, userId } = req.body;

  try {
    const users = await readData("users", { userId });
    const user = users.find((u) => u.userId === userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const openai = new OpenAI({
      baseURL: process.env.DEEPSEEK_BASE_URL,
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Given the following health data, provide a brief analysis:\nHeart Rate: ${heartRate}\nSpO2: ${SpO2}\nWeight: ${weight}`,
        },
      ],
      model: "deepseek/deepseek-prover-v2:free",
    });

    const response = completion.choices[0].message.content;

    let BMI = null;
    if (weight && user.data.height) {
      const heightMeters = user.data.height / 100;
      BMI = +(weight / (heightMeters * heightMeters)).toFixed(2);
    }

    const mailOptions = {
      from: '"ICCT SAN MATEO 👻" <cotactearmenion@gmail.com>',
      to: user.data.email,
      subject: "Health Monitoring Update",
      html: `
        <h3>Hello ${user.data.firstName} ${user.data.lastName},</h3>
        <p>Here is your latest health data analysis:</p>
        <pre style="background:#f4f4f4;padding:10px;border-radius:5px;">${response}</pre>
        <p>Please continue to monitor your health regularly.</p>
        <p>Stay safe and healthy!</p>
        <br/>
        <p>— <strong>ICCT Health Monitoring Team</strong></p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    const updatedData = {
      data: {
        ...user.data,
        healthStatus: {
          heartRate: heartRate || user.data.healthStatus.heartRate,
          SpO2: SpO2 || user.data.healthStatus.SpO2,
          weight: weight || user.data.healthStatus.weight,
          BMI: BMI || user.data.healthStatus.BMI,
        },
      },
      created_at: user.created_at,
      updated_at: currentTime,
    };

    await updateData("users", { userId }, updatedData);
    await refreshData("users");
    return res.status(200).json({ success: true, message: "User updated." });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});