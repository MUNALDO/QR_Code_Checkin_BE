import express from 'express';
import {
    checkAttendance, createRequest, getAllCarsCompany, getAllRequestsForEmployee, getDateDesignCurrentByEmployee,
    getEmployeeAttendanceCurrentMonth, updateAttendance, verifyWifi
} from '../controllers/employeeController.js';
// import { verifyTokenEmployee } from '../utils/verifyToken.js';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();

// verify wifi
router.post('/verify-wifi', verifyWifi);

// attendance
router.post('/check-attendance', checkAttendance);
router.post('/update-attendance', upload.single('image'), updateAttendance);
router.get('/get-attendance', getEmployeeAttendanceCurrentMonth);

// request
router.post('/create-request', createRequest);
router.get('/get-all-request', getAllRequestsForEmployee);

// schedule
router.get('/get-schedules', getDateDesignCurrentByEmployee);

// car
router.get('/get-car', getAllCarsCompany);

export default router;