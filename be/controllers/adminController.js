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
        if (!employee) {
            res.status(NOT_FOUND).json("Employee not found");
        }
        res.status(OK).json(employee);
    } catch (err) {
        next(err);
    }
};

export const getEmployeeByName = async (req, res, next) => {
    const employeeName = req.query.employeeName;
    try {
        const employee = await EmployeeSchema.find({ name: employeeName });
        if (!employee) {
            res.status(NOT_FOUND).json("Employee not found");
        }
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

        if (!employee) {
            res.status(NOT_FOUND).json({ error: "Employee not found" });
            return;
        }

        const currentTime = new Date();
        const scheduleDate = new Date(newSchedule.date);

        if (scheduleDate <= currentTime) {
            res
                .status(BAD_REQUEST)
                .json("Cannot create a past time schedule");
            return;
        }

        const existingSchedule = employee.schedules.find(
            (schedule) =>
                schedule.date.toISOString() === scheduleDate.toISOString() &&
                schedule.shifts.some(
                    (shift) => shift.shift === newSchedule.shift && !shift.isChecked
                )
        );

        if (existingSchedule) {
            res
                .status(BAD_REQUEST)
                .json(`Shift '${newSchedule.shift}' already exists for ${newSchedule.date}`);
            return;
        }

        const newShift = {
            shift: newSchedule.shift,
            startTime: newSchedule.startTime,
            endTime: newSchedule.endTime,
            isBooked: false,
        };

        const scheduleToUpdate = employee.schedules.find(
            (schedule) =>
                schedule.date.toISOString() === scheduleDate.toISOString()
        );

        if (scheduleToUpdate) {
            scheduleToUpdate.shifts.push(newShift);
        } else {
            const newScheduleEntry = {
                date: scheduleDate,
                shifts: [newShift],
            };
            employee.schedules.push(newScheduleEntry);
        }

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

        if (!employee) {
            res.status(NOT_FOUND).json({ error: "Employee not found" });
            return;
        }
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

export const scanAttendance = async () => {
    try {
        const currentTime = new Date();
        const date = currentTime.toLocaleDateString();
        const hour = currentTime.getHours();
        const minutes = currentTime.getMinutes();

        // Check for employees who haven't checked in after 11 am
        if (hour >= 11 && minutes > 0) {
            await markMissingCheckIn();
        }

        // Check for employees who haven't checked out after 9 pm
        if (hour >= 21 && minutes > 0) {
            await markMissingCheckOut();
        }

        console.log("Attendance scanning completed.");
    } catch (error) {
        console.error("Error scanning attendance:", error);
    }
};

const markMissingCheckIn = async () => {
    const employees = await EmployeeSchema.find({});

    for (const employee of employees) {
        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
        });

        if (!existingAttendance || !existingAttendance.isChecked[0].check_in) {
            // If no attendance record for today or check-in is missing, create/update a record
            await createOrUpdateAttendanceRecord(employee, "check_in");
        }
    }
};

const markMissingCheckOut = async () => {
    const employees = await EmployeeSchema.find({});

    for (const employee of employees) {
        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
        });

        if (!existingAttendance || !existingAttendance.isChecked[1].check_out) {
            // If no attendance record for today or check-in is missing, create/update a record
            await createOrUpdateAttendanceRecord(employee, "check_out");
        }
    }
};

const createOrUpdateAttendanceRecord = async (employee, shift) => {
    const totalSalary = employee.salary_per_hour;
    const status = "missing";

    const currentTime = new Date();
    const date = currentTime.toLocaleDateString();

    const attendanceRecord = new AttendanceSchema({
        date: date,
        isChecked: [
            {
                [shift]: false,
                time: "N/A",
                status,
            },
        ],
        employee_id: employee.id,
        employee_name: employee.name,
        total_salary: totalSalary,
    });

    await attendanceRecord.save();
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
    'Total Salary': { header: 'Total Salary', key: 'total_salary', width: 15 },
};

export const exportAttendanceToExcel = async (req, res) => {
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
            { header: 'Total Salary', key: 'total_salary', width: 15 },
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
                            total_salary: attendance.total_salary,
                        };
                        worksheet.addRow(rowData);
                    });
                } catch (error) {
                    console.error('Error processing attendance data:', error);
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
            console.error('Error saving the Excel file:', error);
        }

        // Set content type and attachment header with the generated file name
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
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
