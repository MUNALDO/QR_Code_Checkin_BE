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
import { autoCheck, cleanUpOldSchedules } from './controllers/employeeController.js';
import cron from 'node-cron';

const app = express();
dotenv.config();
mongoose.set('strictQuery', false);
process.env.TZ = 'Europe/Berlin';

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
    origin: ['http://localhost:3000', 'https://fe-qr-project.vercel.app', 'fe-qr-project-uh5f.vercel.app',
        'https://qr-code-checkin-employee.vercel.app', 'https://qrcodecheckin-d350fcfb1cb9.herokuapp.com',
        'https://fe-qr-project-uh5f.vercel.app', 'https://qr-code-checkin-employee-eight.vercel.app',
        'https://qr-code-checkin-employee-eight.vercel.app/login', 'http://localhost:3001',
        'https://www.checkinnow.de', 'https://www.checkinnow.de/login', 'https://www.cazzy.eu'],
    credentials: true,
}));
// app.options('*', cors());

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

cron.schedule('*/15 * * * *', () => {
    console.log('Running autoCheck every 15 minutes');
    autoCheck();
});

// cron.schedule('0 0 * * *', () => {
//     console.log('Running scheduled cleanup of old schedules');
//     cleanUpOldSchedules();
// });

const PORT = process.env.PORT || 8800;
async function startApp() {
    await connect();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startApp();