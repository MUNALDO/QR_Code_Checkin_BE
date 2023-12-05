import { createError } from "../utils/error.js";
import { NOT_FOUND, OK } from "../constant/HttpStatus.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import DayOffSchema from "../models/DayOffSchema.js";
import AdminSchema from "../models/AdminSchema.js";

export const updateEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))

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

export const searchSpecific = async (req, res, next) => {
    const query = req.query.query;
    try {
        if (!query) {
            const managements = await AdminSchema.find();
            const matchedManagement = managements.filter(management => {
                const matchedSchedules = employee.schedules.filter(schedule => {
                    return (
                        schedule.date.getTime() === targetDate.getTime() &&
                        schedule.shift_design.some(shift => shift.shift_code === targetShiftCode)
                    );
                });

                return matchedSchedules.length > 0;
            });
            const employee = await EmployeeSchema.find();
            if (!employee) return next(createError(NOT_FOUND, "Employees not found!"))

            res.status(OK).json({
                success: true,
                status: OK,
                message: employee,
            });
        }
        const regex = new RegExp(query, 'i');
        const employeeName = await EmployeeSchema.find({ name: regex });
        const employeeID = await EmployeeSchema.find({ id: regex });
        const employeeRole = await EmployeeSchema.find({ role: query });
        const employeePosition = await EmployeeSchema.find({ position: query });

        if (employeeName.length !== 0) {
            const filteredEmployees = employeeName.filter(employee => employee.department_name === inhaber.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeID.length !== 0) {
            const filteredEmployees = employeeID.filter(employee => employee.department_name === inhaber.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeeRole.length !== 0) {
            const filteredEmployees = employeeRole.filter(employee => employee.department_name === inhaber.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        } else if (employeePosition.length !== 0) {
            const filteredEmployees = employeePosition.filter(employee => employee.department_name === inhaber.department_name);
            res.status(OK).json({
                success: true,
                status: OK,
                message: filteredEmployees,
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: [],
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeeSpecific = async (req, res, next) => {
    const query = req.query.query;
    try {
        if (!query) {
            const employee = await EmployeeSchema.find();
            if (!employee) return next(createError(NOT_FOUND, "Employees not found!"))

            res.status(OK).json({
                success: true,
                status: OK,
                message: employee,
            });
        }
        const regex = new RegExp(query, 'i');
        const employeeName = await EmployeeSchema.find({ name: regex });
        const employeeID = await EmployeeSchema.find({ id: regex });
        const employeeRole = await EmployeeSchema.find({ role: query });
        const employeePosition = await EmployeeSchema.find({ position: query });

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
        } else if (employeePosition.length !== 0) {
            res.status(OK).json({
                success: true,
                status: OK,
                message: employeePosition,
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

export const getEmployeesByDate = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);

        // Find all employees
        const employees = await EmployeeSchema.find();

        // Filter employees based on the target date and shift code
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return schedule.date.getTime() === targetDate.getTime();
            });

            return matchedSchedules.length > 0;
        });

        res.status(OK).json({
            success: true,
            status: OK,
            message: matchedEmployees,
        });
    } catch (err) {
        next(err);
    }
};

export const getEmployeesByDateAndShift = async (req, res, next) => {
    try {
        const targetDate = new Date(req.body.date);
        const targetShiftCode = req.body.shift_code;

        const shift = await ShiftSchema.findOne({ code: targetShiftCode });
        if (!shift) return next(createError(NOT_FOUND, "Shift not found!"))

        // Find all employees
        const employees = await EmployeeSchema.find();

        // Filter employees based on the target date and shift code
        const matchedEmployees = employees.filter(employee => {
            const matchedSchedules = employee.schedules.filter(schedule => {
                return (
                    schedule.date.getTime() === targetDate.getTime() &&
                    schedule.shift_design.some(shift => shift.shift_code === targetShiftCode)
                );
            });

            return matchedSchedules.length > 0;
        });

        res.status(OK).json({
            success: true,
            status: OK,
            message: matchedEmployees,
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

// export const scanAndUpdateAttendance = async (req, res, next) => {
//     const checkInEndTime = 8;
//     const checkOutEndTime = 19;

//     try {
//         const employees = await EmployeeSchema.find();
//         if (!employees) return next(createError(NOT_FOUND, "Employees not found!"))

//         for (const employee of employees) {
//             const employeeID = employee.id;
//             // console.log(employeeID);
//             const getDayString = (weekday) => {
//                 const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//                 return days[weekday];
//             };

//             const dayShift = group.shift_design.find(day => day.date === getDayString(weekday));
//             if (!dayShift) return next(createError(NOT_FOUND, 'Shift not found for the current day'));

//             const shift_code = dayShift.shift_code;
//             const time_slot = dayShift.time_slot;

//             const existingAttendance = await AttendanceSchema.findOne({
//                 employee_id: employeeID,
//                 date: {
//                     $gte: new Date().setHours(0, 0, 0, 0),
//                     $lt: new Date().setHours(23, 59, 59, 999),
//                 },
//             });

//             if (!existingAttendance) {
//                 const date = new Date().toLocaleDateString();
//                 const currentHour = new Date().getHours();

//                 const newAttendance = new AttendanceSchema({
//                     date: date,
//                     weekday: getDayString(weekday),
//                     employee_id: employeeID,
//                     employee_name: employee.name,
//                     role: employee.role,
//                     department_code: employee.department_code,
//                     department_name: employee.department_name,
//                     grouped_work_code: employee.grouped_work_code,
//                     day_off_code: employee.day_off_code,
//                     shift_info: {
//                         shift_code: shift_code,
//                         time_slot: {
//                             check_in: currentHour > checkInEndTime ? false : true,
//                             check_out: currentHour > checkOutEndTime ? false : true,
//                             check_in_time: 'N/A',
//                             check_out_time: 'N/A',
//                             check_in_status: currentHour > checkInEndTime ? 'missing' : null,
//                             check_out_status: currentHour > checkOutEndTime ? 'missing' : null,
//                         }
//                     },
//                 });

//                 const attendanceRecord = await newAttendance.save();
//                 // console.log('New Attendance Record:', attendanceRecord);
//                 res.status(CREATED).json(attendanceRecord);
//             } else {
//                 const attendance = existingAttendance.shift_info.time_slot;
//                 const currentHour = new Date().getHours();

//                 if (attendance.check_out_status === null && currentHour > checkOutEndTime) {
//                     attendance.check_out = false;
//                     attendance.check_out_status = 'missing';
//                     // Save the updated attendance record
//                     const updateAttendance = await existingAttendance.save();
//                     res.status(OK).json(updateAttendance);
//                 } else {
//                     res.status(OK).json("All employees have been checked");
//                 }
//             }
//         }
//         console.log('Scan and update attendance completed.');
//     } catch (error) {
//         next(error);
//     }
// };


