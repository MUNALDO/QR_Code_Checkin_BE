import { createError } from "../utils/error.js";
import { BAD_REQUEST, CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import AdminSchema from "../models/AdminSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import cron from 'node-cron';
import DepartmentSchema from "../models/DepartmentSchema.js";

export const updateEmployeeByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const updateEmployee = await EmployeeSchema.findOneAndUpdate(
            { id: employeeID },
            { $set: req.body },
            { new: true }
        );

        if (!updateEmployee) {
            return next(createError(NOT_FOUND, "Employee not found!"));
        }
        if (updateEmployee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const department = await DepartmentSchema.findOne({ name: updateEmployee.department_name });
        if (!department) {
            return next(createError(NOT_FOUND, "Department not found!"));
        }

        if (!updateEmployee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
        }

        const employeeIndex = department.members.findIndex(member => member.id === updateEmployee.id);
        if (employeeIndex !== -1) {
            department.members[employeeIndex] = {
                id: updateEmployee.id,
                name: updateEmployee.name,
                email: updateEmployee.email,
                department_name: updateEmployee.department_name,
                role: updateEmployee.role,
                position: updateEmployee.position,
                status: updateEmployee.status,
            };

            await department.save();
            await updateEmployee.save();
            res.status(OK).json({
                success: true,
                status: OK,
                message: updateEmployee,
            });
        } else {
            res.status(NOT_FOUND).json({
                success: true,
                status: OK,
                message: "Can not found employee in department",
            });
        }
    } catch (err) {
        next(err);
    }
};

export const madeEmployeeInactiveByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
        }

        const inactiveDate = new Date(req.body.inactive_day);
        const currentDate = new Date();

        // Check if the inactive date is in the future
        if (inactiveDate > currentDate) {
            const day = inactiveDate.getDate();
            const month = inactiveDate.getMonth();
            const year = inactiveDate.getFullYear();

            // Schedule the status update
            cron.schedule(`0 0 0 ${day} ${month} ${year}`, async () => {
                employee.status = "inactive";
                await employee.save();
            });

            res.status(OK).json({
                success: true,
                status: OK,
                message: "Employee will be made inactive on the specified date."
            });
        } else {
            return next(createError(BAD_REQUEST, "Inactive day must be in the future."));
        }
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeByIdByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        const department = await DepartmentSchema.findOne({ name: employee.department_name });
        if (!department) return next(createError(NOT_FOUND, "Department not found!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
        }

        department.members = department.members.filter(member => member.id !== employee.id);
        await department.save();

        await EmployeeSchema.findOneAndDelete({ id: employeeID });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Employee deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

export const getAllEmployees = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.find({ department_name: inhaber.department_name });
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
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        if (!query) {
            const employee = await EmployeeSchema.find({ department_name: inhaber.department_name });
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
            const filteredEmployees = employeeName.filter(employee => employee.department_name.includes(inhaber.department_name));
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeID.length !== 0) {
            const filteredEmployees = employeeID.filter(employee => employee.department_name.includes(inhaber.department_name));
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeRole.length !== 0) {
            const filteredEmployees = employeeRole.filter(employee => employee.department_name.includes(inhaber.department_name));
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeePosition.length !== 0) {
            const filteredEmployees = employeePosition.filter(employee => employee.department_name.includes(inhaber.department_name));
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

export const getEmployeesByDateByInhaber = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);
        const inhaberName = req.query.inhaber_name;

        const inhaber = await AdminSchema.findOne({ name: inhaberName });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employees = await EmployeeSchema.find();
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return schedule.date.getTime() === targetDate.getTime();
            });

            return (
                matchedSchedules.length > 0 &&
                employee.department_name.includes(inhaber.department_name));
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

