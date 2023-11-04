import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { FORBIDDEN, OK, SYSTEM_ERROR } from './constant/HttpStatus.js';
import myLogger from './winstonLog/winston.js';
import cors from 'cors';
import adminRoute from "./routes/admin.js";
import qrRoute from "./routes/qrCode.js";

const app = express();
dotenv.config();
mongoose.set('strictQuery', false);

const localIpAddress = process.env.IP_ADDRESS; // Change this to your local IP
console.log(localIpAddress);

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        myLogger.info("Database connected")
    } catch (error) {
        throw error;
    }
}

mongoose.connection.on('disconnected', () => {
    myLogger.info("Database disconnected");
});

app.use((req, res, next) => {
    let requesterIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Handle IPv6-mapped IPv4 addresses
    const ipv4Match = requesterIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (ipv4Match) {
        requesterIp = ipv4Match[1];
    }

    // Check if the last part of the IP address is in the range 100-109
    const parts = requesterIp.split('.');
    const lastPart = parseInt(parts[3], 10);
    if (lastPart >= 100 && lastPart <= 109) {
        console.log(`Device with IP ${requesterIp} successfully scanned the QR code.`);
        res.status(OK).json({ success: 'QR code scanned successfully' });
    } else {
        console.log(`Device with IP ${requesterIp} attempted to scan the QR code but is not in the allowed range.`);
        res.status(FORBIDDEN).json({ error: 'Access denied' });
    }
});

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use("/api/admin", adminRoute);
app.use("/api/qr-code", qrRoute);

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
    app.listen(8800, () => {
        connect();
        myLogger.info('Server is running on port 8800');
    });
}

startApp();
