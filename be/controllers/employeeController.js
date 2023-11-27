import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import dotenv from 'dotenv';
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js";
import GroupSchema from "../models/GroupSchema.js";
import DayOffSchema from "../models/DayOffSchema.js";

dotenv.config();

export const loginEmployee = async (req, res, next) => {
    try {
        const employee = await EmployeeSchema.findOne({ name: req.body.name })
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            employee.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_employee = jwt.sign(
            { id: employee.id, role: employee.role == "employee" },
            process.env.JWT_EMPLOYEE,
            { expiresIn: "24h" },
        )
        const { password, ...otherDetails } = employee._doc;
        res.cookie("access_token_employee", token_employee, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutEmployee = (req, res, next) => {
    res.clearCookie("access_token_employee")
        .status(OK).
        json("Employee has been successfully logged out.");
};

export const checkAttendance = async (req, res, next) => {
    const { employeeID } = req.body;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const currentTime = new Date();
        const date = currentTime.toLocaleDateString();
        const weekday = currentTime.getDay();
        const day = currentTime.getDate();
        const month = currentTime.getMonth() + 1;

        // Format day and month as two-digit strings
        const formattedDay = day < 10 ? `0${day}` : day.toString();
        const formattedMonth = month < 10 ? `0${month}` : month.toString();

        const dayAndMonth = `${formattedDay}/${formattedMonth}`;
        // console.log(dayAndMonth);

        const getDayString = (weekday) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[weekday];
        };

        // console.log(getDayString(weekday));
        // check day off
        const dayOff_code = employee.day_off_code;
        const dayOff_schedules = await DayOffSchema.findOne({ code: dayOff_code });
        const dayOffByDate = dayOff_schedules.dayOff_schedule.map(day_off => day_off.date) === dayAndMonth;
        const dayOffByWeekDay = dayOff_schedules.dayOff_schedule.map(day_off => day_off.date) === getDayString(weekday);
        // console.log(dayOff_schedules.dayOff_schedule.map(day_off => day_off.date));
        // console.log(dayOffByWeekDay);

        if (dayOffByDate || dayOffByWeekDay) {
            return res.status(BAD_REQUEST).json({
                success: true,
                status: BAD_REQUEST,
                message: "You can not check in or check out in day off",
            });
        }

        const group_code = employee.grouped_work_code;
        const group = await GroupSchema.findOne({ code: group_code });
        const dayShift = group.shift_design.find(day => day.date === getDayString(weekday));
        if (!dayShift) return next(createError(NOT_FOUND, 'Shift not found for the current day'));

        const shift_code = dayShift.shift_code;
        const time_slot = dayShift.time_slot;

        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
        });

        if (!existingAttendance) {
            // only check in
            const newAttendance = new AttendanceSchema({
                date: date,
                weekday: getDayString(weekday),
                employee_id: employeeID,
                employee_name: employee.name,
                role: employee.role,
                department_code: employee.department_code,
                department_name: employee.department_name,
                grouped_work_code: employee.grouped_work_code,
                day_off_code: employee.day_off_code,
                shift_info: {
                    shift_code: shift_code
                }
            });
            const [startHours, startMinutes] = time_slot.detail[0].start_time.split(':').map(Number);
            const startTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
            // Calculate startTime - 30 minutes
            const startTimeMinus30 = new Date(startTime);
            startTimeMinus30.setMinutes(startTime.getMinutes() - 30);

            // Calculate startTime + 30 minutes
            const startTimePlus30 = new Date(startTime);
            startTimePlus30.setMinutes(startTime.getMinutes() + 30);
            if (currentTime > startTimeMinus30 && currentTime < startTimePlus30) {
                // check in on time
                newAttendance.shift_info.time_slot.check_in = true;
                newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                newAttendance.shift_info.time_slot.check_in_status = 'on time';
                await newAttendance.save();
                return res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newAttendance,
                });
            } else if (currentTime > startTimePlus30) {
                // check in late
                newAttendance.shift_info.time_slot.check_in = false;
                newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                newAttendance.shift_info.time_slot.check_in_status = 'missing';
                await newAttendance.save();
                return res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newAttendance,
                });
            } else if (currentTime < startTimeMinus30) {
                // check in too soon
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: `You can not check in at this time ${currentTime.toLocaleTimeString()}`,
                });
            }
        } else {
            // only check out
            if (existingAttendance.shift_info.time_slot.check_in != true) {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "You haven't check in yet",
                });
            } else {
                if (time_slot.total_number == 1) {
                    const [endHours, endMinutes] = time_slot.detail[0].end_time.split(':').map(Number);
                    const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

                    // Calculate endTime + 2 hours
                    const endTimePlus2 = new Date(endTime);
                    endTimePlus2.setHours(endTime.getHours() + 2);
                    if (currentTime > endTime && currentTime < endTimePlus2) {
                        // check out on time
                        existingAttendance.shift_info.time_slot.check_out = true;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                        });
                    } else if (currentTime > endTimePlus2) {
                        // check out late
                        existingAttendance.shift_info.time_slot.check_out = false;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'missing';
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                        });
                    } else if (currentTime < endTime) {
                        // check out too soon
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                        });
                    }
                } else if (time_slot.total_number == 2) {
                    const [endHours, endMinutes] = time_slot.detail[1].end_time.split(':').map(Number);
                    const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

                    // Calculate endTime + 2 hours
                    const endTimePlus2 = new Date(endTime);
                    endTimePlus2.setMinutes(endTime.getHours() + 2);
                    if (currentTime > endTime && currentTime < endTimePlus2) {
                        // check out on time
                        existingAttendance.shift_info.time_slot.check_out = true;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                        });
                    } else if (currentTime > endTimePlus2) {
                        // check out late
                        existingAttendance.shift_info.time_slot.check_out = false;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", })}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'missing';
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                        });
                    } else if (currentTime < endTime) {
                        // check out too soon
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                        });
                    }
                }
            }
        };
    } catch (err) {
        next(err);
    }
}

export const signalQRScan = async (req, res, next) => {
    const { employeeID } = req.body;

    try {
        // You can add additional validation here if needed
        if (!employeeID) {
            return next(createError(BAD_REQUEST, "Invalid employee ID"));
        }

        // Call your existing checkAttendance function to handle the logic
        await checkAttendance(req, res, next);

        // If the checkAttendance function completes without errors, you can send a success response
        res.status(OK).json({ success: "Signal received, checkAttendance completed successfully" });
    } catch (err) {
        next(err);
    }
};

export const getAttendanceHistory = async (req, res, next) => {
    const employeeID = req.params.employeeID;
    const year = req.query.year;
    const month = req.query.month;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const query = {
            employee_id: employee.id,
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
        };

        const attendanceList = await AttendanceSchema.find(query);

        if (Array.isArray(attendanceList) && attendanceList.length === 0) {
            return res.status(NOT_FOUND).json({ error: "Cannot find attendance history" });
        }

        return res.status(OK).json({ success: 'Attendance found', attendanceList });
    } catch (err) {
        next(err);
    }
}