export const getEmployeesByDateAndShiftByInhaber = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);
        const targetShiftCode = req.body.shift_code;
        const inhaberName = req.query.inhaber_name;

        const inhaber = await AdminSchema.findOne({ name: inhaberName });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const shift = await ShiftSchema.findOne({ code: targetShiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        const employees = await EmployeeSchema.find();
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return (
                    schedule.date.getTime() === targetDate.getTime() &&
                    schedule.shift_design.some(shift => shift.shift_code === targetShiftCode)
                );
            });

            return (
                matchedSchedules.length > 0 &&
                employee.department_name.includes(inhaber.department_name)
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

export const createDateDesignByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const shiftCode = req.body.shift_code;
    const employeeID = req.query.employeeID;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervene with an employee in their department."));
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
                const existsTimeRanges = existingDateInSchedules.shift_design.map(shift => {
                    const totalNumber = shift.time_slot.total_number;
                    const startTime = shift.time_slot.detail[0].start_time;
                    const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
                    return { startTime, endTime };
                });

                const newShiftTotalNumber = shift.time_slot.total_number;
                const newShiftStartTime = shift.time_slot.detail[0].start_time;
                const newShiftEndTime = newShiftTotalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
                // const newShiftTimeRange = { newShiftStartTime, newShiftEndTime };
                // console.log(newShiftTimeRange);

                const convertToMinutes = (timeString) => {
                    const [hours, minutes] = timeString.split(':').map(Number);
                    return hours * 60 + minutes;
                };

                const hasConflict = existsTimeRanges.some(range => {
                    const existingStartTime = convertToMinutes(range.startTime);
                    const existingEndTime = convertToMinutes(range.endTime);
                    const newStartTime = convertToMinutes(newShiftStartTime);
                    const newEndTime = convertToMinutes(newShiftEndTime);

                    return (
                        (newStartTime >= existingStartTime && newStartTime < existingEndTime) ||
                        (newEndTime > existingStartTime && newEndTime <= existingEndTime)
                    );
                });

                if (hasConflict) {
                    // Time range conflict
                    res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Time range conflict with existing shifts for the day",
                    });
                } else {
                    // If there is no existing shift_design with the same shiftCode, create a new shift_design
                    const existsTimeRanges = existingDateInSchedules.shift_design.map(shift => {
                        const totalNumber = shift.time_slot.total_number;
                        const startTime = shift.time_slot.detail[0].start_time;
                        const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
                        return { startTime, endTime };
                    });

                    const newShiftTotalNumber = shift.time_slot.total_number;
                    const newShiftStartTime = shift.time_slot.detail[0].start_time;
                    const newShiftEndTime = newShiftTotalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
                    // const newShiftTimeRange = { newShiftStartTime, newShiftEndTime };
                    // console.log(newShiftTimeRange);

                    const convertToMinutes = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return hours * 60 + minutes;
                    };

                    const hasConflict = existsTimeRanges.some(range => {
                        const existingStartTime = convertToMinutes(range.startTime);
                        const existingEndTime = convertToMinutes(range.endTime);
                        const newStartTime = convertToMinutes(newShiftStartTime);
                        const newEndTime = convertToMinutes(newShiftEndTime);

                        return (
                            (newStartTime >= existingStartTime && newStartTime < existingEndTime) ||
                            (newEndTime > existingStartTime && newEndTime <= existingEndTime)
                        );
                    });

                    if (hasConflict) {
                        // Time range conflict
                        res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: "Time range conflict with existing shifts for the day",
                        });
                    } else {
                        // No time range conflict, add the new shift design
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
            }
        }
    } catch (err) {
        next(err);
    }
};

