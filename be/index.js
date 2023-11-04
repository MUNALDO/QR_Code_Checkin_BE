import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import { SYSTEM_ERROR } from './constant/HttpStatus.js';
import myLogger from './winstonLog/winston.js';
import cors from 'cors';
import adminRoute from "./routes/admin.js";

const app = express();
dotenv.config();
mongoose.set('strictQuery', false);

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

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use("/api/admin", adminRoute)

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
