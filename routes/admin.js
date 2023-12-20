import express from 'express';
import {
    deleteEmployeeById, getAllEmployeeAttendance, getAllEmployees,
    getAllEmployeesSchedules, getAllRequests, getEmployeeAttendance,
    getEmployeesByDate, getEmployeesByDateAndShift, getRequestById,
    handleRequest, madeEmployeeInactive, searchSpecific, updateEmployeeBasicInfor
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
import { exportAttendanceToExcel, exportEmployeeDataToExcel, exportEmployeeSalaryDataToExcel } from '../controllers/xlsxController.js';
import {
    createMultipleDateDesigns, deleteDateSpecific, getDateDesign
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
router.get('/manage-employee/get-all-schedules', verifyTokenAdmin, getAllEmployeesSchedules);
router.get('/manage-employee/get-by-date', verifyTokenAdmin, getEmployeesByDate);
router.get('/manage-employee/get-by-date&shift', verifyTokenAdmin, getEmployeesByDateAndShift);
router.get('/manage-employee/export-attendance', verifyTokenAdmin, exportAttendanceToExcel);
router.delete('/manage-employee/delete-byId', verifyTokenAdmin, deleteEmployeeById);
router.put('/manage-employee/update-basic', verifyTokenAdmin, updateEmployeeBasicInfor);
router.put('/manage-employee/make-inactive', verifyTokenAdmin, madeEmployeeInactive);

// department
router.post('/manage-department/create', verifyTokenAdmin, createDepartment);
router.get('/manage-department/get-all', verifyTokenAdmin, getAllDepartments);
router.get('/manage-department/get-by-name', verifyTokenAdmin, getDepartmentByName);
router.get('/manage-department/get-specific', verifyTokenAdmin, getDepartmentSpecific);
router.put('/manage-department/update', verifyTokenAdmin, updateDepartment);
router.put('/manage-department/add-member/:name', verifyTokenAdmin, addMemberDepartment);
router.delete('/manage-department/delete', verifyTokenAdmin, deleteDepartmentByName);

// shift
router.post('/manage-shift/create', verifyTokenAdmin, createShift);
router.get('/manage-shift/get-all', verifyTokenAdmin, getAllShifts);
router.get('/manage-shift/get-by-code', verifyTokenAdmin, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyTokenAdmin, getShiftByName);
router.put('/manage-shift/update', verifyTokenAdmin, updateShift);

// date design
router.post('/manage-date-design/create-days', verifyTokenAdmin, createMultipleDateDesigns);
router.get('/manage-date-design/get-by-specific', verifyTokenAdmin, getDateDesign);
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

// manage xlsx
router.get('/manage-xlsx/employee-data', verifyTokenAdmin, exportEmployeeDataToExcel);
router.get('/manage-xlsx/salary-data', verifyTokenAdmin, exportEmployeeSalaryDataToExcel);

export default router;