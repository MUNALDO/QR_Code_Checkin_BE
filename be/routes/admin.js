import express from 'express';
import {
    deleteEmployeeById, getAllEmployeeAttendance, getAllEmployees, getEmployeeAttendance, getEmployeeSpecific,
    getEmployeesByDate, getEmployeesByDateAndShift, searchSpecific, updateEmployee
} from '../controllers/adminController.js';
import {
    addMemberDepartment, createDepartment, deleteDepartmentByName, getAllDepartments,
    getDepartmentByName, getDepartmentSpecific, updateDepartment
} from '../controllers/departmentController.js';
import {
    createShift, getAllShifts,
    getShiftByCode, getShiftByName, updateShift
} from '../controllers/shiftController.js';
import { verifyTokenAdmin, verifyUserAdmin } from '../utils/verifyToken.js';
import { salaryCalculate } from '../controllers/salaryController.js';
import { exportAttendanceToExcel } from '../controllers/xlsxController.js';
import {
    addDayOffSchedule, addMemberDayOff, createDayOff, getAllDaysOff,
    getDayOffByCode, getDayOffByName, removeDayOffSchedule, updateDayOff
} from '../controllers/dayOffController.js';
import {
    createDateDesign, deleteDateSpecific,
    getAllDates, getDateDesignInMonth, getDateSpecific
} from '../controllers/dateDesignController.js';

const router = express.Router();

// all
router.get('/manage-all/search-specific', verifyUserAdmin, searchSpecific);

// employee
router.get('/manage-employee/get-all', verifyUserAdmin, getAllEmployees);
router.get('/manage-employee/get-specific', verifyUserAdmin, getEmployeeSpecific);
router.get('/manage-employee/get-by-date', verifyUserAdmin, getEmployeesByDate);
router.get('/manage-employee/get-by-date&shift', verifyUserAdmin, getEmployeesByDateAndShift);
router.get('/manage-employee/export-attendance', verifyUserAdmin, exportAttendanceToExcel);
router.delete('/manage-employee/delete-byId', verifyUserAdmin, deleteEmployeeById);
router.put('/manage-employee/update', verifyUserAdmin, updateEmployee);

// department
router.post('/manage-department/create', verifyUserAdmin, createDepartment);
router.get('/manage-department/get-all', verifyUserAdmin, getAllDepartments);
router.get('/manage-department/get-by-name', verifyUserAdmin, getDepartmentByName);
router.get('/manage-department/get-specific', verifyUserAdmin, getDepartmentSpecific);
router.put('/manage-department/update', verifyUserAdmin, updateDepartment);
router.put('/manage-department/add-member', verifyUserAdmin, addMemberDepartment);
router.delete('/manage-department/delete', verifyUserAdmin, deleteDepartmentByName);

// shift
router.post('/manage-shift/create', verifyUserAdmin, createShift);
router.get('/manage-shift/get-all', verifyUserAdmin, getAllShifts);
router.get('/manage-shift/get-by-code', verifyUserAdmin, getShiftByCode);
router.get('/manage-shift/get-by-name', verifyUserAdmin, getShiftByName);
router.put('/manage-shift/update', verifyUserAdmin, updateShift);

// date design
router.post('/manage-date-design/create', verifyUserAdmin, createDateDesign);
router.get('/manage-date-design/get-all', verifyUserAdmin, getAllDates);
router.get('/manage-date-design/get-by-month', verifyUserAdmin, getDateDesignInMonth);
router.get('/manage-date-design/get-by-date', verifyUserAdmin, getDateSpecific);
router.delete('/manage-date-design/delete', verifyUserAdmin, deleteDateSpecific);

// day off
router.post('/day-off/create-dayOff', createDayOff);
router.get('/day-off/get-all', getAllDaysOff);
router.get('/day-off/get-by-code', getDayOffByCode);
router.get('/day-off/get-by-name', getDayOffByName);
router.put('/day-off/update', updateDayOff);
router.put('/day-off/add-member', addMemberDayOff);
router.put('/day-off/add-dayOff', addDayOffSchedule);
router.put('/day-off/remove-dayOff', removeDayOffSchedule);

router.get('/manage-attendance/get-all', verifyUserAdmin, getAllEmployeeAttendance);
router.get('/manage-attendance/get-specific/:employeeID', verifyUserAdmin, getEmployeeAttendance);

router.post('/salary-calculate', verifyTokenAdmin, salaryCalculate);
export default router;