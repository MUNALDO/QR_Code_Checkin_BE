import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js";
import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import dotenv from 'dotenv';
import AdminSchema from "../models/AdminSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import GroupSchema from "../models/GroupSchema.js";
import DayOffSchema from "../models/DayOffSchema.js";

dotenv.config();

export const registerAdmin = async (req, res, next) => {
    try {
        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(req.body.password, salt)
        const newAdmin = new AdminSchema({
            ...req.body,
            password: hash,
        })
        await newAdmin.save()
        res.status(CREATED).json({
            success: true,
            status: CREATED,
            message: newAdmin,
        });
    } catch (err) {
        next(err)
    }
};

export const loginAdmin = async (req, res, next) => {
    try {
        const admin = await AdminSchema.findOne({ name: req.body.name })
        if (!admin) return next(createError(NOT_FOUND, "Admin not found!"))
        const isPasswordCorrect = await bcrypt.compare(
            req.body.password,
            admin.password
        )
        if (!isPasswordCorrect) return next(createError(BAD_REQUEST, "Wrong password!"))
        const token_admin = jwt.sign(
            { id: admin.id, role: admin.role == "admin" },
            process.env.JWT_ADMIN,
            { expiresIn: "24h" },
        )
        const { password, ...otherDetails } = admin._doc;
        res.cookie("access_token_admin", token_admin, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        }).status(OK).json({ details: { ...otherDetails } })
    } catch (err) {
        next(err)
    }
};

export const logoutAdmin = (req, res, next) => {
    res.clearCookie("access_token_admin")
        .status(OK)
        .json("Admin has been successfully logged out.");
};

export const registerEmployee = async (req, res, next) => {
    try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(req.body.password, salt);

        // Validate grouped_work_code && day_off_code
        if (req.body.grouped_work_code && req.body.day_off_code) {
            const group = await GroupSchema.findOne({ code: req.body.grouped_work_code });
            if (!group) return next(createError(BAD_REQUEST, "Invalid grouped work code"))

            const dayOff = await DayOffSchema.findOne({ code: req.body.day_off_code });
            if (!dayOff) return next(createError(BAD_REQUEST, "Invalid day off code"))

            const newEmployee = new EmployeeSchema({
                ...req.body,
                password: hash,
                schedules: [
                    { work_schedules: group.shift_design },
                    { dayOff_schedules: dayOff.dayOff_schedule },
                ],
            });

            group.members.push(newEmployee.id);
            dayOff.members.push(newEmployee.id);
            await group.save();
            await dayOff.save();
            await newEmployee.save();
            res.status(CREATED).json({
                success: true,
                status: CREATED,
                message: newEmployee,
            });
        } else {
            const newEmployee = new EmployeeSchema({
                ...req.body,
                password: hash,
            });
            await newEmployee.save();
            res.status(CREATED).json({
                success: true,
                status: CREATED,
                message: newEmployee,
            });
        }
    } catch (err) {
        next(err);
    }
};

