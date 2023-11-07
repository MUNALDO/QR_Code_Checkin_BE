import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import dotenv from 'dotenv';
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js";

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
    const employeeID = req.body.employeeID;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) {
            res.status(NOT_FOUND).json({ error: 'Employee not found' });
            return;
        }

        const currentTime = new Date();
        const hour = currentTime.getHours();
        const minutes = currentTime.getMinutes();

        let shift = '';
        if ((hour >= 1 && hour < 9) || (hour === 9 && minutes < 30)) {
            shift = 'check_in';
        } else if (hour === 9 && minutes >= 30 && minutes <= 59) {
            shift = 'check_in';
        } else if ((hour >= 17 && hour < 19) || (hour === 19 && minutes < 30)) {
            shift = 'check_out';
        } else if (hour === 19 && minutes >= 30 && minutes <= 59) {
            shift = 'check_out';
        } else {
            res.status(BAD_REQUEST).json({ error: 'Not within shift hours' });
            return;
        }

        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
        });

        if (existingAttendance) {
            if (existingAttendance.isChecked[0][shift]) {
                res.status(BAD_REQUEST).json({ error: `${shift} already recorded today` });
                return;
            }
        }

        const totalSalary = employee.salary_per_hour * 5;

        let status = 'on time';
        if (shift === 'check_in') {
            if ((hour === 9 && minutes >= 30) || hour >= 10) {
                status = 'late';
            }
            if (hour >= 12) {
                status = 'missing';
            }
        } else if (shift === 'check_out') {
            if ((hour === 19 && minutes >= 30) || hour >= 20) {
                status = 'late';
            }
            if (hour >= 24) {
                status = 'missing';
            }
        }

        const attendanceRecord = new AttendanceSchema({
            date: currentTime,
            isChecked: [
                {
                    [shift]: true,
                    time: `${hour}:${minutes < 10 ? '0' : ''}${minutes}`,
                    status,
                },
            ],
            employee_id: employee.id,
            employee_name: employee.name,
            total_salary: totalSalary,
        });

        const saveAttend = await attendanceRecord.save();

        return res.status(OK).json({ success: 'Attendance recorded successfully', saveAttend });
    } catch (err) {
        next(err);
    }
}

export const getAttendanceHistory = async (req, res, next) => {
    const employeeID = req.params.employeeID;
    const year = req.query.year;
    const month = req.query.month;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) {
            res.status(NOT_FOUND).json({ error: 'Employee not found' });
            return;
        }

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

