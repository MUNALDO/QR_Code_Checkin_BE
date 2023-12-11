import { BAD_REQUEST, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const salaryCalculate = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const year = req.query.year;
        const month = req.query.month;
        const date = req.query.date;

        // Ensure valid year, month, and employee ID inputs
        if (!year || !month || !employeeID) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year, month, and employee ID are required parameters",
            });
        }

        // Get values for a, b, c from req.body
        const { a, b, c, d } = req.body;
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        // day-off salary
        const days_off = employee.default_day_off - employee.realistic_day_off;
        const salary_day_off = [(b * 3) / 65] * days_off;

        // Define the date range based on the presence of the date parameter
        const dateRange = date
            ? {
                $gte: new Date(year, month - 1, date, 0, 0, 0, 0),
                $lt: new Date(year, month - 1, date, 23, 59, 59, 999),
            }
            : {
                $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
                $lt: new Date(year, month, 0, 23, 59, 59, 999),
            };

        // Find employee attendance for the specified date range
        const employeeAttendance = await AttendanceSchema.find({
            employee_id: employeeID,
            date: dateRange,
        });

        // Initialize variables to calculate hours
        let hourNormal = 0;
        let hourOvertime = 0;
        let kmNumber = 0;

        // Calculate hours based on attendance data
        employeeAttendance.forEach(attendance => {
            const totalKm = attendance.total_km;
            kmNumber += totalKm;
            const totalHour = attendance.shift_info.total_hour;
            // console.log(totalHour);
            const totalMinutes = attendance.shift_info.total_minutes / 60;
            // console.log(totalMinutes);
            if (attendance.shift_info.shift_type === "normal") {
                hourNormal += totalHour + totalMinutes;
            } else if (attendance.shift_info.shift_type === "overtime") {
                hourOvertime += totalHour + totalMinutes;
            }
        });

        // console.log(hourNormal);
        // console.log(hourOvertime);

        // Calculate salary using the provided equation
        if (!d) {
            const salary = (hourNormal + hourOvertime) * a - b - c + salary_day_off - employee.house_rent_money + kmNumber * 0.25;
            return res.status(OK).json({
                success: true,
                status: OK,
                message: salary,
            });
        }
        const salary = (hourNormal + hourOvertime) * a - b - c + salary_day_off - employee.house_rent_money + kmNumber * d;

        return res.status(OK).json({
            success: true,
            status: OK,
            message: salary,
        });
    } catch (err) {
        next(err);
    }
};

