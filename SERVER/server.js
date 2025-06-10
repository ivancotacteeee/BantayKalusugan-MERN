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
import morgan from "morgan";
import { authorize } from "./src/middleware/auth.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { successHandler } from "./src/middleware/successHandler.js";
import {
  validateUserRegistration,
  validateHealthData,
  validateDeviceStatus,
} from "./src/middleware/validation.js";

dotenv.config();
connectMongoDB();
const PORT = process.env.PORT || 3000;
const app = express();

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://test-websocket-951a0-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

const db = admin.database();
const currentTime = moment().tz("Asia/Manila").toISOString();

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

app.use(morgan("dev"));
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(successHandler);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.success(null, "Welcome to the Health Monitoring API!");
});

app.post("/api/v1/devices/status", authorize, validateDeviceStatus, async (req, res, next) => {
  const { deviceId, status } = req.body;
  try {
    const payload = { deviceId, status, timestamp: new Date().toISOString() };
    const deviceRef = db.ref("deviceStatus");
    await deviceRef.set(payload);
    res.success(payload, "Device status updated.");
  } catch (err) {
    next(err);
  }
});

app.post("/api/v1/users/register", authorize, validateUserRegistration, async (req, res, next) => {
  const { firstName, lastName, email, age, contactNumber, gender } = req.body;
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
        remind: false,
        healthStatus: { heartRate: null, SpO2: null, weight: null },
      },
      created_at: currentTime,
      updated_at: currentTime,
    };
    await writeData("users", userData);
    await refreshData("users");
    res.success({ userId: userData.userId }, "User registered successfully.", 201);
  } catch (err) {
    next(err);
  }
});

app.post("/api/v1/health-data/raw", authorize, validateHealthData, async (req, res, next) => {
  const { heartRate, SpO2, weight } = req.body;
  try {
    if (weight) {
      const payload = { weight, timestamp: new Date().toISOString() };
      const weightRef = db.ref("healthData/weight");
      await weightRef.set(payload);
      return res.success({ weight }, "Weight received.");
    }
    if (heartRate && SpO2) {
      const payload = { heartRate, SpO2, timestamp: new Date().toISOString() };
      const vitalsRef = db.ref("healthData/vitals");
      await vitalsRef.set(payload);
      return res.success({ heartRate, SpO2 }, "Heart rate and SpO2 received.");
    }
    return res.status(400).json({
      success: false,
      message: "Invalid data. Provide heart rate, SpO2, or weight.",
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/v1/users/:userId", authorize, async (req, res, next) => {
  const { userId } = req.params;
  const { heartRate, SpO2, weight } = req.body;
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
    const mailOptions = {
      from: `"ICCT SAN MATEO 👻" <${process.env.EMAIL_ADDRESS}>`,
      to: user.data.email,
      subject: "Health Monitoring Update",
      html: `
        <h3>Hello ${user.data.firstName} ${user.data.lastName},</h3>
        <p>Here is your latest health data analysis:</p>
        <pre style="background:#f4f4f4;padding:10px;border-radius:5px;">${response}</pre>
        <p>Please continue to monitor your health regularly.</p>
        <br/>
        <p>— <strong>ICCT Health Monitoring Team</strong></p>
      `,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        next(error);
      }
    });
    const updatedData = {
      data: {
        ...user.data,
        healthStatus: {
          heartRate: heartRate || user.data.healthStatus.heartRate,
          SpO2: SpO2 || user.data.healthStatus.SpO2,
          weight: weight || user.data.healthStatus.weight,
          analysis: response, 
        },
      },
      created_at: user.created_at,
      updated_at: currentTime,
    };
    await updateData("users", { userId }, updatedData);
    await refreshData("users");
    res.success(null, "User updated successfully.");
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

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
        console.log(`Reminder email failed for ${user.data.email}:`, error);
      }
    });
  }
});