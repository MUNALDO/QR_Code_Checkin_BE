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

        // Validate grouped_work_code
        if (req.body.grouped_work_code) {
            const group = await GroupSchema.findOne({ code: req.body.grouped_work_code });
            if (!group) return next(createError(BAD_REQUEST, "Invalid grouped work code"))
        }

        // Validate day_off_code
        if (req.body.day_off_code) {
            const dayOff = await DayOffSchema.findOne({ code: req.body.day_off_code });
            if (!dayOff) return next(createError(BAD_REQUEST, "Invalid day off code"))
        }

        const group = await GroupSchema.findOne({ code: req.body.grouped_work_code });
        const dayOff = await DayOffSchema.findOne({ code: req.body.day_off_code });

        let workSchedules = '';
        if (req.body.grouped_work_code) {
            const group = await GroupSchema.findOne({ code: req.body.grouped_work_code });
            if (group) {
                workSchedules = group.shift_design
                    .map(day => `${day.date}/${day.shift_code} `)
                    .join('');
            }
        }

        let dayOffSchedules = '';
        if (req.body.day_off_code) {
            const dayOff = await DayOffSchema.findOne({ code: req.body.day_off_code });
            if (dayOff) {
                dayOffSchedules = dayOff.dayOff_schedule
                    .map(day => `${day.date}/${req.body.day_off_code}/${day.type} `)
                    .join('');
            }
        }

        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
            schedules: [
                { work_schedules: workSchedules.trim() },
                { dayOff_schedules: dayOffSchedules.trim() },
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
    } catch (err) {
        next(err);
    }
};

export const updateEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        const updateEmployee = await EmployeeSchema.findOneAndUpdate(
            employeeID,
            { $set: req.body },
            { $new: true },
        )

        await updateEmployee.save();
        res.status(OK).json({
            success: true,
            status: OK,
            message: updateEmployee,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEmployeeById = async (req, res, next) => {
    const employeeID = req.query.employeeID;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

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

export const createSchedule = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const newSchedule = req.body.newSchedule;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        const currentTime = new Date();
        const scheduleDate = new Date(newSchedule.date);

        if (scheduleDate <= currentTime) {
            res
                .status(BAD_REQUEST)
                .json("Cannot create a past time schedule");
            return;
        }

        const existingSchedule = employee.employee_schedules.find(
            (schedule) =>
                schedule.date.toISOString() === scheduleDate.toISOString()
        );

        if (existingSchedule) {
            res
                .status(BAD_REQUEST)
                .json(`Schedule already exists for ${newSchedule.date}`);
            return;
        }

        const newScheduleEntry = {
            date: scheduleDate,
        };

        employee.employee_schedules.push(newScheduleEntry);

        const updatedEmployee = await employee.save();
        res.status(OK).json(updatedEmployee);
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
    const checkInEndTime = 11;
    const checkOutEndTime = 21;

    try {
        const employees = await EmployeeSchema.find();

        if (!employees) return next(createError(NOT_FOUND, "Employees not found!"))

        for (const employee of employees) {
            const employeeID = employee.id;
            // console.log(employeeID);

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
                    isChecked: {
                        check_in: currentHour > checkInEndTime ? false : true,
                        check_out: currentHour > checkOutEndTime ? false : true,
                        check_in_time: 'N/A',
                        check_out_time: 'N/A',
                        check_in_status: currentHour > checkInEndTime ? 'missing' : null,
                        check_out_status: currentHour > checkOutEndTime ? 'missing' : null,
                    },
                    employee_id: employeeID,
                    employee_name: employee.name,
                    // total_salary: 0,
                });

                const attendanceRecord = await newAttendance.save();
                // console.log('New Attendance Record:', attendanceRecord);
                res.status(CREATED).json(attendanceRecord);
            } else {
                const attendance = existingAttendance.isChecked;
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


