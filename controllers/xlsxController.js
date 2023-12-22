import { NOT_FOUND, SYSTEM_ERROR } from "../constant/HttpStatus.js";
import ExcelJS from 'exceljs';
import fs from 'fs';
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";

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
                        const shiftCode = attendance.shift_info.shift_code;
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
        res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');

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

export const exportEmployeeDataToExcel = async (req, res, next) => {
    try {
        const employees = await EmployeeSchema.find();

        if (!employees || employees.length === 0) {
            return res.status(NOT_FOUND).json({ error: "No employee data found" });
        }

        const fileName = `Employee_Data.xlsx`;
        const filePath = `../${fileName}`;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employee Data');

        // Defining columns for the Excel sheet
        const columns = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Address', key: 'address', width: 30 },
            { header: 'DOB', key: 'dob', width: 15 },
            { header: 'Gender', key: 'gender', width: 10 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Default Day Off', key: 'default_day_off', width: 15 },
            { header: 'Realistic Day Off', key: 'realistic_day_off', width: 15 },
            { header: 'House Rent', key: 'house_rent_money', width: 15 },
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Active Day', key: 'active_day', width: 15 },
            { header: 'Inactive Day', key: 'inactive_day', width: 15 },
            { header: 'Departments', key: 'departments', width: 20 },
            { header: 'Positions', key: 'positions', width: 60 },
        ];

        worksheet.columns = columns;

        // Add rows to the worksheet
        employees.forEach(employee => {
            const departmentsPositions = employee.department.map(dept => ({
                name: dept.name,
                positions: dept.position.join(', ')
            }));

            const departmentNames = departmentsPositions.map(dp => dp.name).join(', ');
            const allPositions = departmentsPositions.map(dp => dp.positions).join(' / ');

            // Create a row for each employee
            const row = {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                address: employee.address || '',
                dob: employee.dob || '',
                gender: employee.gender || '',
                role: employee.role || '',
                default_day_off: employee.default_day_off || '',
                realistic_day_off: employee.realistic_day_off || '',
                house_rent_money: employee.house_rent_money || '',
                status: employee.status || '',
                active_day: employee.active_day || '',
                inactive_day: employee.inactive_day || '',
                departments: departmentNames,
                positions: allPositions,
            };
            worksheet.addRow(row);
        })

        // Write buffer
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Employee_Data.xlsx');
        res.send(buffer);

        // Save the buffer to the file path
        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }
    } catch (error) {
        console.error('Error exporting employee data to Excel:', error);
        return res.status(SYSTEM_ERROR).json({ error: 'Internal server error' });
    }
};


export const exportEmployeeSalaryDataToExcel = async (req, res, next) => {
    const { year, month } = req.query;

    try {
        const employees = await EmployeeSchema.find();

        if (!employees || employees.length === 0) {
            return res.status(NOT_FOUND).json({ error: "No salary data found for the specified month and year" });
        }

        const fileName = `Employee_Salary_Data_${year}_${month}.xlsx`;
        const filePath = `../${fileName}`;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employee Salary Data');

        const columns = [
            { header: 'ID', key: 'id', width: 20 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Department Names', key: 'department_name', width: 30 },
            { header: 'Position', key: 'position', width: 20 },
            { header: 'Date Calculate', key: 'date_calculate', width: 15 },
            { header: 'Total Salary', key: 'total_salary', width: 15 },
            { header: 'Normal Hours', key: 'hour_normal', width: 15 },
            { header: 'Overtime Hours', key: 'hour_overtime', width: 15 },
            { header: 'Total KM', key: 'total_km', width: 10 },
            { header: 'a Parameter', key: 'a_parameter', width: 15 },
            { header: 'b Parameter', key: 'b_parameter', width: 15 },
            { header: 'c Parameter', key: 'c_parameter', width: 15 },
            { header: 'd Parameter', key: 'd_parameter', width: 15 },
        ];

        worksheet.columns = columns;

        employees.forEach(employee => {
            const salaryData = employee.salary.find(s => s.year === year && s.month === month);
            if (salaryData) {
                worksheet.addRow({
                    id: employee.id,
                    name: employee.name,
                    department_name: employee.department_name.join(', '),
                    position: employee.position,
                    date_calculate: salaryData.date_calculate,
                    total_salary: salaryData.total_salary,
                    hour_normal: salaryData.hour_normal,
                    hour_overtime: salaryData.hour_overtime,
                    total_km: salaryData.total_km,
                    a_parameter: salaryData.a_parameter,
                    b_parameter: salaryData.b_parameter,
                    c_parameter: salaryData.c_parameter,
                    d_parameter: salaryData.d_parameter_parameter,
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(buffer);

        // Optionally save the buffer to a file
        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }
    } catch (error) {
        console.error('Error exporting salary data to Excel:', error);
        return res.status(SYSTEM_ERROR).json({ error: 'Internal server error' });
    }
};