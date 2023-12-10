import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { SYSTEM_ERROR } from './constant/HttpStatus.js';
// import myLogger from './winstonLog/winston.js';
import cors from 'cors';
import adminRoute from "./routes/admin.js";
import qrRoute from "./routes/qrCode.js";
import employeeRoute from "./routes/employee.js";
import authRoute from "./routes/auth.js";
import inhaberRoute from "./routes/inhaber.js";
import managerRoute from "./routes/manager.js"
// import wifi from 'node-wifi'; 
// import { scanAndUpdateAttendance } from './controllers/adminController.js';
import { autoCheck } from './controllers/employeeController.js';

process.env.TZ = 'Asia/Ho_Chi_Minh';
const app = express();
dotenv.config();
mongoose.set('strictQuery', false);

// const wifiName = process.env.WIFI_NAME;

async function autoChecking() {
    await connect();
    console.log("Processing...");
    autoCheck();
}

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Database connected");
    } catch (error) {
        throw error;
    }
}

mongoose.connection.on('disconnected', () => {
    console.log("Database disconnected");
});

// app.use((req, res, next) => {
//     let requesterIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

//     // Handle IPv6-mapped IPv4 addresses
//     const ipv4Match = requesterIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
//     if (ipv4Match) {
//         requesterIp = ipv4Match[1];
//     }

//     const validIp = requesterIp.startsWith('192.168.0.');
//     // Check if the requester's IP address starts with '192.168.0'
//     if (validIp) {
//         console.log(`Device with IP ${requesterIp} is valid.`);
//         next();
//     } else {
//         console.log(`Device with IP ${requesterIp} is not on the allowed network.`);
//         res.status(FORBIDDEN).json({ error: 'Access denied' });
//     }
// });


// Initialize wifi-control

// wifi.init({
//     iface: null, 
// });

// // Middleware to allow access based on Wi-Fi SSID
// app.use(async (req, res, next) => {
//     try {
//         // Scan for available networks and get the currently connected SSID
//         const currentConnections = await wifi.getCurrentConnections();
//         // console.log(currentConnections);

//         if (currentConnections.length > 0) {
//             const connectedSSID = currentConnections[0].ssid;
//             // Define the allowed SSID (replace 'Devssidex' with your SSID)
//             const allowedSSID = wifiName;

//             if (connectedSSID === allowedSSID) {
//                 console.log(`Device connected to Wi-Fi with SSID: ${allowedSSID}`);
//                 next();
//             } else {
//                 console.log(`Device is not connected to the allowed Wi-Fi SSID.`);
//                 res.status(FORBIDDEN).json({ error: 'Access denied' });
//             }
//         } else {
//             console.log(`Device is not connected to any Wi-Fi network.`);
//             res.status(FORBIDDEN).json({ error: 'Access denied' });
//         }
//     } catch (error) {
//         console.error('Error checking Wi-Fi SSID:', error);
//         res.status(SYSTEM_ERROR).json({ error: 'Something went wrong' });
//     }
// });

// Add a preflight handler before your routes
app.options('*', cors());

app.use(cors({
    credentials: true,
    origin: ['http://localhost:3000', 'https://qr-code-checkin-be.vercel.app'],
}));

app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/inhaber", inhaberRoute);
app.use("/api/manager", managerRoute);
app.use("/api/qr-code", qrRoute);
app.use("/api/employee", employeeRoute);

app.use((err, req, res, next) => {
    const errorStatus = err.status || SYSTEM_ERROR;
    const errorMessage = err.message || "Something went wrong";
    return res.status(errorStatus).json({
        success: false,
        status: errorStatus,
        message: errorMessage,
        stack: err.stack
    });
});

async function startApp() {
    await autoChecking();
    await connect();
    app.listen(8800, () => {
        // connect();
        console.log('Server is running on port 8800');
        // scanAndUpdateAttendance();
    });
}

startApp();
