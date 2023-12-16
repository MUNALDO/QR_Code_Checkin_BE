import express from 'express';
import {
    createDateDesignByManager, deleteDateSpecificByManager, getAllDatesByManager,
    getAllEmployeeAttendanceByManager, getAllEmployees, getDateDesignInMonthByManager,
    getDateSpecificByManager, getEmployeeAttendanceByManager, getEmployeeSpecific,
    getEmployeesByDateAndShiftByManager, getEmployeesByDateByManager,
} from '../controllers/managerController.js';
import { verifyTokenManager } from '../utils/verifyToken.js';

const router = express.Router();

// manage employee
router.get("/manage-employee/get-all", verifyTokenManager, getAllEmployees);
router.get("/manage-employee/get-specific", verifyTokenManager, getEmployeeSpecific);
router.get("/manage-employee/get-by-date", verifyTokenManager, getEmployeesByDateByManager);
router.get("/manage-employee/get-by-date&shift", verifyTokenManager, getEmployeesByDateAndShiftByManager);

// manage date design
router.post("/manage-date-design/create", verifyTokenManager, createDateDesignByManager);
router.get('/manage-date-design/get-all', verifyTokenManager, getAllDatesByManager);
router.get('/manage-date-design/get-by-month', verifyTokenManager, getDateDesignInMonthByManager);
router.get('/manage-date-design/get-by-date', verifyTokenManager, getDateSpecificByManager);
router.delete('/manage-date-design/delete', verifyTokenManager, deleteDateSpecificByManager);

// manage attendance
router.get('/manage-attendance/get-all', verifyTokenManager, getAllEmployeeAttendanceByManager);
router.get('/manage-attendance/get-specific/:employeeID', verifyTokenManager, getEmployeeAttendanceByManager);

export default router;