import { NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const salaryCalculate = async (req, res, next) => {
    const employeeID = req.query.id;
    const month = req.query.month;
    const year = req.query.year;
    const bonus = req.body.bonus;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });

        if (!employee) {
            return next(createError(NOT_FOUND, "Employee not found!"));
        }

        // console.log(employee);

        // Find the relevant schedules for the given month and year
        const schedules = employee.employee_schedules.filter(schedule => {
            const scheduleDate = new Date(schedule.date);
            const scheduleYear = scheduleDate.getFullYear();
            const scheduleMonth = scheduleDate.getMonth() + 1;
            // console.log(scheduleMonth);
            // console.log(scheduleYear);

            return (
                scheduleYear === parseInt(year) &&
                scheduleMonth === parseInt(month)
            );
        });

        // console.log("Schedules:", schedules);

        // Find the relevant attendances for the given month and year
        const attendances = await AttendanceSchema.find({
            employee_id: employeeID,
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
        });

        // Calculate day_in_schedule and day_work_real
        let dayInSchedule = 0;
        let dayWorkReal = 0;

        schedules.forEach(schedule => {
            dayInSchedule += 1;
        });

        attendances.forEach(attendance => {
            const checkInStatus = attendance.isChecked.check_in_status;
            const checkOutStatus = attendance.isChecked.check_out_status;

            if (checkInStatus === 'on time' && checkOutStatus === 'on time') {
                dayWorkReal += 1;
            } else if (checkInStatus === 'late' && checkOutStatus === 'late') {
                dayWorkReal += 0.5;
            } else if (checkInStatus === 'missing' || checkOutStatus === 'missing') {
                dayWorkReal += 0;
            } else if (checkInStatus === 'on time' || checkOutStatus === 'late') {
                dayWorkReal += 0.75;
            } else if (checkInStatus === 'late' || checkOutStatus === 'on time') {
                dayWorkReal += 0.75;
            }
        });

        // console.log(dayInSchedule);
        // console.log(dayWorkReal);

        // Calculate total_salary
        const totalSalary = (employee.basic_salary_per_month + bonus) / (dayInSchedule * dayWorkReal);

        res.status(OK).json({ totalSalary });
    } catch (err) {
        next(err);
    }
};