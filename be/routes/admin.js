import express from 'express';
import {
    deleteEmployeeById, getAllEmployees, getAttendanceByTime,
    getEmployeeById, getEmployeeByName, getEmployeeByRole,
    getEmployeeSchedule, getEmployeeSpecific, updateEmployee
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
import { salaryCalculate } from '../controllers/salaryController.js';
import { exportAttendanceToExcel } from '../controllers/xlsxController.js';
import {
    addDayOffSchedule, addMemberDayOff, createDayOff, getAllDaysOff,
    getDayOffByCode, getDayOffByName, removeDayOffSchedule, updateDayOff
} from '../controllers/dayOffController.js';
import {
    addMemberDate, createDateDesign,
    getAllDates, getDateById, updateDate
} from '../controllers/dateDesignController.js';

const router = express.Router();

// employee
router.get('/manage-employee/get-all', getAllEmployees);
router.get('/manage-employee/get-employee-specific', getEmployeeSpecific);
router.get('/manage-employee/get-byId', getEmployeeById);
router.get('/manage-employee/get-byName', getEmployeeByName);
router.get('/manage-employee/get-byRole', getEmployeeByRole);
router.get('/manage-employee/get-schedule', getEmployeeSchedule);
router.get('/manage-employee/export-attendance', exportAttendanceToExcel);
router.delete('/manage-employee/delete-byId', deleteEmployeeById);
router.put('/manage-employee/update', updateEmployee);

// department
router.post('/department/create', createDepartment);
router.get('/department/get-all', getAllDepartments);
router.get('/department/get-by-name', getDepartmentByName);
router.get('/department/get-department-specific', getDepartmentSpecific);
router.put('/department/update', updateDepartment);
router.put('/department/add-member', addMemberDepartment);
router.delete('/department/delete', deleteDepartmentByName);

// shift
router.post('/shift/create-shift', createShift);
router.get('/shift/get-all', getAllShifts);
router.get('/shift/get-by-code', getShiftByCode);
router.get('/shift/get-by-name', getShiftByName);
router.put('/shift/update', updateShift);

// date design
router.post('/date-design/create', createDateDesign);
router.get('/date-design/get-all', getAllDates);
router.get('/date-design/get-by-id', getDateById);
router.put('/date-design/update', updateDate);
router.put('/date-design/add-member', addMemberDate);

// day off
router.post('/day-off/create-dayOff', createDayOff);
router.get('/day-off/get-all', getAllDaysOff);
router.get('/day-off/get-by-code', getDayOffByCode);
router.get('/day-off/get-by-name', getDayOffByName);
router.put('/day-off/update', updateDayOff);
router.put('/day-off/add-member', addMemberDayOff);
router.put('/day-off/add-dayOff', addDayOffSchedule);
router.put('/day-off/remove-dayOff', removeDayOffSchedule);

router.get('/get-attendance', getAttendanceByTime);
// router.post('/scan-attendance', scanAndUpdateAttendance);

router.post('/salary-calculate', verifyTokenAdmin, salaryCalculate);
export default router;