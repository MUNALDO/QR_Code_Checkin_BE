const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { SYSTEM_ERROR } = require('./constant/HttpStatus.js');
const cors = require('cors');
const adminRoute = require("./routes/admin.js");
const qrRoute = require("./routes/qrCode.js");
const employeeRoute = require("./routes/employee.js");
const authRoute = require("./routes/auth.js");
const inhaberRoute = require("./routes/inhaber.js");
const managerRoute = require("./routes/manager.js");
const { autoCheck, cleanUpOldSchedules } = require('./controllers/employeeController.js');
const cron = require('node-cron');

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