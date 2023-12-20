import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DepartmentSchema from "../models/DepartmentSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
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

        const objectReturn = {
            employee_id: employee.id,
            employee_name: employee.name,
            email: employee.email,
            department_name: departmentName,
            role: employee.role,
            position: req.body.position,
            schedule: employeeDepartment.schedules
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


export const getAllDates = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: employee.schedules,
        });
    } catch (err) {
        next(err);
    }
};

export const getDateDesign = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const targetYear = parseInt(req.query.year);
    const targetMonth = parseInt(req.query.month) - 1;
    const targetDate = req.query.date ? new Date(req.query.date) : null;
    const departmentName = req.query.department_name;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const shiftDesigns = [];

        employee.department.forEach(department => {
            // If department_name query exists and does not match, skip this department
            if (departmentName && department.name !== departmentName) {
                return;
            }

            department.schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                if (
                    scheduleDate.getFullYear() === targetYear &&
                    scheduleDate.getMonth() === targetMonth &&
                    (!targetDate || scheduleDate.getTime() === targetDate.getTime())
                ) {
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

export const getDateDesignInMonth = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const targetYear = parseInt(req.query.year);
    const targetMonth = parseInt(req.query.month) - 1;
    const departmentName = req.query.department_name;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        let monthlyShiftDesigns = [];

        employee.department.forEach(department => {
            // If department_name query exists and does not match, skip this department
            if (departmentName && department.name !== departmentName) {
                return;
            }

            department.schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                if (scheduleDate.getFullYear() == targetYear && scheduleDate.getMonth() == targetMonth) {
                    schedule.shift_design.forEach(shift => {
                        monthlyShiftDesigns.push({
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

        res.status(OK).json({
            success: true,
            status: OK,
            message: monthlyShiftDesigns
        });
    } catch (err) {
        next(err);
    }
};

export const getDateSpecific = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const departmentName = req.query.department_name;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const targetDate = new Date(req.query.date).getTime();
        let foundDate = null;
        let shiftDesigns = [];

        employee.department.forEach(department => {
            // Skip departments that do not match the query if department_name is provided
            if (departmentName && department.name !== departmentName) {
                return;
            }

            department.schedules.forEach(schedule => {
                if (schedule.date.getTime() === targetDate) {
                    foundDate = schedule.date;
                    schedule.shift_design.forEach(shift => {
                        shiftDesigns.push({
                            department_name: department.name,
                            position: shift.position,
                            shift_code: shift.shift_code,
                            time_slot: shift.time_slot,
                            shift_type: shift.shift_type,
                            _id: shift._id
                        });
                    });
                }
            });
        });

        if (!foundDate) {
            return next(createError(NOT_FOUND, "Date not found!"));
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: {
                date: foundDate,
                shift_design: shiftDesigns
            }
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


