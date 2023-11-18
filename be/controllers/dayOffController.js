import { CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DayOffSchema from "../models/DayOffSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const createDayOff = async (req, res, next) => {
    const dayOff_code = req.body.code;

    try {
        const newDayOff = new DayOffSchema({
            code: dayOff_code,
            ...req.body
        });

        await newDayOff.save();
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newDayOff,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllDaysOff = async (req, res, next) => {
    try {
        const days_off = await DayOffSchema.find();
        if (!days_off) return next(createError(NOT_FOUND, "Day off not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: days_off,
        });
    } catch (err) {
        next(err);
    }
};

export const getDayOffByCode = async (req, res, next) => {
    const dayOff_code = req.query.code;
    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: days_off,
        });
    } catch (err) {
        next(err);
    }
};

export const getDayOffByName = async (req, res, next) => {
    const dayOff_name = req.query.name;
    try {
        const day_off = await DayOffSchema.findOne({ name: dayOff_name });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        res.status(OK).json({
            success: true,
            status: OK,
            message: days_off,
        });
    } catch (err) {
        next(err);
    }
};

export const updateDayOff = async (req, res, next) => {
    const dayOff_code = req.query.code;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        const updateDayOff = await DayOffSchema.findOneAndUpdate(
            dayOff_code,
            { $set: req.body },
            { $new: true },
        )

        await updateDayOff.save();
        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDayOff,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDayOffByCode = async (req, res, next) => {
    const dayOff_code = req.query.code;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        await DayOffSchema.findOneAndDelete({ code: dayOff_code });
        res.status(OK).json({
            success: true,
            status: OK,
            message: "Day-Off was successfully deleted",
        });
    } catch (err) {
        next(err);
    }
};

export const addMemberDayOff = async (req, res, next) => {
    const dayOff_code = req.query.code;
    const employeeID = req.body.employeeID;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });

        if (!day_off) return next(createError(NOT_FOUND, "Day off not found!"))

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        // Add the employee ID to the members array
        day_off.members.push(employeeID);

        // Save the updated day_off
        const updateDayOff = await day_off.save();

        res.status(OK).json({
            success: true,
            status: OK,
            message: updateDayOff,
        });
    } catch (err) {
        next(err);
    }
};

