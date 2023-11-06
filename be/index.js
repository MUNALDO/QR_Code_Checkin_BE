import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { FORBIDDEN, OK, SYSTEM_ERROR } from './constant/HttpStatus.js';
import myLogger from './winstonLog/winston.js';
import cors from 'cors';
import adminRoute from "./routes/admin.js";
import qrRoute from "./routes/qrCode.js";
// import useragent from 'useragent';
import employeeRoute from "./routes/employee.js";

const app = express();
dotenv.config();
mongoose.set('strictQuery', false);

const localIpAddress = process.env.IP_ADDRESS; // Change this to your local IP
console.log(localIpAddress);

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        myLogger.info("Database connected");
    } catch (error) {
        throw error;
    }
}

mongoose.connection.on('disconnected', () => {
    myLogger.info("Database disconnected");
});

// Middleware to collect user agent data
app.use((req, res, next) => {
    let requesterIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Handle IPv6-mapped IPv4 addresses
    const ipv4Match = requesterIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (ipv4Match) {
        requesterIp = ipv4Match[1];
    }

    const validIp = requesterIp.startsWith('192.168.0.');
    // Check if the requester's IP address starts with '192.168.0'
    if (validIp) {
        console.log(`Device with IP ${requesterIp} is valid.`);
        next();
        // Collect user agent data
        // const userAgentData = req.headers['user-agent'];
        // const agent = useragent.parse(userAgentData);
        // console.log(agent);

        // Extract information from user agent data
        // const deviceData = {
        //     browser: agent.toAgent(),
        //     os: agent.os.toString(),
        //     deviceID: agent.device.toJSON().family,
        //     deviceName: agent.toJSON(),
        // };

        // You can process and store the device data here
        // console.log('Device Data:', deviceData);

        // res.status(OK).json({ success: "Device Data", data: deviceData });
    } else {
        console.log(`Device with IP ${requesterIp} is not on the allowed network.`);
        res.status(FORBIDDEN).json({ error: 'Access denied' });
    }
});

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use("/api/admin", adminRoute);
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
    app.listen(8800, () => {
        connect();
        myLogger.info('Server is running on port 8800');
    });
}

startApp();
