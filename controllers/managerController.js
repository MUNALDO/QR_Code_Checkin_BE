import { createError } from "../utils/error.js";
import { FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";

export const searchSpecificForManager = async (req, res, next) => {
    const { role, details, status } = req.query;
    const manager_name = req.query.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const regex = new RegExp(details, 'i');
        const departmentFilter = { 'department_name': manager.department_name };

        let managementQueryCriteria = { ...departmentFilter, 'role': 'Manager' };
        let employeeQueryCriteria = { 'department.name': manager.department_name, 'role': 'Employee' };

        if (status) {
            managementQueryCriteria['status'] = status;
            employeeQueryCriteria['status'] = status;
        }

        if (details) {
            managementQueryCriteria['$or'] = [{ id: regex }, { name: regex }];
            employeeQueryCriteria['$or'] = [{ id: regex }, { name: regex }, { 'department.position': regex }];
        }

        if (role) {
            if (role === 'Manager') {
                employeeQueryCriteria = {};
            } else if (role === 'Employee') {
                managementQueryCriteria = {};
            }
        }

        const managers = Object.keys(managementQueryCriteria).length > 1 ? await AdminSchema.find(managementQueryCriteria) : [];
        const employees = Object.keys(employeeQueryCriteria).length > 1 ? await EmployeeSchema.find(employeeQueryCriteria) : [];

        const result = [...managers, ...employees];
        if (result.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No matching records found in your department.",
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: result,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesSchedulesByManager = async (req, res, next) => {
    const manager_name = req.query.manager_name;
    const targetYear = parseInt(req.query.year);
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    try {
        // Find the manager and get their department name
        const manager = await AdminSchema.findOne({ name: manager_name, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const departmentName = manager.department_name;

        // Find all employees in the manager's department
        const employees = await EmployeeSchema.find({ 'department.name': departmentName });

        const schedules = [];
        employees.forEach(employee => {
            employee.department.forEach(department => {
                if (department.name === departmentName) {
                    department.schedules.forEach(schedule => {
                        const scheduleDate = new Date(schedule.date);

                        if (scheduleDate.getFullYear() === targetYear &&
                            (targetMonth === null || scheduleDate.getMonth() === targetMonth) &&
                            (!targetDate || scheduleDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0])) {

                            schedule.shift_design.forEach(shift => {
                                schedules.push({
                                    employee_id: employee.id,
                                    employee_name: employee.name,
                                    department_name: department.name,
                                    date: scheduleDate,
                                    shift_code: shift.shift_code,
                                    position: shift.position,
                                    time_slot: shift.time_slot,
                                    shift_type: shift.shift_type
                                });
                            });
                        }
                    });
                }
            });
        });

        if (schedules.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No schedules found for the specified criteria in your department."
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: schedules
        });
    } catch (err) {
        next(err);
    }
};

export const createMultipleDateDesignsByManager = async (req, res, next) => {
    const manager_name = req.query.manager_name;
    const specificEmployeeID = req.query.employeeID;
    const shiftCode = req.body.shift_code;
    const dates = req.body.dates;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));
        const departmentName = manager.department_name;

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        let employees;
        if (specificEmployeeID) {
            const employee = await EmployeeSchema.findOne({ id: specificEmployeeID, 'department.name': departmentName });
            if (!employee) return next(createError(NOT_FOUND, "Employee not found in the manager's department!"));
            employees = [employee];
        } else {
            employees = await EmployeeSchema.find({ 'department.name': departmentName });
        }

        const results = [];
        for (const employee of employees) {
            const employeeDepartment = employee.department.find(dep => dep.name === departmentName);
            if (!employeeDepartment) continue;

            for (const date of dates) {
                const dateObj = new Date(date);
                let existingDateInDepartmentSchedule = employeeDepartment.schedules.find(schedule =>
                    schedule.date.getTime() === dateObj.getTime()
                );

                if (existingDateInDepartmentSchedule && existingDateInDepartmentSchedule.shift_design.some(design => design.shift_code === shiftCode)) {
                    return res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: `Shift with code ${shiftCode} already exists for ${date} in the employee's department.`
                    });
                }

                if (!existingDateInDepartmentSchedule) {
                    existingDateInDepartmentSchedule = {
                        date: dateObj,
                        shift_design: [{
                            position: req.body.position,
                            shift_code: shift.code,
                            time_slot: shift.time_slot,
                            shift_type: req.body.shift_type
                        }]
                    };
                    employeeDepartment.schedules.push(existingDateInDepartmentSchedule);
                }

                existingDateInDepartmentSchedule.shift_design.push({
                    position: req.body.position,
                    shift_code: shift.code,
                    time_slot: shift.time_slot,
                    shift_type: req.body.shift_type
                });
            }

            await employee.save();

            results.push({
                employee_id: employee.id,
                employee_name: employee.name,
                email: employee.email,
                department_name: departmentName,
                role: employee.role,
                position: req.body.position,
                schedule: employeeDepartment.schedules
            });
        }

        if (results.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No schedules created. No employees found in the manager's department."
            });
        }

        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: results
        });
    } catch (err) {
        next(err);
    }
};

