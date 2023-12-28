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

            let shiftExistsInDepartment = employeeDepartment.schedules.some(schedule =>
                schedule.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0] &&
                schedule.shift_design.some(design => design.shift_code === shiftCode)
            );

            if (!shiftExistsInDepartment) {
                let schedule = employeeDepartment.schedules.find(s => s.date.toISOString().split('T')[0] === dateObj.toISOString().split('T')[0]);
                if (!schedule) {
                    schedule = {
                        date: dateObj,
                        shift_design: [{
                            position: req.body.position,
                            shift_code: shift.code,
                            time_slot: shift.time_slot,
                            time_left: stats.realistic_schedule_times
                        }]
                    };
                    employeeDepartment.schedules.push(schedule);
                }
                schedule.shift_design.push({
                    position: req.body.position,
                    shift_code: shift.code,
                    time_slot: shift.time_slot,
                    time_left: stats.realistic_schedule_times
                });
            } else {
                res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: `Shift with code ${shiftCode} already exists for ${dateString} in the department.`
                });
                continue;
            }
        }

        await employee.save();

        const objectReturn = {
            employee_id: employee.id,
            employee_name: employee.name,
            email: employee.email,
            department_name: departmentName,
            role: employee.role,
            position: req.body.position,
            schedule: employeeDepartment.schedules,
        };

        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: objectReturn
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


