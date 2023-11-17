import { CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import DayOffSchema from "../models/DayOffSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";

export const createDayOff = async (req, res, next) => {
    const dayOff_code = req.body.code;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (day_off) {
            res.status(FORBIDDEN).json("Day off already exists");
            return;
        }

        const newDayOff = new DayOffSchema({
            code: dayOff_code,
            ...req.body
        });

        await newDayOff.save();
        res.status(CREATED).json(newDayOff);
    } catch (err) {
        next(err);
    }
};

export const getAllDaysOff = async (req, res, next) => {
    try {
        const days_off = await DayOffSchema.find();
        if (!days_off) {
            res.status(NOT_FOUND).json("Not Found any day off");
        }

        res.status(OK).json(days_off)
    } catch (err) {
        next(err);
    }
};

export const getDayOffByCode = async (req, res, next) => {
    const dayOff_code = req.query.code;
    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) {
            res.status(NOT_FOUND).json("Not Found any day off");
        }

        res.status(OK).json(day_off)
    } catch (err) {
        next(err);
    }
};

export const getDayOffByName = async (req, res, next) => {
    const dayOff_name = req.query.name;
    try {
        const day_off = await DayOffSchema.findOne({ name: dayOff_name });
        if (!day_off) {
            res.status(NOT_FOUND).json("Not Found any day off");
        }

        res.status(OK).json(day_off)
    } catch (err) {
        next(err);
    }
};

export const updateDayOff = async (req, res, next) => {
    const dayOff_code = req.query.code;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) {
            res.status(NOT_FOUND).json("Not Found any day off");
        }

        const updateDayOff = await DayOffSchema.findOneAndUpdate(
            dayOff_code,
            { $set: req.body },
            { $new: true },
        )

        await updateDayOff.save();
        res.status(OK).json(updateDayOff);
    } catch (err) {
        next(err);
    }
};

export const deleteDayOffByCode = async (req, res, next) => {
    const dayOff_code = req.query.code;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });
        if (!day_off) {
            res.status(NOT_FOUND).json("Not Found any day off");
        }

        await DayOffSchema.findOneAndDelete({ code: dayOff_code });
        res.status(OK).json("Day off deleted successfully");
    } catch (err) {
        next(err);
    }
};

export const addMemberDayOff = async (req, res, next) => {
    const dayOff_code = req.query.code;
    const employeeID = req.body.employeeID;

    try {
        const day_off = await DayOffSchema.findOne({ code: dayOff_code });

        if (!day_off) {
            res.status(NOT_FOUND).json("Not Found any day off");
        }

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) {
            res.status(NOT_FOUND).json("Not Found any employee");
        }

        // Add the employee ID to the members array
        day_off.members.push(employeeID);

        // Save the updated day_off
        const updatedDayOff = await day_off.save();

        res.status(OK).json(updateDayOff);
    } catch (err) {
        next(err);
    }
};

