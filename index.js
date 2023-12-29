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
import { autoCheck } from './controllers/employeeController.js';
import cron from 'node-cron';

const app = express();
dotenv.config();
mongoose.set('strictQuery', false);
process.env.TZ = 'Asia/Ho_Chi_Minh';

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

app.use(cors({
    origin: ['http://localhost:3000', 'https://qr-code-checkin-be.vercel.app',
        'https://qr-code-checkin.vercel.app', 'https://qr-code-checkin-thai-nx.vercel.app',
        'qrapp.qxotttabcxyz.online', 'http://192.168.0.102:3000', 'http://localhost:8800',
        'http://192.168.30.230:3000', 'https://fe-qr-project.vercel.app',
        'https://qr-code-checkin-employee.vercel.app'],
    credentials: true,
}));
app.options('*', cors());

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

// Schedule the autoCheck function to run every 15 minutes
cron.schedule('*/15 * * * *', () => {
    console.log('Running autoCheck every 15 minutes');
    autoCheck();
});

async function startApp() {
    await connect();
    app.listen(8800, () => {
        console.log('Server is running on port 8800');
    });
}

startApp();
