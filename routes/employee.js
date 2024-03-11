import express from 'express';
import {
    checkAttendance, collectIP, createRequest, getAllCarsCompany,
    getAllRequestsForEmployee, getColleaguesWorkingTodayByEmployee, getColleaguesWorkingTodayByEmployees, getDateDesignCurrentByEmployee,
    getEmployeeAttendanceCurrentMonth, updateAttendance, verifyWifi
} from '../controllers/employeeController.js';
// import { verifyTokenEmployee } from '../utils/verifyToken.js';

const router = express.Router();

// import aws from 'aws-sdk';
// import multer from 'multer';
// import multerS3 from 'multer-s3';
// import dotenv from 'dotenv';
// import { s3Client } from '../awsConfig.js';
// dotenv.config();

// aws.config.update({
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     region: process.env.AWS_REGION,
// });

// const s3 = new aws.S3();

// const upload = multer({
//     storage: multerS3({
//         s3: s3Client,
//         bucket: process.env.AWS_S3_BUCKET_NAME,
//         acl: 'public-read', // Adjust according to your needs
//         key: function (req, file, cb) {
//             cb(null, Date.now().toString() + '-' + file.originalname);
//         }
//     }),
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype.startsWith('image')) {
//             cb(null, true);
//         } else {
//             cb(new Error('Invalid file type, only images are allowed!'), false);
//         }
//     },
//     limits: { fileSize: 1024 * 1024 * 10 }, // For example, limit file size to 10MB
// });
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// verify wifi
router.post('/verify-wifi', verifyWifi);
router.get('/collect-ip', collectIP);

// attendance
router.post('/check-attendance', checkAttendance);
router.post('/update-attendance', upload.single('image'), updateAttendance);
router.get('/get-attendance', getEmployeeAttendanceCurrentMonth);

// request
router.post('/create-request', upload.single('image'), createRequest);
router.get('/get-all-request', getAllRequestsForEmployee);

// schedule
router.get('/get-schedules', getDateDesignCurrentByEmployee);
router.get('/get-co-worker', getColleaguesWorkingTodayByEmployee);
router.get('/get-co-worker/get-by-date', getColleaguesWorkingTodayByEmployees);

// car
router.get('/get-car', getAllCarsCompany);

export default router;