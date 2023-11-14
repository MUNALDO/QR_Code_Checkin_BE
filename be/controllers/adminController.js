import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js";
import { BAD_REQUEST, CREATED, NOT_FOUND, OK, SYSTEM_ERROR } from "../constant/HttpStatus.js";
import dotenv from 'dotenv';
import AdminSchema from "../models/AdminSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import ExcelJS from 'exceljs';
import fs from 'fs';

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
        res.status(CREATED).json("Admin has been created")
    } catch (err) {
        next(err)
    }
};

export const registerEmployee = async (req, res, next) => {
    try {
        const salt = bcrypt.genSaltSync(10)
        const hash = bcrypt.hashSync(req.body.password, salt)
        const newEmployee = new EmployeeSchema({
            ...req.body,
            password: hash,
        })
        await newEmployee.save()
        res.status(CREATED).json("Employee has been created")
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
        .status(OK).
        json("Admin has been successfully logged out.");
};

export const getAllEmployees = async (req, res, next) => {
    try {
        const employee = await EmployeeSchema.find();
        res.status(OK).json(employee);
    } catch (err) {
        next(err);
    }
};

export const getEmployeeById = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        res.status(OK).json(employee);
    } catch (err) {
        next(err);
    }
};

export const getEmployeeByName = async (req, res, next) => {
    const employeeName = req.query.employeeName;
    try {
        const employee = await EmployeeSchema.find({ name: employeeName });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"))
        res.status(OK).json(employee);
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
        res.status(OK).json(employee.schedules);
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

async function getAttendance(year, month) {

    try {
        const query = {
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
        };

        const attendanceList = await AttendanceSchema.find(query);

        return attendanceList;
    } catch (err) {
        console.error('Error fetching attendance data:', err);
        throw err;
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

const columnMapping = {
    'Month': { header: 'Month', key: 'month', width: 15 },
    'Date': { header: 'Date', key: 'date', width: 15 },
    'Employee ID': { header: 'Employee ID', key: 'employee_id', width: 15 },
    'Employee Name': { header: 'Employee Name', key: 'employee_name', width: 20 },
    'Check In': { header: 'Check In', key: 'check_in', width: 15 },
    'Check In Status': { header: 'Check In Status', key: 'check_in_status', width: 15 },
    'Check In Time': { header: 'Check In Time', key: 'check_in_time', width: 15 },
    'Check Out': { header: 'Check Out', key: 'check_out', width: 15 },
    'Check Out Status': { header: 'Check Out Status', key: 'check_out_status', width: 15 },
    'Check Out Time': { header: 'Check Out Time', key: 'check_out_time', width: 15 },
    // 'Total Salary': { header: 'Total Salary', key: 'total_salary', width: 15 },
};

export const exportAttendanceToExcel = async (req, res, next) => {
    const { year, month } = req.query;
    const columnNames = req.body.columns;

    try {
        const attendanceList = await getAttendance(year, month);

        if (!attendanceList || attendanceList.length === 0) {
            return res.status(NOT_FOUND).json({ error: "No attendance data found" });
        }

        // Group attendance by date
        const groupedByDate = groupByDate(attendanceList);
        // Group attendance by month, if year is provided
        const groupedByMonth = year ? groupByMonth(groupedByDate) : groupedByDate;

        // Define the file name based on year and, optionally, the month
        const fileName = `${year}${month ? `_${month}` : ''}.xlsx`;

        // Define the file path where you want to save the Excel file
        const filePath = `../${fileName}`;

        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance');

        // Define the default columns for the Excel sheet
        const defaultColumns = [
            { header: 'Month', key: 'month', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Employee ID', key: 'employee_id', width: 15 },
            { header: 'Employee Name', key: 'employee_name', width: 20 },
            { header: 'Check In', key: 'check_in', width: 15 },
            { header: 'Check In Status', key: 'check_in_status', width: 15 },
            { header: 'Check In Time', key: 'check_in_time', width: 15 },
            { header: 'Check Out', key: 'check_out', width: 15 },
            { header: 'Check Out Status', key: 'check_out_status', width: 15 },
            { header: 'Check Out Time', key: 'check_out_time', width: 15 },
            // { header: 'Total Salary', key: 'total_salary', width: 15 },
        ];

        // Determine the columns to export based on user input or use default columns
        const exportColumns = columnNames
            ? columnNames.map(columnName => columnMapping[columnName] || defaultColumns[0])
            : defaultColumns;

        // Set columns for the Excel sheet
        worksheet.columns = exportColumns;

        // Populate the worksheet with data
        groupedByMonth.forEach((monthData) => {
            monthData.dates.forEach((dateData) => {
                try {
                    dateData.attendanceList.forEach((attendance, index) => {
                        const date = new Date(attendance.date);
                        const checkIn = attendance.isChecked.check_in ? 'Yes' : 'No';
                        const checkOut = attendance.isChecked.check_out ? 'Yes' : 'No';
                        const rowData = {
                            month: index === 0 ? date.getUTCMonth() + 1 : null,
                            date: index === 0 ? date.toLocaleDateString().split('T')[0] : null,
                            employee_id: attendance.employee_id,
                            employee_name: attendance.employee_name,
                            check_in: checkIn,
                            check_in_status: attendance.isChecked.check_in_status,
                            check_in_time: attendance.isChecked.check_in_time || 'N/A',
                            check_out: checkOut,
                            check_out_status: attendance.isChecked.check_out_status || 'N/A',
                            check_out_time: attendance.isChecked.check_out_time || 'N/A',
                            // total_salary: attendance.total_salary,
                        };
                        worksheet.addRow(rowData);
                    });
                } catch (error) {
                    next(error);
                }
            });
        });

        // Generate the Excel file in memory
        const buffer = await workbook.xlsx.writeBuffer();

        // Save the buffer to the file path
        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');

        // Send the buffer as the response
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting Excel:', error);
        return res.status(SYSTEM_ERROR).json({ error: 'Internal server error' });
    }
};


// Helper function to group attendance by date
function groupByDate(attendanceList) {
    const groupedData = new Map();

    attendanceList.forEach((attendance) => {
        const dateKey = attendance.date.toLocaleDateString();
        if (!groupedData.has(dateKey)) {
            groupedData.set(dateKey, []);
        }
        groupedData.get(dateKey).push(attendance);
    });

    // Sort the dates by ascending order
    return Array.from(groupedData)
        .map(([date, attendanceList]) => ({
            date: new Date(date),
            attendanceList,
        }))
        .sort((a, b) => a.date - b.date);
}

// Helper function to group attendance by month
function groupByMonth(attendanceList) {
    const groupedData = new Map();

    attendanceList.forEach((data) => {
        const year = data.date.getUTCFullYear();
        const month = data.date.getUTCMonth();

        const dateKey = `${year}_${month}`;
        if (!groupedData.has(dateKey)) {
            groupedData.set(dateKey, {
                year,
                month,
                dates: [],
            });
        }
        groupedData.get(dateKey).dates.push(data);
    });

    // Sort the months by ascending order
    return Array.from(groupedData)
        .map(([key, monthData]) => monthData)
        .sort((a, b) => new Date(a.year, a.month) - new Date(b.year, b.month));
}

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
