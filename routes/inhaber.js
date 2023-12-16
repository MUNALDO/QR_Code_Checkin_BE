import express from 'express';
import {
    createDateDesignByInhaber, deleteDateSpecificByInhaber, deleteEmployeeByIdByInhaber,
    getAllDatesByInhaber, getAllEmployeeAttendanceByInhaber, getAllEmployees,
    getDateDesignInMonthByInhaber, getDateSpecificByInhaber, getEmployeeAttendanceByInhaber,
    getEmployeeSpecific, getEmployeesByDateAndShiftByInhaber, getEmployeesByDateByInhaber,
    getSalaryForAllEmployeesByInhaber, getSalaryForEmployeeByInhaber, updateEmployeeByInhaber
} from '../controllers/inhaberController.js';
import {
    createShift, getAllShifts, getShiftByCode,
    getShiftByName, updateShift
} from '../controllers/shiftController.js';
import { salaryCalculate } from '../controllers/salaryController.js';
import { verifyTokenInhaber } from '../utils/verifyToken.js';

const router = express.Router();

// manage employee
router.put("/manage-employee/update", verifyTokenInhaber, updateEmployeeByInhaber);
router.delete("/manage-employee/delete-byId", verifyTokenInhaber, deleteEmployeeByIdByInhaber);
router.get("/manage-employee/get-all", verifyTokenInhaber, getAllEmployees);
router.get("/manage-employee/get-specific", verifyTokenInhaber, getEmployeeSpecific);
router.get("/manage-employee/get-by-date", verifyTokenInhaber, getEmployeesByDateByInhaber);
router.get("/manage-employee/get-by-date&shift", verifyTokenInhaber, getEmployeesByDateAndShiftByInhaber);

// manage date design
router.post("/manage-date-design/create", verifyTokenInhaber, createDateDesignByInhaber);
router.get('/manage-date-design/get-all', verifyTokenInhaber, getAllDatesByInhaber);
router.get('/manage-date-design/get-by-month', verifyTokenInhaber, getDateDesignInMonthByInhaber);
router.get('/manage-date-design/get-by-date', verifyTokenInhaber, getDateSpecificByInhaber);
router.delete('/manage-date-design/delete', verifyTokenInhaber, deleteDateSpecificByInhaber);

// manage shift
router.post('/manage-shift/create', verifyTokenInhaber, createShift);
router.get('/manage-shift/get-all', verifyTokenInhaber, getAllShifts);
router.get('/manage-shift/get-by-code', verifyTokenInhaber, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyTokenInhaber, getShiftByName);
router.put('/manage-shift/update', verifyTokenInhaber, updateShift);

// manage attendance
router.get('/manage-attendance/get-all', verifyTokenInhaber, getAllEmployeeAttendanceByInhaber);
router.get('/manage-attendance/get-specific/:employeeID', verifyTokenInhaber, getEmployeeAttendanceByInhaber);

// manage salary
router.post('/manage-salary/calculate/:employeeID', verifyTokenInhaber, salaryCalculate);
router.get('/manage-salary/get-single/:employeeID', verifyTokenInhaber, getSalaryForEmployeeByInhaber);
router.get('/manage-salary/get-all', verifyTokenInhaber, getSalaryForAllEmployeesByInhaber);

export default router;