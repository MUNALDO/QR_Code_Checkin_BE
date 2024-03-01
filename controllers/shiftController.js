import { CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import ShiftSchema from "../models/ShiftSchema.js";
import { createError } from "../utils/error.js";

export const createShift = async (req, res, next) => {
    const shift_code = req.body.code;
    const start_time = req.body.time_slot?.start_time;
    const end_time = req.body.time_slot?.end_time;
    try {
        const [startHours, startMinutes] = start_time.split(":").map(Number);
        const [endHours, endMinutes] = end_time.split(":").map(Number);

        let durationHours = endHours - startHours;
        let durationMinutes = endMinutes - startMinutes;

        if (durationMinutes < 0) {
            durationHours -= 1;
            durationMinutes += 60;
        }

        const duration = durationHours + durationMinutes / 60;
        const newShift = new ShiftSchema({
            code: shift_code,
            ...req.body,
            time_slot: {
                ...req.body.time_slot,
                duration: Number(duration.toFixed(2))
            }
        });

        await newShift.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newShift,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllShifts = async (req, res, next) => {
    try {
        const shifts = await ShiftSchema.find();
        if (!shifts) return next(createError(NOT_FOUND, "Shift not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: shifts,
        });
    } catch (err) {
        next(err);
    }
};

export const getShiftByCode = async (req, res, next) => {
    const shift_code = req.query.code;
    try {
        const shift = await ShiftSchema.findOne({ code: shift_code });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: shift,
        });
    } catch (err) {
        next(err);
    }
};

export const getShiftByName = async (req, res, next) => {
    const shift_name = req.query.name;
    try {
        const shift = await ShiftSchema.findOne({ name: shift_name });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: shift,
        });
    } catch (err) {
        next(err);
    }
};

export const updateShift = async (req, res, next) => {
    const shift_code = req.query.code;
    try {
        // Step 1: Find and update the shift
        const shift = await ShiftSchema.findOne({ code: shift_code });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        const start_time = req.body.time_slot?.start_time || shift.time_slot.start_time;
        const end_time = req.body.time_slot?.end_time || shift.time_slot.end_time;

        const [startHours, startMinutes] = start_time.split(":").map(Number);
        const [endHours, endMinutes] = end_time.split(":").map(Number);

        let durationHours = endHours - startHours;
        let durationMinutes = endMinutes - startMinutes;

        if (durationMinutes < 0) {
            durationHours -= 1;
            durationMinutes += 60;
        }

        const duration = durationHours + durationMinutes / 60;

        const updatedShift = {
            ...req.body,
            time_slot: {
                ...req.body.time_slot,
                start_time: start_time,
                end_time: end_time,
                duration: Number(duration.toFixed(2))
            }
        };
        const updateShiftResult = await ShiftSchema.findOneAndUpdate(
            { code: shift_code },
            { $set: updatedShift },
            { new: true }
        );

        // Step 2: Update future employee schedules
        const today = new Date();
        await EmployeeSchema.updateMany(
            { "department.schedules.date": { $gte: today }, "department.schedules.shift_design.shift_code": shift_code },
            { "$set": { "department.$[].schedules.$[sched].shift_design.$[design].time_slot": updatedShift.time_slot } },
            { arrayFilters: [{ "sched.date": { $gte: today } }, { "design.shift_code": shift_code }] }
        );

        // Step 3: Update future attendance records
        await AttendanceSchema.updateMany(
            { date: { $gte: today }, "shift_info.shift_code": shift_code },
            { "$set": { "shift_info.time_slot": updatedShift.time_slot } }
        );

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateShiftResult,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteShiftByCode = async (req, res, next) => {
    const shift_code = req.query.code;
    try {
        const shift = await ShiftSchema.findOne({ code: shift_code });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"));

        const today = new Date();

        // Fetch employees with future schedules including the shift to be deleted
        const employees = await EmployeeSchema.find({
            "department.schedules": {
                $elemMatch: {
                    "date": { $gte: today },
                    "shift_design.shift_code": shift_code
                }
            }
        });

        // Iterate over each employee and their schedules to remove the shift
        for (let employee of employees) {
            employee.department.forEach(department => {
                department.schedules = department.schedules.map(schedule => {
                    if (schedule.date >= today) {
                        // Filter out the shift to be deleted
                        schedule.shift_design = schedule.shift_design.filter(shift => shift.shift_code !== shift_code);
                    }
                    return schedule;
                });
            });

            // Save the modified employee document
            await employee.save();
        }

        // Delete future attendance records related to the shift
        await AttendanceSchema.deleteMany({
            date: { $gte: today },
            "shift_info.shift_code": shift_code
        });

        // Delete the shift
        await ShiftSchema.findOneAndDelete({ code: shift_code });

        res.status(OK).json({
            success: true,
            status: OK,
            message: "Shift was deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};
