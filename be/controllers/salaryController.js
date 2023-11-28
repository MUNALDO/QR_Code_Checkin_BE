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
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        // Find the relevant schedules for the given month and year
        const workSchedules = employee.schedules
            .filter((schedule) => schedule.work_schedules)
            .map((schedule) => schedule.work_schedules)
            .flat();

        // Find the relevant attendances for the given month and year
        const attendances = await AttendanceSchema.find({
            employee_id: employeeID,
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
        });

        console.log(workSchedules);
        console.log(attendances);
        // Calculate day_in_schedule and day_work_real
        let dayInSchedule = 0;
        let dayWorkReal = 0;

        workSchedules.forEach((schedule) => {
            dayInSchedule += 1;

        });

        attendances.forEach((attendance) => {
            dayWorkReal += attendance.shift_info.time_slot.value;
        });

        console.log(dayInSchedule);
        console.log(dayWorkReal);

        // Calculate total_salary
        const totalSalary = (employee.basic_salary_per_month + bonus) / (dayInSchedule * dayWorkReal);

        res.status(OK).json({
            success: true,
            status: OK,
            message: totalSalary,
        });
    } catch (err) {
        next(err);
    }
};
