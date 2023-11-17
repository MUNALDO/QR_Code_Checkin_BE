import { CREATED, FORBIDDEN, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import ShiftSchema from "../models/ShiftSchema.js";

export const createShift = async (req, res, next) => {
    const shift_code = req.body.code;

    try {
        const shift = await ShiftSchema.findOne({ code: shift_code });
        if (shift) {
            res.status(FORBIDDEN).json("Shift already exists", shift);
        }

        const newShift = new ShiftSchema({
            code: shift_code,
            ...req.body,
        });

        await newShift.save();
        res.status(CREATED).json(newShift);
    } catch (err) {
        next(err);
    }
};

export const getAllShifts = async (req, res, next) => {
    try {
        const shifts = await ShiftSchema.find();
        if (!shifts) {
            res.status(NOT_FOUND).json("Not Found any shift");
        }

        res.status(OK).json(shifts)
    } catch (err) {
        next(err);
    }
};

export const getShiftByCode = async (req, res, next) => {
    const shift_code = req.query.code;
    try {
        const shift = await ShiftSchema.findOne({ code: shift_code });
        if (!shift) {
            res.status(NOT_FOUND).json("Not Found any shift");
        }

        res.status(OK).json(shift)
    } catch (err) {
        next(err);
    }
};

export const getShiftByName = async (req, res, next) => {
    const shift_name = req.query.name;
    try {
        const shift = await ShiftSchema.findOne({ name: shift_name });
        if (!shift) {
            res.status(NOT_FOUND).json("Not Found any shift");
        }

        res.status(OK).json(shift)
    } catch (err) {
        next(err);
    }
};

export const updateShift = async (req, res, next) => {
    const shift_code = req.query.code;

    try {
        const shift = await ShiftSchema.findOne({ code: shift_code });
        if (!shift) {
            res.status(NOT_FOUND).json("Not Found any shift");
        }

        const updateShift = await ShiftSchema.findOneAndUpdate(
            shift_code,
            { $set: req.body },
            { $new: true },
        )

        await updateShift.save();
        res.status(OK).json(updateShift);
    } catch (err) {
        next(err);
    }
};

export const deleteShiftByCode = async (req, res, next) => {
    const shift_code = req.query.code;

    try {
        const shift = await ShiftSchema.findOne({ code: shift_code });
        if (!shift) {
            res.status(NOT_FOUND).json("Not Found any shift");
        }

        await ShiftSchema.findOneAndDelete({ code: shift_code });
        res.status(OK).json("shift deleted successfully");
    } catch (err) {
        next(err);
    }
};