export const createMultipleDateDesignsByInhaber = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    const shiftCode = req.body.shift_code;
    const employeeID = req.query.employeeID;
    const dates = req.body.dates;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));
        if (employee.status === "inactive") return next(createError(NOT_FOUND, "Employee not active!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervene with an employee in their department."));
        }

        for (const date of dates) {
            const dateObj = new Date(date);
            const existingDateInSchedule = employee.schedules.find(schedule =>
                schedule.date.getTime() === dateObj.getTime()
            );

            if (existingDateInSchedule) {
                // Skip if shift design already exists for this date
                const existingShiftDesign = existingDateInSchedule.shift_design.find(design =>
                    design.shift_code === shiftCode
                );
                if (existingShiftDesign) {
                    // Shift design already exists for the day
                    res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Shift design already exists for the day"
                    });
                };

                // Check for time range conflicts
                const hasConflict = checkForTimeRangeConflict(existingDateInSchedule, shift);
                if (hasConflict) {
                    // Time range conflict
                    res.status(BAD_REQUEST).json({
                        success: false,
                        status: BAD_REQUEST,
                        message: "Time range conflict with existing shifts for the day",
                    });
                };

                existingDateInSchedule.shift_design.push({
                    department_name: inhaber.department_name,
                    shift_code: shift.code,
                    time_slot: shift.time_slot,
                    shift_type: req.body.shift_type
                });
            } else {
                // Create a new schedule entry for the date
                employee.schedules.push({
                    date: dateObj,
                    shift_design: [{
                        department_name: inhaber.department_name,
                        shift_code: shift.code,
                        time_slot: shift.time_slot,
                        shift_type: req.body.shift_type
                    }]
                });
            }
        }

        await employee.save();
        const objectReturn = {
            employee_id: employee.id,
            employee_name: employee.name,
            email: employee.email,
            department_name: employee.department_name,
            role: employee.role,
            position: employee.position,
            schedule: employee.schedules
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

function checkForTimeRangeConflict(schedule, shift) {
    const newShiftStartTime = convertToMinutes(shift.time_slot.detail[0].start_time);
    const newShiftEndTime = convertToMinutes(shift.time_slot.total_number === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time);

    return schedule.shift_design.some(existingShift => {
        const existingStartTime = convertToMinutes(existingShift.time_slot.detail[0].start_time);
        const existingEndTime = convertToMinutes(existingShift.time_slot.total_number === 1 ? existingShift.time_slot.detail[0].end_time : existingShift.time_slot.detail[1].end_time);

        return (
            (newShiftStartTime >= existingStartTime && newShiftStartTime < existingEndTime) ||
            (newShiftEndTime > existingStartTime && newShiftEndTime <= existingEndTime)
        );
    });
}

function convertToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

export const getAllDatesByInhaber = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only view schedules of an employee in their department."));
        }

        const matchedSchedules = employee.schedules.map(schedule => {
            const matchedShiftDesigns = schedule.shift_design.filter(design => design.department_name === inhaber.department_name);
            return matchedShiftDesigns.length > 0 ? { date: schedule.date, shift_design: matchedShiftDesigns } : null;
        }).filter(schedule => schedule !== null);

        res.status(OK).json({
            success: true,
            status: OK,
            message: matchedSchedules,
        });
    } catch (err) {
        next(err);
    }
};

export const getDateDesignInMonthByInhaber = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const inhaber_name = req.query.inhaber_name;
    const targetMonth = req.query.month;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only view schedules of an employee in their department."));
        }

        // Filter schedules for the target month and matching department
        const schedulesInMonth = employee.schedules.filter(schedule => {
            const scheduleMonth = schedule.date.getMonth() + 1;
            return scheduleMonth == targetMonth;
        }).map(schedule => {
            const matchedShiftDesigns = schedule.shift_design.filter(design => design.department_name === inhaber.department_name);
            return matchedShiftDesigns.length > 0 ? { date: schedule.date, shift_design: matchedShiftDesigns } : null;
        }).filter(schedule => schedule !== null);

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

