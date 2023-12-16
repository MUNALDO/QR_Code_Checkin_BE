import express from 'express';
import {
    deleteEmployeeById, getAllEmployeeAttendance, getAllEmployees,
    getAllRequests, getEmployeeAttendance, getEmployeeSpecific,
    getEmployeesByDate, getEmployeesByDateAndShift, getRequestById,
    handleRequest, searchSpecific, updateEmployee
} from '../controllers/adminController.js';
import {
    addMemberDepartment, createDepartment, deleteDepartmentByName, getAllDepartments,
    getDepartmentByName, getDepartmentSpecific, updateDepartment
} from '../controllers/departmentController.js';
import {
    createShift, getAllShifts,
    getShiftByCode, getShiftByName, updateShift
} from '../controllers/shiftController.js';
import { verifyTokenAdmin } from '../utils/verifyToken.js';
import { getSalaryForAllEmployees, getSalaryForEmployee, salaryCalculate } from '../controllers/salaryController.js';
import { exportAttendanceToExcel } from '../controllers/xlsxController.js';
import {
    createDateDesign, deleteDateSpecific,
    getAllDates, getDateDesignInMonth, getDateSpecific
} from '../controllers/dateDesignController.js';
import {
    createDayOff, deleteDayOffById, deleteEmployeeDayOff,
    getAllGlobalDayOffs, getDayOffById, getEmployeeDayOffs
} from '../controllers/dayOffController.js';

const router = express.Router();

// all
router.get('/manage-all/search-specific', verifyTokenAdmin, searchSpecific);

// employee
router.get('/manage-employee/get-all', verifyTokenAdmin, getAllEmployees);
router.get('/manage-employee/get-specific', verifyTokenAdmin, getEmployeeSpecific);
router.get('/manage-employee/get-by-date', verifyTokenAdmin, getEmployeesByDate);
router.get('/manage-employee/get-by-date&shift', verifyTokenAdmin, getEmployeesByDateAndShift);
router.get('/manage-employee/export-attendance', verifyTokenAdmin, exportAttendanceToExcel);
router.delete('/manage-employee/delete-byId', verifyTokenAdmin, deleteEmployeeById);
router.put('/manage-employee/update', verifyTokenAdmin, updateEmployee);

// department
router.post('/manage-department/create', verifyTokenAdmin, createDepartment);
router.get('/manage-department/get-all', verifyTokenAdmin, getAllDepartments);
router.get('/manage-department/get-by-name', verifyTokenAdmin, getDepartmentByName);
router.get('/manage-department/get-specific', verifyTokenAdmin, getDepartmentSpecific);
router.put('/manage-department/update', verifyTokenAdmin, updateDepartment);
router.put('/manage-department/add-member', verifyTokenAdmin, addMemberDepartment);
router.delete('/manage-department/delete', verifyTokenAdmin, deleteDepartmentByName);

// shift
router.post('/manage-shift/create', verifyTokenAdmin, createShift);
router.get('/manage-shift/get-all', verifyTokenAdmin, getAllShifts);
router.get('/manage-shift/get-by-code', verifyTokenAdmin, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyTokenAdmin, getShiftByName);
router.put('/manage-shift/update', verifyTokenAdmin, updateShift);

// date design
router.post('/manage-date-design/create', verifyTokenAdmin, createDateDesign);
router.get('/manage-date-design/get-all', verifyTokenAdmin, getAllDates);
router.get('/manage-date-design/get-by-month', verifyTokenAdmin, getDateDesignInMonth);
router.get('/manage-date-design/get-by-date', verifyTokenAdmin, getDateSpecific);
router.delete('/manage-date-design/delete', verifyTokenAdmin, deleteDateSpecific);

// day off
router.post('/manage-day-off/create', verifyTokenAdmin, createDayOff);
router.get('/manage-day-off/get-all', verifyTokenAdmin, getAllGlobalDayOffs);
router.get('/manage-day-off/get-byId/:_id', verifyTokenAdmin, getDayOffById);
router.delete('/manage-day-off/delete-byId/:_id', verifyTokenAdmin, deleteDayOffById);
router.get('/manage-day-off/get-specific-employee', verifyTokenAdmin, getEmployeeDayOffs);
router.delete('/manage-day-off/delete-employee/:_id', verifyTokenAdmin, deleteEmployeeDayOff);

// manage request
router.get('/manage-request/get-all', verifyTokenAdmin, getAllRequests);
router.get('/manage-request/get-byId/:_id', verifyTokenAdmin, getRequestById);
router.put('/manage-request/handle/:_id', verifyTokenAdmin, handleRequest);

// manage attendance
router.get('/manage-attendance/get-all', verifyTokenAdmin, getAllEmployeeAttendance);
router.get('/manage-attendance/get-specific/:employeeID', verifyTokenAdmin, getEmployeeAttendance);

// manage salary
router.post('/manage-salary/calculate/:employeeID', verifyTokenAdmin, salaryCalculate);
router.get('/manage-salary/get-single/:employeeID', verifyTokenAdmin, getSalaryForEmployee);
router.get('/manage-salary/get-all', verifyTokenAdmin, getSalaryForAllEmployees);

export default router;