import { NOT_FOUND, SYSTEM_ERROR } from "../constant/HttpStatus.js";
import ExcelJS from 'exceljs';
import fs from 'fs';
import AttendanceSchema from "../models/AttendanceSchema.js";

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

const columnMapping = {
    'Month': { header: 'Month', key: 'month', width: 15 },
    'Date': { header: 'Date', key: 'date', width: 15 },
    'Weekday': { header: 'Weekday', key: 'weekday', width: 15 },
    'Employee ID': { header: 'Employee ID', key: 'employee_id', width: 15 },
    'Employee Name': { header: 'Employee Name', key: 'employee_name', width: 20 },
    'Shift Code': { header: 'Shift Code', key: 'shift_code', width: 15 },
    'Check In': { header: 'Check In', key: 'check_in', width: 15 },
    'Check In Status': { header: 'Check In Status', key: 'check_in_status', width: 15 },
    'Check In Time': { header: 'Check In Time', key: 'check_in_time', width: 15 },
    'Check Out': { header: 'Check Out', key: 'check_out', width: 15 },
    'Check Out Status': { header: 'Check Out Status', key: 'check_out_status', width: 15 },
    'Check Out Time': { header: 'Check Out Time', key: 'check_out_time', width: 15 },
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
            { header: 'Weekday', key: 'weekday', width: 15 },
            { header: 'Employee ID', key: 'employee_id', width: 15 },
            { header: 'Employee Name', key: 'employee_name', width: 20 },
            { header: 'Shift Code', key: 'shift_code', width: 15 },
            { header: 'Check In', key: 'check_in', width: 15 },
            { header: 'Check In Status', key: 'check_in_status', width: 15 },
            { header: 'Check In Time', key: 'check_in_time', width: 15 },
            { header: 'Check Out', key: 'check_out', width: 15 },
            { header: 'Check Out Status', key: 'check_out_status', width: 15 },
            { header: 'Check Out Time', key: 'check_out_time', width: 15 },
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
                        const shiftCode = attendance.shift_info.shift_cpde;
                        const checkIn = attendance.shift_info.time_slot.check_in ? 'Yes' : 'No';
                        const checkOut = attendance.shift_info.time_slot.check_out ? 'Yes' : 'No';
                        const rowData = {
                            month: index === 0 ? date.getUTCMonth() + 1 : null,
                            date: index === 0 ? date.toLocaleDateString().split('T')[0] : null,
                            weekday: attendance.weekday,
                            employee_id: attendance.employee_id,
                            employee_name: attendance.employee_name,
                            shift_code: shiftCode,
                            check_in: checkIn,
                            check_in_status: attendance.shift_info.time_slot.check_in_status,
                            check_in_time: attendance.shift_info.time_slot.check_in_time || 'N/A',
                            check_out: checkOut,
                            check_out_status: attendance.shift_info.time_slot.check_out_status || 'N/A',
                            check_out_time: attendance.shift_info.time_slot.check_out_time || 'N/A',
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
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');

        // Send the buffer as the response
        res.send(buffer);

        // Save the buffer to the file path
        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }
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
};