export const getDateSpecificByInhaber = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const inhaber_name = req.query.inhaber_name;
    const targetDate = new Date(req.query.date);
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only view schedules of an employee in their department."));
        }

        const specificDateSchedule = employee.schedules.find(schedule => {
            return schedule.date.getTime() === targetDate.getTime();
        });

        if (!specificDateSchedule) {
            return next(createError(NOT_FOUND, "Date not found!"));
        }

        // Filter the shift designs by the inhaber's department
        const filteredShiftDesigns = specificDateSchedule.shift_design.filter(design => {
            return design.department_name === inhaber.department_name;
        });

        const result = {
            date: specificDateSchedule.date,
            shift_design: filteredShiftDesigns
        };

        res.status(OK).json({
            success: true,
            status: OK,
            message: result,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDateSpecificByInhaber = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const dateToDelete = new Date(req.body.date);
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only modify schedules of an employee in their department."));
        }

        const specificDateSchedule = employee.schedules.find(schedule =>
            schedule.date.getTime() === dateToDelete.getTime()
        );

        if (!specificDateSchedule) {
            return next(createError(NOT_FOUND, "Date design not found!"));
        }

        // Filter out the shift design for the inhaber's department
        specificDateSchedule.shift_design = specificDateSchedule.shift_design.filter(design =>
            design.department_name !== inhaber.department_name
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


export const getAllEmployeeAttendanceByInhaber = async (req, res, next) => {
    try {
        const inhaber_name = req.query.inhaber_name;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

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

            // Check if the date is valid
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

            return (inhaber.department_name === matchedDepartment);
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

export const getEmployeeAttendanceByInhaber = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const inhaber_name = req.query.inhaber_name;
        const year = req.query.year;
        const month = req.query.month;
        const dateString = req.query.date;

        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

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

            // Check if the date is valid
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

            return (inhaber.department_name === matchedDepartment);
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

export const getSalaryForEmployeeByInhaber = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const inhaber_name = req.query.inhaber_name;
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);

        if (!year || !month || !employeeID || !inhaber_name) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year, month, employee ID and inhaber name are required parameters",
            });
        }

        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        if (!employee.department_name.includes(inhaber.department_name)) {
            return next(createError(FORBIDDEN, "Permission denied. Inhaber can only intervention an employee in their department."));
        }

        const salary = employee.salary.find(stat =>
            stat.year === year && stat.month === month
        );

        const objectReturn = {
            employee_id: employee.id,
            employee_name: employee.name,
            email: employee.email,
            department_name: employee.department_name,
            role: employee.role,
            position: employee.position,
            salary: salary
        }

        if (salary) {
            return res.status(OK).json({
                success: true,
                status: OK,
                message: objectReturn,
            });
        } else {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "Salary record not found for the specified month and year.",
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getSalaryForAllEmployeesByInhaber = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year);
        const month = parseInt(req.query.month);
        const inhaber_name = req.query.inhaber_name;

        if (!year || !month || !inhaber_name) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year, month and inhaber name are required parameters",
            });
        }
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) return next(createError(NOT_FOUND, "Inhaber not found!"));

        const employees = await EmployeeSchema.find();
        if (!employees) return next(createError(NOT_FOUND, "Employees not found!"));

        const matchedEmployees = employees.filter(employee => {
            return (employee.department_name.includes(inhaber.department_name));
        })

        let salaries = [];

        for (const employee of matchedEmployees) {
            const salary = employee.salary.find(stat =>
                stat.year === year && stat.month === month
            );

            if (salary) {
                salaries.push({
                    employee_id: employee.id,
                    employee_name: employee.name,
                    email: employee.email,
                    department_name: employee.department_name,
                    role: employee.role,
                    position: employee.position,
                    salary: salary
                });
            } else {
                salaries.push({
                    employee_id: employee.id,
                    employee_name: employee.name,
                    email: employee.email,
                    department_name: employee.department_name,
                    role: employee.role,
                    position: employee.position,
                    salary: null,
                    message: "Salary record not found for the specified month and year."
                });
            }
        }
        return res.status(OK).json({
            success: true,
            status: OK,
            salaries: salaries,
        });
    } catch (err) {
        next(err);
    }
};