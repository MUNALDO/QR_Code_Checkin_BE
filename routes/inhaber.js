import express from 'express';
import {
    addMemberToDepartmentByInhaber, createMultipleDateDesignsByInhaber, deleteMultipleDateDesignsByInhaber,
    getAllRequestsForInhaber, getAttendanceForInhaber, getDateDesignForInhaber, getEmployeeByIdForInhaber,
    getRequestByIdForInhaber, getSalaryForInhaber, getStatsForInhaber, handleRequestForInhaber,
    removeMemberFromDepartmentByInhaber, searchSpecificForInhaber, deleteEmployeeByIdByInhaber,
    updateAttendanceForInhaber, updateEmployeeByInhaber, getEmployeesSchedulesByInhaber,
    getFormByInhaber, createCarByInhaber, getCarByInhaber, deleteCarByInhaber, updateCarByInhaber,
    updateCarByIdInhaber, deleteCarByIdInhaber
} from '../controllers/inhaberController.js';
import {
    createShift, deleteShiftByCode, getAllShifts, getShiftByCode,
    getShiftByName, updateShift
} from '../controllers/shiftController.js';
import { salaryCalculate } from '../controllers/salaryController.js';
import { verifyTokenInhaber } from '../utils/verifyToken.js';
import {
    exportAttendanceForInhaberToExcel, exportEmployeeAttendanceStatsToExcel,
    exportEmployeeAttendanceToExcel, exportEmployeeDataForInhaberToExcel,
    exportEmployeeSalaryDataForInhaberToExcel
} from '../controllers/xlsxController.js';
import { createAttendance, madeEmployeeInactive } from '../controllers/adminController.js';
import { getCarById } from '../controllers/departmentController.js';

const router = express.Router();

// manage employee
router.put("/manage-employee/update", verifyTokenInhaber, updateEmployeeByInhaber);
router.post('/manage-employee/make-inactive', verifyTokenInhaber, madeEmployeeInactive);
router.get("/manage-employee/get-byId", verifyTokenInhaber, getEmployeeByIdForInhaber);
router.delete("/manage-employee/delete-byId", verifyTokenInhaber, deleteEmployeeByIdByInhaber);
router.get("/manage-employee/search-specific", verifyTokenInhaber, searchSpecificForInhaber);
router.get("/manage-employee/get-all-schedules", verifyTokenInhaber, getEmployeesSchedulesByInhaber);

// manage date design
router.post("/manage-date-design/create-days", verifyTokenInhaber, createMultipleDateDesignsByInhaber);
router.get('/manage-date-design/get-by-specific', verifyTokenInhaber, getDateDesignForInhaber);
router.delete('/manage-date-design/delete', verifyTokenInhaber, deleteMultipleDateDesignsByInhaber);

// manage shift
router.post('/manage-shift/create', verifyTokenInhaber, createShift);
router.get('/manage-shift/get-all', verifyTokenInhaber, getAllShifts);
router.get('/manage-shift/get-by-code', verifyTokenInhaber, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyTokenInhaber, getShiftByName);
router.put('/manage-shift/update', verifyTokenInhaber, updateShift);
router.delete('/manage-shift/delete', verifyTokenInhaber, deleteShiftByCode);

// manage attendance
router.post('/manage-attendance/create', verifyTokenInhaber, createAttendance);
router.get('/manage-attendance/get-by-specific', verifyTokenInhaber, getAttendanceForInhaber);
router.put('/manage-attendance/update/:_id', verifyTokenInhaber, updateAttendanceForInhaber);

// manage salary
router.post('/manage-salary/calculate/:employeeID', verifyTokenInhaber, salaryCalculate);
router.get('/manage-salary/get', verifyTokenInhaber, getSalaryForInhaber);

// manage request
router.get('/manage-request/get-all', verifyTokenInhaber, getAllRequestsForInhaber);
router.get('/manage-request/get-byId/:_id', verifyTokenInhaber, getRequestByIdForInhaber);
router.put('/manage-request/handle/:_id', verifyTokenInhaber, handleRequestForInhaber);

// manage export
router.get('/manage-xlsx/employee-data', verifyTokenInhaber, exportEmployeeDataForInhaberToExcel);
router.get('/manage-xlsx/salary-data', verifyTokenInhaber, exportEmployeeSalaryDataForInhaberToExcel);
router.get('/manage-xlsx/attendance-data', verifyTokenInhaber, exportAttendanceForInhaberToExcel);
router.get('/manage-xlsx/attendance-stats', verifyTokenInhaber, exportEmployeeAttendanceStatsToExcel);
router.get('/manage-xlsx/employee-attendance', verifyTokenInhaber, exportEmployeeAttendanceToExcel);

// manage stats
router.get('/manage-stats/get', verifyTokenInhaber, getStatsForInhaber);

// manage department
router.put('/manage-department/add-member/:name', verifyTokenInhaber, addMemberToDepartmentByInhaber);
router.put('/manage-department/remove-member/:name', verifyTokenInhaber, removeMemberFromDepartmentByInhaber);

// manage form
router.get('/manage-form/get', verifyTokenInhaber, getFormByInhaber);

// manage cars
router.post('/manage-car/create', verifyTokenInhaber, createCarByInhaber);
router.get('/manage-car/get', verifyTokenInhaber, getCarByInhaber);
router.get('/manage-car/get-by-id/:carID', verifyTokenInhaber, getCarById);
router.put('/manage-car/update-by-id/:carID', verifyTokenInhaber, updateCarByIdInhaber);
router.put('/manage-car/update', verifyTokenInhaber, updateCarByInhaber);
router.delete('/manage-car/delete', verifyTokenInhaber, deleteCarByInhaber);
router.delete('/manage-car/delete-by-id', verifyTokenInhaber, deleteCarByIdInhaber);

export default router;