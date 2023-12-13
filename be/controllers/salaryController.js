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

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

        // Find the current year and month in attendance_stats
        const statsIndex = employee.salary.findIndex(stat =>
            stat.year === year && stat.month === month + 1
        );

        // Find the current year and previous month in attendance_stats
        const statsIndexPrevious = employee.salary.findIndex(stat =>
            stat.year === year && stat.month === month
        );

        if (statsIndex > -1) {
            // Update default parameters if new ones are provided
            if (req.body.a_new !== undefined) employee.salary[statsIndex].a_parameter = req.body.a_new;
            if (req.body.b_new !== undefined) employee.salary[statsIndex].b_parameter = req.body.b_new;
            if (req.body.c_new !== undefined) employee.salary[statsIndex].c_parameter = req.body.c_new;
            if (req.body.d_new !== undefined) employee.salary[statsIndex].d_parameter = req.body.d_new;

            // Use the potentially updated values
            const a = employee.salary[statsIndex].a_parameter;
            const b = employee.salary[statsIndex].b_parameter;
            const c = employee.salary[statsIndex].c_parameter;
            const d = employee.salary[statsIndex].d_parameter;

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

            const salary = (hourNormal + hourOvertime) * a - b - c + salary_day_off - employee.house_rent_money + kmNumber * d;
            employee.salary[statsIndex].date_calculate = new Date();
            employee.salary[statsIndex].hour_normal = hourNormal;
            employee.salary[statsIndex].hour_overtime = hourOvertime;
            employee.salary[statsIndex].total_salary = salary;
            await employee.save();

            return res.status(OK).json({
                success: true,
                status: OK,
                message: employee.salary[statsIndex],
            });
        } else if (statsIndex === -1) {
            if (employee.salary.length > 0) {
                // Update default parameters if new ones are provided
                if (req.body.a_new !== undefined) a = req.body.a_new;
                if (req.body.b_new !== undefined) b = req.body.b_new;
                if (req.body.c_new !== undefined) c = req.body.c_new;
                if (req.body.d_new !== undefined) d = req.body.d_new;

                // Use the potentially updated values
                const a = employee.salary[statsIndexPrevious].a_parameter;
                const b = employee.salary[statsIndexPrevious].b_parameter;
                const c = employee.salary[statsIndexPrevious].c_parameter;
                const d = employee.salary[statsIndexPrevious].d_parameter;

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

                const salary = (hourNormal + hourOvertime) * a - b - c + salary_day_off - employee.house_rent_money + kmNumber * d;
                const newSalary = {
                    year: year,
                    month: month,
                    date_calculate: new Date(),
                    total_salary: salary,
                    a_parameter: a,
                    b_parameter: b,
                    c_parameter: c,
                    d_parameter: d
                }
                employee.salary.push(newSalary);
                await employee.save();

                return res.status(OK).json({
                    success: true,
                    status: OK,
                    message: newSalary,
                });
            } else {
                // Update default parameters if new ones are provided
                const a = req.body.a_new;
                const b = req.body.b_new;
                const c = req.body.c_new;
                const d = req.body.d_new ? req.body.d_new : 0.25;

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

                const salary = (hourNormal + hourOvertime) * a - b - c + salary_day_off - employee.house_rent_money + kmNumber * d;
                const newSalary = {
                    year: year,
                    month: month,
                    date_calculate: new Date(),
                    total_salary: salary,
                    a_parameter: a,
                    b_parameter: b,
                    c_parameter: c,
                    d_parameter: d
                }
                employee.salary.push(newSalary);
                await employee.save();

                return res.status(OK).json({
                    success: true,
                    status: OK,
                    message: newSalary,
                });
            }
        } else {
            return res.status(BAD_REQUEST).json({
                success: true,
                status: BAD_REQUEST,
                message: "Err!",
            });
        }
    } catch (err) {
        next(err);
    }
};

export const getSalary = async (req, res, next) => {
    try {
        const employeeID = req.params.employeeID;
        const year = req.query.year;
        const month = req.query.month;

        if (!year || !month || !employeeID) {
            return res.status(BAD_REQUEST).json({
                success: false,
                status: BAD_REQUEST,
                message: "Year, month, and employee ID are required parameters",
            });
        }

        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        const salary = employee.salary.find(stat =>
            stat.year === year && stat.month === month
        );

        if (salary) {
            return res.status(OK).json({
                success: true,
                status: OK,
                message: salary,
            });
        } else {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: "Salary record not found for the specified month and year.",
            });
        }
    } catch (err) {
        next(err);
    }
};
