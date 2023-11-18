import express from 'express';
import {
    getAllEmployees, getAttendanceByTime,
    getEmployeeById, getEmployeeByName,
    getEmployeeSchedule,
    loginAdmin, logoutAdmin, registerAdmin,
    registerEmployee, scanAndUpdateAttendance
} from '../controllers/adminController.js';
import {
    addMemberDepartment, createDepartment, getAllDepartments,
    getDepartmentByCode, getDepartmentByName, updateDepartment
} from '../controllers/departmentController.js';
import {
    createShift, getAllShifts,
    getShiftByCode, getShiftByName, updateShift
} from '../controllers/shiftController.js';
import {
    addMemberGroup, createGroup, getAllGroups,
    getGroupByCode, getGroupByName, updateGroup
} from '../controllers/groupController.js';
import { verifyTokenAdmin } from '../utils/verifyToken.js';
import { salaryCalculate } from '../controllers/salaryController.js';
import { exportAttendanceToExcel } from '../controllers/xlsxController.js';
import {
    addMemberDayOff, createDayOff, getAllDaysOff,
    getDayOffByCode, getDayOffByName, updateDayOff
} from '../controllers/dayOffController.js';

const router = express.Router();

// authenticate
router.post('/registerAdmin', verifyTokenAdmin, registerAdmin);
router.post('/loginAdmin', loginAdmin);
router.post('/logoutAdmin', verifyTokenAdmin, logoutAdmin);

// employee
router.post('/manage-employee/add-employee', verifyTokenAdmin, registerEmployee);
router.get('/manage-employee/get-all-employees', verifyTokenAdmin, getAllEmployees);
router.get('/manage-employee/get-employee-byId', verifyTokenAdmin, getEmployeeById);
router.get('/manage-employee/get-employee-byName', verifyTokenAdmin, getEmployeeByName);
router.get('/manage-employee/get-schedule', verifyTokenAdmin, getEmployeeSchedule);

// department
router.post('/department/create-department', verifyTokenAdmin, createDepartment);

router.get('/department/get-all', verifyTokenAdmin, getAllDepartments);
router.get('/department/get-by-code', verifyTokenAdmin, getDepartmentByCode);
router.get('/department/get-by-name', verifyTokenAdmin, getDepartmentByName);

router.put('/department/update', verifyTokenAdmin, updateDepartment);
router.put('/department/add-member', verifyTokenAdmin, addMemberDepartment);

// shift
router.post('/shift/create-shift', verifyTokenAdmin, createShift);

router.get('/shift/get-all', verifyTokenAdmin, getAllShifts);
router.get('/shift/get-by-code', verifyTokenAdmin, getShiftByCode);
router.get('/shift/get-by-name', verifyTokenAdmin, getShiftByName);

router.put('/shift/update', verifyTokenAdmin, updateShift);

// group
router.post('/group/create-group', verifyTokenAdmin, createGroup);

router.get('/group/get-all', verifyTokenAdmin, getAllGroups);
router.get('/group/get-by-code', verifyTokenAdmin, getGroupByCode);
router.get('/group/get-by-name', verifyTokenAdmin, getGroupByName);

router.put('/group/update', verifyTokenAdmin, updateGroup);
router.put('/group/add-member', verifyTokenAdmin, addMemberGroup);

// day off
router.post('/day-off/create-dayOff', verifyTokenAdmin, createDayOff);

router.get('/day-off/get-all', verifyTokenAdmin, getAllDaysOff);
router.get('/day-off/get-by-code', verifyTokenAdmin, getDayOffByCode);
router.get('/day-off/get-by-name', verifyTokenAdmin, getDayOffByName);

router.put('/day-off/update', verifyTokenAdmin, updateDayOff);
router.put('/day-off/add-member', verifyTokenAdmin, addMemberDayOff);

// router.post('/create-schedule', verifyTokenAdmin, createSchedule);

router.get('/get-attendance', verifyTokenAdmin, getAttendanceByTime);
router.get('/export-attendance', verifyTokenAdmin, exportAttendanceToExcel);
router.post('/scan-attendance', verifyTokenAdmin, scanAndUpdateAttendance);

router.post('/salary-calculate', verifyTokenAdmin, salaryCalculate);
export default router;