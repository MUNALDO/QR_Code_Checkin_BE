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

export const checkAttendance = async (req, res, next) => {
    const employeeID = req.body.employeeID;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const currentTime = new Date();
        const date = currentTime.toLocaleDateString();
        const hour = currentTime.getHours();
        const minutes = currentTime.getMinutes();

        // Determine whether it's check-in or check-out based on the current time
        let shift = '';
        if (hour >= 8 && hour <= 15) {
            shift = 'check_in';
        } else if (hour >= 17 && hour <= 22) {
            shift = 'check_out';
        } else {
            return next(createError(BAD_REQUEST, "Not within shift hour!"))
        }

        // console.log(shift);

        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
        });

        // console.log(existingAttendance);

        if (!existingAttendance) {
            if (shift == 'check_out') {
                res.status(BAD_REQUEST).json({ error: 'You need to check in before checking out' });
                return;
            }
            if ((hour >= 8 && hour < 9) || hour == 9) {
                // const totalSalary = employee.salary_per_hour * 5;
                const status = 'on time';
                // console.log(status);
                const attendanceRecord = new AttendanceSchema({
                    date: date,
                    isChecked: {
                        [shift]: true,
                        [`${shift}_time`]: `${hour}:${minutes < 10 ? '0' : ''}${minutes}`,
                        [`${shift}_status`]: status,
                    },
                    employee_id: employee.id,
                    employee_name: employee.name,
                    // total_salary: totalSalary,
                });
                const saveAttend = await attendanceRecord.save();
                return res.status(OK).json({ success: `${shift} recorded successfully`, saveAttend });
            } else if ((hour > 10 && hour < 12) || hour == 12) {
                const status = 'missing';
                // console.log(status);
                const attendanceRecord = new AttendanceSchema({
                    date: date,
                    isChecked: {
                        [shift]: false,
                        [`${shift}_time`]: `${hour}:${minutes < 10 ? '0' : ''}${minutes}`,
                        [`${shift}_status`]: status,
                    },
                    employee_id: employee.id,
                    employee_name: employee.name,
                    // total_salary,
                });
                const saveAttend = await attendanceRecord.save();
                return res.status(OK).json({ success: `${shift} recorded successfully`, saveAttend });
            } else if ((hour > 9 && hour < 10) || hour == 10) {
                // const totalSalary = employee.salary_per_hour * 5;
                const status = 'late';
                // console.log(status);
                const attendanceRecord = new AttendanceSchema({
                    date: date,
                    isChecked: {
                        [shift]: true,
                        [`${shift}_time`]: `${hour}:${minutes < 10 ? '0' : ''}${minutes}`,
                        [`${shift}_status`]: status,
                    },
                    employee_id: employee.id,
                    employee_name: employee.name,
                    // total_salary: totalSalary,
                });
                const saveAttend = await attendanceRecord.save();
                return res.status(OK).json({ success: `${shift} recorded successfully`, saveAttend });
            }
        }

        if (existingAttendance) {
            if (existingAttendance.isChecked[shift]) {
                // Trying to check in or check out twice on the same shift
                res.status(BAD_REQUEST).json({ error: `${shift} already recorded today` });
                return;
            }

            // Check-out logic
            if (hour > 20 && hour < 21) {
                // Late check-out
                existingAttendance.isChecked.check_out = true;
                // existingAttendance.total_salary += employee.salary_per_hour * 5;
                existingAttendance.isChecked.check_out_status = 'late';
                existingAttendance.isChecked.check_out_time = `${hour}:${minutes < 10 ? '0' : ''}${minutes}`;
                const updateCheckOut = await existingAttendance.save();
                return res.status(OK).json({ success: `${shift} update successfully`, updateCheckOut });
            } else if ((hour > 17 && hour < 20) || (hour == 20) || (hour == 17)) {
                // On-time check-out
                existingAttendance.isChecked.check_out = true;
                // existingAttendance.total_salary += employee.salary_per_hour * 5;
                existingAttendance.isChecked.check_out_status = 'on time';
                existingAttendance.isChecked.check_out_time = `${hour}:${minutes < 10 ? '0' : ''}${minutes}`;
                const updateCheckOut = await existingAttendance.save();
                return res.status(OK).json({ success: `${shift} update successfully`, updateCheckOut });
            } else if (hour > 21 || hour == 21) {
                // Missing check-out
                existingAttendance.isChecked.check_out = false;
                existingAttendance.isChecked.check_out_status = 'missing';
                existingAttendance.isChecked.check_out_time = `${hour}:${minutes < 10 ? '0' : ''}${minutes}`;
                const updateCheckOut = await existingAttendance.save();
                return res.status(OK).json({ success: `${shift} update successfully`, updateCheckOut });
            }
        }
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

