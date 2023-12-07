import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import { createError } from "../utils/error.js";

export const createDateDesign = async (req, res, next) => {
    const shiftCode = req.body.shift_code;
    const employeeID = req.query.employeeID;
    try {
        const shift = await ShiftSchema.findOne({ code: shiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

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

                // Check for time range conflicts
                const hasConflict = existsTimeRanges.some(range => {
                    return (
                        (newShiftStartTime >= range.startTime && newShiftStartTime < range.endTime) ||
                        (newShiftEndTime > range.startTime && newShiftEndTime <= range.endTime) ||
                        (newShiftStartTime <= range.startTime && newShiftEndTime >= range.endTime)
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

export const getDateDesignInMonth = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const targetMonth = req.body.month;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

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

export const getDateSpecific = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

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

export const deleteDateSpecific = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

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


