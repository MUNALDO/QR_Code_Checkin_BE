import express from 'express';
import {
    createMultipleDateDesignsByInhaber, deleteDateSpecificByInhaber, deleteEmployeeByIdByInhaber,
    getAllEmployeeAttendanceByInhaber, getAttendanceForInhaber, getDateDesignForInhaber, getEmployeeAttendanceByInhaber,
    getEmployeesSchedulesByInhaber, getSalaryForAllEmployeesByInhaber, getSalaryForEmployeeByInhaber,
    madeEmployeeInactiveByInhaber, searchSpecificForInhaber, updateEmployeeByInhaber
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
router.put('/manage-employee/make-inactive', verifyTokenInhaber, madeEmployeeInactiveByInhaber);
router.delete("/manage-employee/delete-byId", verifyTokenInhaber, deleteEmployeeByIdByInhaber);
router.get("/manage-employee/search-specific", verifyTokenInhaber, searchSpecificForInhaber);
router.get("/manage-employee/get-all-schedules", verifyTokenInhaber, getEmployeesSchedulesByInhaber);

// manage date design
router.post("/manage-date-design/create-days", verifyTokenInhaber, createMultipleDateDesignsByInhaber);
router.get('/manage-date-design/get-by-specific', verifyTokenInhaber, getDateDesignForInhaber);
router.delete('/manage-date-design/delete', verifyTokenInhaber, deleteDateSpecificByInhaber);

// manage shift
router.post('/manage-shift/create', verifyTokenInhaber, createShift);
router.get('/manage-shift/get-all', verifyTokenInhaber, getAllShifts);
router.get('/manage-shift/get-by-code', verifyTokenInhaber, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyTokenInhaber, getShiftByName);
router.put('/manage-shift/update', verifyTokenInhaber, updateShift);

// manage attendance
router.get('/manage-attendance/get-by-specific', verifyTokenInhaber, getAttendanceForInhaber);
router.get('/manage-attendance/get-all', verifyTokenInhaber, getAllEmployeeAttendanceByInhaber);
router.get('/manage-attendance/get-specific/:employeeID', verifyTokenInhaber, getEmployeeAttendanceByInhaber);

// manage salary
router.post('/manage-salary/calculate/:employeeID', verifyTokenInhaber, salaryCalculate);
router.get('/manage-salary/get-single/:employeeID', verifyTokenInhaber, getSalaryForEmployeeByInhaber);
router.get('/manage-salary/get-all', verifyTokenInhaber, getSalaryForAllEmployeesByInhaber);

export default router;