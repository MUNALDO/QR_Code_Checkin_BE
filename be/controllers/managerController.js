import { createError } from "../utils/error.js";
import { FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";

export const getAllEmployees = async (req, res, next) => {
    const manager_name = req.query.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.find({ department_name: manager.department_name });
        if (!employee) return next(createError(NOT_FOUND, "Employees of this department not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: employee,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeSpecific = async (req, res, next) => {
    const query = req.query.query;
    const manager_name = req.query.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        if (!query) {
            const employee = await EmployeeSchema.find({ department_name: manager.department_name });
            if (!employee) return next(createError(NOT_FOUND, "Employees of this department not found!"))

            res.status(OK).json({
                success: true,
                status: OK,
                message: employee,
            });
        }
        const regex = new RegExp(query, 'i');
        const employeeName = await EmployeeSchema.find({ name: regex });
        const employeeID = await EmployeeSchema.find({ id: regex });
        const employeeRole = await EmployeeSchema.find({ role: query });
        const employeePosition = await EmployeeSchema.find({ position: query });

        if (employeeName.length !== 0) {
            const filteredEmployees = employeeName.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeID.length !== 0) {
            const filteredEmployees = employeeID.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeRole.length !== 0) {
            const filteredEmployees = employeeRole.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeePosition.length !== 0) {
            const filteredEmployees = employeePosition.filter(employee => employee.department_name === manager.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: [],
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesByDateByManager = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);
        const managerName = req.query.manager_name;

        // Find the manager
        const manager = await AdminSchema.findOne({ name: managerName });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        // Find all employees
        const employees = await EmployeeSchema.find();

        // Filter employees based on the target date, shift code, and department
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return schedule.date.getTime() === targetDate.getTime();
            });

            return (
                matchedSchedules.length > 0 &&
                manager.department_name === employee.department_name
            );
        });

        if (matchedEmployees.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No employees found for the specified criteria.",
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: matchedEmployees,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesByDateAndShiftByManager = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);
        const targetShiftCode = req.body.shift_code;
        const managerName = req.query.manager_name;

        // Find the manager
        const manager = await AdminSchema.findOne({ name: managerName });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const shift = await ShiftSchema.findOne({ code: targetShiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        // Find all employees
        const employees = await EmployeeSchema.find();

        // Filter employees based on the target date, shift code, and department
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return (
                    schedule.date.getTime() === targetDate.getTime() &&
                    schedule.shift_design.some(shift => shift.shift_code === targetShiftCode)
                );
            });

            return (
                matchedSchedules.length > 0 &&
                manager.department_name === employee.department_name
            );
        });

        if (matchedEmployees.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No employees found for the specified criteria.",
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: matchedEmployees,
        });
    } catch (err) {
        next(err);
    }
};

export const createDateDesignByManager = async (req, res, next) => {
    const manager_name = req.query.manager_name;
    const shiftCode = req.body.shift_code;
    const employeeID = req.query.employeeID;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. manager can only intervention an employee in their department."));
        }

        const existingDateInSchedules = employee.schedules.find(schedule => {
            return schedule.date.getTime() === new Date(req.body.date).getTime();
        });

        if (!existingDateInSchedules) {
            // date not exists
            employee.schedules.push({
                date: new Date(req.body.date),
                shift_design: [{
                    shift_code: shift.code,
                    time_slot: shift.time_slot,
                    shift_type: req.body.shift_type
                }]
            });
            await employee.save();
            res.status(CREATED).json({
                success: true,
                status: CREATED,
                message: employee,
            });
        } else {
            // date exists
            const existingShiftDesign = existingDateInSchedules.shift_design.find(design => {
                return design.shift_code === shiftCode
            });

            if (existingShiftDesign) {
                // Shift design already exists for the day
                res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "Shift design already exists for the day"
                });
            } else {
                // If there is no existing shift_design with the same shiftCode, create a new shift_design
                existingDateInSchedules.shift_design.push({
                    shift_code: shift.code,
                    time_slot: shift.time_slot,
                    shift_type: req.body.shift_type
                });
                await employee.save();
                res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: employee,
                });
            }
        }
    } catch (err) {
        next(err);
    }
};

export const getAllDatesByManager = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const manager_name = req.query.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. manager can only intervention an employee in their department."));
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: employee.schedules,
        });
    } catch (err) {
        next(err);
    }
};

export const getDateDesignInMonthByManager = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const manager_name = req.query.manager_name;
    const targetMonth = req.body.month;

    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. manager can only intervene with an employee in their department."));
        }

        // Filter schedules for the target month
        const schedulesInMonth = employee.schedules.filter(schedule => {
            const scheduleMonth = schedule.date.getMonth() + 1;
            return scheduleMonth === targetMonth;
        });

        if (schedulesInMonth.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: `No schedules found for the employee in the specified month.`,
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: schedulesInMonth,
        });
    } catch (err) {
        next(err);
    }
};

export const getDateSpecificByManager = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const manager_name = req.query.manager_name;
    try {
        const manager = await AdminSchema.findOne({ name: manager_name });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. manager can only intervention an employee in their department."));
        }

        const date = employee.schedules.find(schedule => {
            return schedule.date.getTime() === new Date(req.body.date).getTime();
        });
        if (!date) return next(createError(NOT_FOUND, "Date not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: date,
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
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (manager.department_name !== employee.department_name) {
            return next(createError(FORBIDDEN, "Permission denied. manager can only intervention an employee in their department."));
        }

        const existingDateIndex = employee.schedules.findIndex(schedule => {
            return schedule.date.getTime() === dateToDelete.getTime();
        });

        if (existingDateIndex === -1) {
            return next(createError(NOT_FOUND, "Date design not found!"));
        }

        // Remove the date design
        employee.schedules.splice(existingDateIndex, 1);

        await employee.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: employee,
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
        const date = req.query.date;

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
        const date = req.query.date;

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