export const updateEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (req.body.grouped_work_code && req.body.day_off_code) {
            const group = await GroupSchema.findOne({ code: req.body.grouped_work_code });
            if (!group) return next(createError(BAD_REQUEST, "Invalid grouped work code"))

            const dayOff = await DayOffSchema.findOne({ code: req.body.day_off_code });
            if (!dayOff) return next(createError(BAD_REQUEST, "Invalid day off code"))

            if (dayOff.members.includes(employeeID)) return next(createError(CONFLICT, "Employee already exists in the day off!"));

            const updateEmployee = await EmployeeSchema.findOneAndUpdate(
                { id: employeeID },
                {
                    $set: {
                        ...req.body,
                        schedules: [
                            { work_schedules: group.shift_design },
                            { dayOff_schedules: dayOff.dayOff_schedule },
                        ],
                    }
                },
                { $new: true },
            )
            dayOff.members.push(employeeID);
            await dayOff.save();
            await updateEmployee.save();
            res.status(OK).json({
                success: true,
                status: OK,
                message: updateEmployee,
            });
        } else {
            const updateEmployee = await EmployeeSchema.findOneAndUpdate(
                { id: employeeID },
                { $set: req.body },
                { $new: true },
            )

            await updateEmployee.save();
            res.status(OK).json({
                success: true,
                status: OK,
                message: updateEmployee,
            });
        }
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeById = async (req, res, next) => {
    const employeeID = req.query.employeeID;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        if (employee.grouped_work_code && employee.day_off_code) {
            await GroupSchema.updateOne({
                code: employee.grouped_work_code
            },
                {
                    $pull: {
                        "members": employeeID,
                    }
                }
            );

            await DayOffSchema.updateOne({
                code: employee.day_off_code
            },
                {
                    $pull: {
                        "members": employeeID,
                    }
                }
            );

            await EmployeeSchema.findOneAndDelete({ id: employeeID });
            res.status(OK).json({
                success: true,
                status: OK,
                message: "Employee deleted successfully",
            });
        } else {
            await EmployeeSchema.findOneAndDelete({ id: employeeID });
            res.status(OK).json({
                success: true,
                status: OK,
                message: "Employee deleted successfully",
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getAllEmployees = async (req, res, next) => {
    try {
        const employee = await EmployeeSchema.find();
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        res.status(OK).json({
            success: true,
            status: OK,
            message: employee,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeById = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
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
    // console.log(query);
    try {
        if (!query) {
            const employee = await EmployeeSchema.find();
            res.status(OK).json({
                success: true,
                status: OK,
                message: employee,
            });
        }
        const regex = new RegExp(query, 'i');
        const employeeName = await EmployeeSchema.find({ name: regex });
        const employeeID = await EmployeeSchema.find({ id: query });
        const employeeRole = await EmployeeSchema.find({ role: query });
        // console.log(employeeRole);
        // console.log(employeeName);
        // console.log(employeeID);

        if (employeeName.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeeName,
            });
        } else if (employeeID.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeeID,
            });
        } else if (employeeRole.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeeRole,
            });
        } else {
            res.status(OK).json({
                success: true,
                status: OK,
                message: [],
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getEmployeeByName = async (req, res, next) => {
    const employeeName = req.query.employeeName;
    try {
        const employee = await EmployeeSchema.find({ name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        res.status(OK).json({
            success: true,
            status: OK,
            message: employee,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeByRole = async (req, res, next) => {
    const employeeRole = req.query.employeeRole;
    try {
        const employee = await EmployeeSchema.find({ role: employeeRole });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        res.status(OK).json({
            success: true,
            status: OK,
            message: employee,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeSchedule = async (req, res, next) => {
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

export const getAttendanceByTime = async (req, res, next) => {
    const year = req.query.year;
    const month = req.query.month;

    try {
        const query = {
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

export const scanAndUpdateAttendance = async (req, res, next) => {
    const checkInEndTime = 8;
    const checkOutEndTime = 19;

    try {
        const employees = await EmployeeSchema.find();
        if (!employees) return next(createError(NOT_FOUND, "Employees not found!"))

        for (const employee of employees) {
            const employeeID = employee.id;
            // console.log(employeeID);
            const getDayString = (weekday) => {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return days[weekday];
            };

            const dayShift = group.shift_design.find(day => day.date === getDayString(weekday));
            if (!dayShift) return next(createError(NOT_FOUND, 'Shift not found for the current day'));

            const shift_code = dayShift.shift_code;
            const time_slot = dayShift.time_slot;

            const existingAttendance = await AttendanceSchema.findOne({
                employee_id: employeeID,
                date: {
                    $gte: new Date().setHours(0, 0, 0, 0),
                    $lt: new Date().setHours(23, 59, 59, 999),
                },
            });

            if (!existingAttendance) {
                const date = new Date().toLocaleDateString();
                const currentHour = new Date().getHours();

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
                        shift_code: shift_code,
                        time_slot: {
                            check_in: currentHour > checkInEndTime ? false : true,
                            check_out: currentHour > checkOutEndTime ? false : true,
                            check_in_time: 'N/A',
                            check_out_time: 'N/A',
                            check_in_status: currentHour > checkInEndTime ? 'missing' : null,
                            check_out_status: currentHour > checkOutEndTime ? 'missing' : null,
                        }
                    },
                });

                const attendanceRecord = await newAttendance.save();
                // console.log('New Attendance Record:', attendanceRecord);
                res.status(CREATED).json(attendanceRecord);
            } else {
                const attendance = existingAttendance.shift_info.time_slot;
                const currentHour = new Date().getHours();

                if (attendance.check_out_status === null && currentHour > checkOutEndTime) {
                    attendance.check_out = false;
                    attendance.check_out_status = 'missing';
                    // Save the updated attendance record
                    const updateAttendance = await existingAttendance.save();
                    res.status(OK).json(updateAttendance);
                } else {
                    res.status(OK).json("All employees have been checked");
                }
            }
        }
        console.log('Scan and update attendance completed.');
    } catch (error) {
        next(error);
    }
};