export const getDateDesignForManager = async (req, res, next) => {
    const managerName = req.query.manager_name;
    const targetYear = req.query.year ? parseInt(req.query.year) : null;
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    try {
        // Find the manager and get their department name
        const manager = await AdminSchema.findOne({ name: managerName, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));
        const departmentName = manager.department_name;

        const shiftDesigns = [];

        // Find all employees in the manager's department
        const employees = await EmployeeSchema.find({ 'department.name': departmentName });

        employees.forEach(employee => {
            const employeeDepartment = employee.department.find(dep => dep.name === departmentName);
            if (!employeeDepartment) return;

            employeeDepartment.schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                if ((!targetYear || scheduleDate.getFullYear() === targetYear) &&
                    (!targetMonth || scheduleDate.getMonth() === targetMonth) &&
                    (!targetDate || scheduleDate.getTime() === targetDate.getTime())) {

                    schedule.shift_design.forEach(shift => {
                        shiftDesigns.push({
                            employee_id: employee.id,
                            employee_name: employee.name,
                            date: scheduleDate,
                            department_name: departmentName,
                            position: shift.position,
                            shift_code: shift.shift_code,
                            time_slot: shift.time_slot,
                            shift_type: shift.shift_type,
                        });
                    });
                }
            });
        });

        if (shiftDesigns.length === 0) {
            return next(createError(NOT_FOUND, "No shift designs found for the specified criteria in your department."));
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: shiftDesigns
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDateSpecificByManager = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const dateToDelete = new Date(req.body.date);
    const manager_name = req.query.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!employee.department_name.includes(manager.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. manager can only modify schedules of an employee in their department."));
        }

        const specificDateSchedule = employee.schedules.find(schedule =>
            schedule.date.getTime() === dateToDelete.getTime()
        );

        if (!specificDateSchedule) {
            return next(createError(NOT_FOUND, "Date design not found!"));
        }

        // Filter out the shift design for the manager's department
        specificDateSchedule.shift_design = specificDateSchedule.shift_design.filter(design =>
            design.department_name !== manager.department_name
        );

        // If no shift designs remain for the date, remove the date itself
        if (specificDateSchedule.shift_design.length === 0) {
            const index = employee.schedules.indexOf(specificDateSchedule);
            employee.schedules.splice(index, 1);
        }

        await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: "Shift design deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const getAttendanceForManager = async (req, res, next) => {
    try {
        const manager_name = req.query.manager_name;
        const employeeID = req.query.employeeID;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        // Ensure valid year and month inputs
        if (!year || !month || !manager_name) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year, month, and v Name are required parameters",
            });
        }

        // Find the manager's department name
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));
        const departmentName = manager.department_name;

        let date = null;
        if (dateString) {
            date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "Invalid date format",
                });
            }
        }

        const dateRange = date
            ? {
                $gte: new Date(year, month - 1, date.getDate(), 0, 0, 0, 0),
                $lt: new Date(year, month - 1, date.getDate(), 23, 59, 59, 999),
            }
            : {
                $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
                $lt: new Date(year, month, 0, 23, 59, 59, 999),
            };

        let query = {
            department_name: departmentName,
            date: dateRange,
        };

        if (employeeID) {
            const employee = await EmployeeSchema.findOne({ id: employeeID, 'department.name': departmentName });
            if (!employee) {
                return res.status(NOT_FOUND).json({
                    success: false,
                    status: NOT_FOUND,
                    message: "Employee not found in manager's department",
                });
            }
            query.employee_id = employeeID;
        }

        // Fetch attendance based on the constructed query
        const attendances = await AttendanceSchema.find(query);

        return res.status(OK).json({
            success: true,
            status: OK,
            message: attendances,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllEmployeeAttendanceByManager = async (req, res, next) => {
    try {
        const manager_name = req.query.manager_name;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        // Ensure valid year and month inputs
        if (!year || !month) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year and month are required parameters",
            });
        }

        let date = null;

        if (dateString) {
            date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "Invalid date format",
                });
            }
        }

        // Define the date range based on the presence of the date parameter
        const dateRange = date
            ? {
                $gte: new Date(year, month - 1, date, 0, 0, 0, 0),
                $lt: new Date(year, month - 1, date, 23, 59, 59, 999),
            }
            : {
                $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
                $lt: new Date(year, month, 0, 23, 59, 59, 999),
            };

        // Find all employee attendance for the specified date range
        const employeeAttendance = await AttendanceSchema.find({
            date: dateRange,
        });

        const matchedAttendances = employeeAttendance.filter(attendance => {
            const matchedDepartment = attendance.department_name;

            return (manager.department_name === matchedDepartment);
        });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: matchedAttendances,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeAttendanceByManager = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const manager_name = req.query.manager_name;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "manager not found!"));

        // Ensure valid year, month, and employee ID inputs
        if (!year || !month || !employeeID) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year, month, and employee ID are required parameters",
            });
        }

        let date = null;

        if (dateString) {
            date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "Invalid date format",
                });
            }
        }

        // Define the date range based on the presence of the date parameter
        const dateRange = date
            ? {
                $gte: new Date(year, month - 1, date, 0, 0, 0, 0),
                $lt: new Date(year, month - 1, date, 23, 59, 59, 999),
            }
            : {
                $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
                $lt: new Date(year, month, 0, 23, 59, 59, 999),
            };

        // Find employee attendance for the specified date range
        const employeeAttendance = await AttendanceSchema.find({
            employee_id: employeeID,
            date: dateRange,
        });

        const matchedAttendances = employeeAttendance.filter(attendance => {
            const matchedDepartment = attendance.department_name;

            return (manager.department_name === matchedDepartment);
        });

        return res.status(OK).json({
            success: true,
            status: OK,
            message: matchedAttendances,
        });
    } catch (err) {
        next(err);
    }
};
