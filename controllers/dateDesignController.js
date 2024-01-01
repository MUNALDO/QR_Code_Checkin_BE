import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import StatsSchema from "../models/StatsSchema.js";
import { createError } from "../utils/error.js";

export const createMultipleDateDesigns = async (req, res, next) => {
    const shiftCode = req.body.shift_code;
    const employeeID = req.query.employeeID;
    const departmentName = req.query.department_name;
    const dates = req.body.dates;
    try {
        const department = await DepartmentSchema.findOne({ name: departmentName });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const employeeDepartment = employee.department.find(dep => dep.name === departmentName);
        if (!employeeDepartment) return next(createError(NOT_FOUND, "Employee does not belong to the specified department!"));

        for (const date of dates) {
            const dateObj = new Date(date);

            let shiftExistsInAnyDepartment = false;
            employee.department.forEach(dep => {
                const existingDateInSchedule = dep.schedules.find(schedule =>
                    schedule.date.getTime() === dateObj.getTime()
                );
                if (existingDateInSchedule && existingDateInSchedule.shift_design.some(design => design.shift_code === shiftCode)) {
                    shiftExistsInAnyDepartment = true;
                }
            });

            if (shiftExistsInAnyDepartment) {
                res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: `Shift already exists for ${date} in one of the departments`
                });
                continue;
            }

            let existingDateInDepartmentSchedule = employeeDepartment.schedules.find(schedule =>
                schedule.date.getTime() === dateObj.getTime()
            );

            if (!existingDateInDepartmentSchedule) {
                existingDateInDepartmentSchedule = {
                    date: dateObj,
                    shift_design: [{
                        position: req.body.position,
                        shift_code: shift.code,
                        time_slot: shift.time_slot,
                    }]
                };
                employeeDepartment.schedules.push(existingDateInDepartmentSchedule);
            }

            existingDateInDepartmentSchedule.shift_design.push({
                position: req.body.position,
                shift_code: shift.code,
                time_slot: shift.time_slot,
            });
        }

        await employee.save();

        const objectReturn = {
            employee_id: employee.id,
            employee_name: employee.name,
            email: employee.email,
            department_name: departmentName,
            role: employee.role,
            position: req.body.position,
            schedule: employeeDepartment.schedules
        };

        let totalDuration = 0;
        totalDuration = dates.length * shift.time_slot.duration;

        // Find or create stats for the current month and year
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        let stats = await StatsSchema.findOne({
            employee_id: employeeID,
            year: currentYear,
            month: currentMonth
        });

        if (stats) {
            stats.realistic_schedule_times = stats.realistic_schedule_times - totalDuration;
            await stats.save();
        } else {
            stats = new StatsSchema({
                employee_id: employee.id,
                employee_name: employee.name,
                year: currentYear,
                month: currentMonth,
                default_schedule_times: employee.total_time_per_month,
                realistic_schedule_times: employee.total_time_per_month - totalDuration
            });
            await stats.save();
        }

        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: objectReturn,
            time_left: stats.realistic_schedule_times
        });
    } catch (err) {
        next(err);
    }
};

export const getDateDesign = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const targetYear = req.query.year ? parseInt(req.query.year) : null;
    const targetMonth = req.query.month ? parseInt(req.query.month) - 1 : null;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    const departmentName = req.query.department_name;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const shiftDesigns = [];

        employee.department.forEach(department => {
            if (departmentName && department.name !== departmentName) {
                return;
            }

            department.schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                if ((!targetYear || scheduleDate.getFullYear() === targetYear) &&
                    (!targetMonth || scheduleDate.getMonth() === targetMonth) &&
                    (!targetDate || scheduleDate.getTime() === targetDate.getTime())) {

                    schedule.shift_design.forEach(shift => {
                        shiftDesigns.push({
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
        });

        if (shiftDesigns.length === 0) {
            return next(createError(NOT_FOUND, "No shift designs found for the specified criteria!"));
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

export const deleteDateSpecific = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const existingDateIndex = employee.schedules.findIndex(schedule => {
            return schedule.date.getTime() === new Date(req.body.date).getTime();
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
            message: "Date design deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};


