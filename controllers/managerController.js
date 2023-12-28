import { createError } from "../utils/error.js";
import { FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";

export const searchSpecificForManager = async (req, res, next) => {
    const { role, details, status } = req.query;
    const managerName = req.query.manager_name;
    try {
        const manager = await EmployeeSchema.findOne({ name: managerName, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const regex = new RegExp(details, 'i');
        const employeeQueryCriteria = {
            'department.name': { $in: manager.department.map(dep => dep.name) },
            'role': role || { $in: ['manager', 'Manager', 'Employee'] },
            ...(status && { 'status': status }),
            ...(details && { '$or': [{ 'id': regex }, { 'name': regex }] })
        };

        const employees = await EmployeeSchema.find(employeeQueryCriteria);

        if (employees.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No matching records found in your departments.",
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: employees,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesSchedulesByManager = async (req, res, next) => {
    const manager_name = req.query.manager_name;
    const targetYear = req.query.year ? parseInt(req.query.year) : null;
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    try {
        // Find the manager and get their department name
        const manager = await EmployeeSchema.findOne({ name: manager_name, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const departmentNames = manager.department.map(dep => dep.name);

        // Find all employees in the manager's departments
        const employees = await EmployeeSchema.find({ 'department.name': { $in: departmentNames } });
        const schedules = [];

        employees.forEach(employee => {
            employee.department.forEach(department => {
                department.schedules.forEach(schedule => {
                    const scheduleDate = new Date(schedule.date);

                    // Check if the schedule matches the time criteria
                    const matchesYear = targetYear === null || scheduleDate.getFullYear() === targetYear;
                    const matchesMonth = targetMonth === null || scheduleDate.getMonth() === targetMonth;
                    const matchesDate = !targetDate || scheduleDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];

                    if (matchesYear && matchesMonth && matchesDate) {
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
        const manager = await EmployeeSchema.findOne({ name: manager_name, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        const departmentNames = manager.department.map(dep => dep.name);

        let employeeQuery = { 'department.name': { $in: departmentNames } };
        if (specificEmployeeID) {
            employeeQuery.id = specificEmployeeID;
        }

        const employees = await EmployeeSchema.find(employeeQuery);

        const results = [];
        for (const employee of employees) {
            for (const dateString of dates) {
                const [month, day, year] = dateString.split('/');
                const dateObj = new Date(year, month - 1, day);

                let stats = await StatsSchema.findOne({
                    employee_id: employee.id,
                    year: year,
                    month: month
                });

                if (!stats) {
                    stats = new StatsSchema({
                        employee_id: employee.id,
                        employee_name: employee.name,
                        year: year,
                        month: month,
                        default_schedule_times: employee.total_time_per_month,
                        realistic_schedule_times: employee.total_time_per_month - shift.time_slot.duration
                    });
                    await stats.save();
                } else {
                    stats.realistic_schedule_times -= shift.time_slot.duration;
                    await stats.save();
                }

                let shiftExistsInAnyDepartment = false;
                employee.department.forEach(dep => {
                    if (departmentNames.includes(dep.name)) {
                        const existingDateInSchedule = dep.schedules.find(s => s.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0]);
                        if (existingDateInSchedule && existingDateInSchedule.shift_design.some(design => design.shift_code === shiftCode)) {
                            shiftExistsInAnyDepartment = true;
                        }
                    }
                });

                if (!shiftExistsInAnyDepartment) {
                    employee.department.forEach(dep => {
                        if (departmentNames.includes(dep.name)) {
                            let schedule = dep.schedules.find(s => s.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0]);
                            if (!schedule) {
                                schedule = {
                                    date: dateObj,
                                    shift_design: [{
                                        position: req.body.position,
                                        shift_code: shiftCode,
                                        time_slot: shift.time_slot,
                                        time_left: stats.realistic_schedule_times
                                    }]
                                };
                                dep.schedules.push(schedule);
                            }

                            schedule.shift_design.push({
                                position: req.body.position,
                                shift_code: shiftCode,
                                time_slot: shift.time_slot,
                                time_left: stats.realistic_schedule_times
                            });
                        }
                    });
                }
            }
            await employee.save();

            results.push({
                employee_id: employee.id,
                employee_name: employee.name,
                email: employee.email,
                departments: employee.department,
                role: employee.role,
            });
        }

        if (results.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "No schedules created. No employees found in the manager's departments."
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
    const specificEmployeeID = req.query.employeeID;

    try {
        const manager = await EmployeeSchema.findOne({ name: managerName, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        const departmentNames = manager.department.map(dep => dep.name);
        const shiftDesigns = [];

        // Adjust the query to optionally include a specific employee ID
        let employeeQuery = { 'department.name': { $in: departmentNames } };
        if (specificEmployeeID) {
            employeeQuery.id = specificEmployeeID;
        }

        const employees = await EmployeeSchema.find(employeeQuery);
        employees.forEach(employee => {
            employee.department.forEach(department => {
                if (departmentNames.includes(department.name)) {
                    department.schedules.forEach(schedule => {
                        const scheduleDate = new Date(schedule.date);

                        if ((!targetYear || scheduleDate.getFullYear() === targetYear) &&
                            (!targetMonth || scheduleDate.getMonth() === targetMonth) &&
                            (!targetDate || scheduleDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0])) {

                            schedule.shift_design.forEach(shift => {
                                shiftDesigns.push({
                                    employee_id: employee.id,
                                    employee_name: employee.name,
                                    date: scheduleDate,
                                    department_name: department.name,
                                    position: shift.position,
                                    shift_code: shift.shift_code,
                                    time_slot: shift.time_slot,
                                    shift_type: shift.shift_type,
                                });
                            });
                        }
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
    const manager_name = req.query.manager_name;
    const employeeID = req.query.employeeID;
    const year = req.query.year;
    const month = req.query.month;
    const dateString = req.query.date;

    try {
        if (!manager_name) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Manager name is required",
            });
        }

        const manager = await EmployeeSchema.findOne({ name: manager_name, role: 'manager' });
        if (!manager) return next(createError(NOT_FOUND, "Manager not found!"));

        let dateRange = {};
        if (year && month) {
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

            dateRange = date
                ? {
                    $gte: new Date(year, month - 1, date.getDate(), 0, 0, 0, 0),
                    $lt: new Date(year, month - 1, date.getDate() + 1, 0, 0, 0, 0),
                }
                : {
                    $gte: new Date(year, month - 1, 1),
                    $lt: new Date(year, month, 1),
                };
        }

        let query = {
            department_name: { $in: manager.department.map(dep => dep.name) }
        };

        if (Object.keys(dateRange).length > 0) {
            query.date = dateRange;
        }

        if (employeeID) {
            query.employee_id = employeeID;
        }

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
