import { NOT_FOUND, SYSTEM_ERROR } from "../constant/HttpStatus.js";
import ExcelJS from 'exceljs';
import fs from 'fs';
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import AdminSchema from "../models/AdminSchema.js";

export const exportAttendanceToExcel = async (req, res, next) => {
    const { year, month, employeeID, department_name } = req.query;
    try {
        const query = {
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
        };

        if (employeeID) {
            query.employee_id = employeeID;
        }

        if (department_name) {
            query.department_name = department_name;
        }

        const attendanceList = await AttendanceSchema.find(query);

        if (!attendanceList || attendanceList.length === 0) {
            return res.status(NOT_FOUND).json({ error: "No attendance data found for the specified criteria" });
        }

        const fileName = `Employee_Attendance_Data_${year}_${month}.xlsx`;
        const filePath = `../${fileName}`;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employee Attendance Data');

        // Define the columns for the Excel sheet (Add or modify as per your schema)
        const columns = [
            { header: 'Month', key: 'month', width: 15 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Employee ID', key: 'employee_id', width: 15 },
            { header: 'Employee Name', key: 'employee_name', width: 20 },
            { header: 'Department', key: 'department_name', width: 20 },
            { header: 'Position', key: 'position', width: 15 },
            { header: 'Shift Code', key: 'shift_code', width: 15 },
            { header: 'Shift Type', key: 'shift_type', width: 15 },
            { header: 'Check In Time', key: 'check_in_time', width: 15 },
            { header: 'Check Out Time', key: 'check_out_time', width: 15 },
            { header: 'Total Hours', key: 'total_hour', width: 10 },
            { header: 'Total Minutes', key: 'total_minutes', width: 10 },
            { header: 'Check In Km', key: 'check_in_km', width: 10 },
            { header: 'Check Out Km', key: 'check_out_km', width: 10 },
            { header: 'Total Km', key: 'total_km', width: 10 },
            { header: 'Revenue', key: 'revenue', width: 10 },
            { header: 'Tips', key: 'tips', width: 10 },
            { header: 'Others', key: 'others', width: 10 },
        ];

        worksheet.columns = columns;

        // Group by month and then by date
        const groupedByDate = groupByDate(attendanceList);
        const groupedByMonth = year ? groupByMonth(groupedByDate) : groupedByDate;

        groupedByMonth.forEach((monthData) => {
            monthData.dates?.forEach((dateData) => {
                try {
                    dateData.attendanceList?.forEach((attendance, index) => {
                        const date = new Date(attendance.date);
                        const rowData = {
                            month: index === 0 ? date.getMonth() + 1 : null,
                            date: index === 0 ? date.toLocaleDateString().split('T')[0] : null,
                            employee_id: attendance.employee_id,
                            employee_name: attendance.employee_name,
                            department_name: attendance.department_name,
                            position: attendance.position,
                            shift_code: attendance.shift_info.shift_code,
                            shift_type: attendance.shift_info.shift_type,
                            check_in_time: attendance.shift_info.time_slot.check_in_time,
                            check_out_time: attendance.shift_info.time_slot.check_out_time,
                            total_hour: attendance.shift_info.total_hour,
                            total_minutes: attendance.shift_info.total_minutes,
                            check_in_km: attendance.check_in_km ? attendance.check_in_km : '',
                            check_out_km: attendance.check_out_km ? attendance.check_out_km : '',
                            total_km: attendance.total_km ? attendance.total_km : '',
                            revenue: attendance.revenue ? attendance.revenue : '',
                            tips: attendance.tips ? attendance.tips : '',
                            others: attendance.others ? attendance.others : ''
                        };
                        worksheet.addRow(rowData);
                    })
                } catch (error) {
                    next(error);
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(buffer);

        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }
    } catch (error) {
        console.error('Error exporting attendance data to Excel:', error);
        return res.status(SYSTEM_ERROR).json({ error: 'Internal server error' });
    }
};

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

function groupByMonth(attendanceList) {
    const groupedData = new Map();

    attendanceList.forEach((data) => {
        const year = data.date.getFullYear();
        const month = data.date.getMonth() + 1;

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
        .sort((a, b) => new Date(a.year, a.month - 1) - new Date(b.year, b.month - 1));
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
            { header: 'Date Calculate', key: 'date_calculate', width: 15 },
            { header: 'Total Salary', key: 'total_salary', width: 15 },
            { header: 'Normal Hours', key: 'hour_normal', width: 25 },
            { header: 'Overtime Hours', key: 'hour_overtime', width: 25 },
            { header: 'Total KM', key: 'total_km', width: 10 },
            { header: 'a Parameter', key: 'a_parameter', width: 15 },
            { header: 'b Parameter', key: 'b_parameter', width: 15 },
            { header: 'c Parameter', key: 'c_parameter', width: 15 },
            { header: 'd Parameter', key: 'd_parameter', width: 15 },
        ];
        worksheet.columns = columns;

        employees.forEach(employee => {
            const salaryData = employee.salary.find(s => s.year === parseInt(year) && s.month === parseInt(month));

            let normalHoursDetails, overtimeHoursDetails;
            if (salaryData) {
                normalHoursDetails = salaryData.hour_normal.map(h => `${h.department_name}: ${h.total_hour}h ${h.total_minutes}m`).join('; ');
                overtimeHoursDetails = salaryData.hour_overtime.map(h => `${h.department_name}: ${h.total_hour}h ${h.total_minutes}m`).join('; ');
            }

            worksheet.addRow({
                id: employee.id || '',
                name: employee.name || '',
                date_calculate: salaryData ? salaryData.date_calculate : '',
                total_salary: salaryData ? salaryData.total_salary : '',
                hour_normal: normalHoursDetails || '',
                hour_overtime: overtimeHoursDetails || '',
                total_km: salaryData ? salaryData.total_km : '',
                a_parameter: salaryData ? salaryData.a_parameter : '',
                b_parameter: salaryData ? salaryData.b_parameter : '',
                c_parameter: salaryData ? salaryData.c_parameter : '',
                d_parameter: salaryData ? salaryData.d_parameter : '',
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(buffer);

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

export const exportAttendanceForInhaberToExcel = async (req, res, next) => {
    const { year, month, inhaber_name } = req.query;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) {
            return res.status(NOT_FOUND).json({ error: "Inhaber not found" });
        }

        const query = {
            date: {
                $gte: new Date(year, month ? month - 1 : 0, 1, 0, 0, 0, 0),
                $lt: new Date(year, month ? month : 12, 1, 0, 0, 0, 0),
            },
            department_name: inhaber.department_name
        };

        const attendanceList = await AttendanceSchema.find(query);

        if (!attendanceList || attendanceList.length === 0) {
            return res.status(NOT_FOUND).json({ error: "No attendance data found for Inhaber's department" });
        }

        const fileName = `Employee_Attendance_Data_For_Inhaber_${inhaber_name}_${year}_${month}.xlsx`;
        const filePath = `../${fileName}`;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employee Attendance Data');

        // Define the columns for the Excel sheet (Add or modify as per your schema)
        const columns = [
            { header: 'Month', key: 'month', width: 15 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Employee ID', key: 'employee_id', width: 15 },
            { header: 'Employee Name', key: 'employee_name', width: 20 },
            { header: 'Department', key: 'department_name', width: 20 },
            { header: 'Position', key: 'position', width: 15 },
            { header: 'Shift Code', key: 'shift_code', width: 15 },
            { header: 'Shift Type', key: 'shift_type', width: 15 },
            { header: 'Check In Time', key: 'check_in_time', width: 15 },
            { header: 'Check Out Time', key: 'check_out_time', width: 15 },
            { header: 'Total Hours', key: 'total_hour', width: 10 },
            { header: 'Total Minutes', key: 'total_minutes', width: 10 },
            { header: 'Check In Km', key: 'check_in_km', width: 10 },
            { header: 'Check Out Km', key: 'check_out_km', width: 10 },
            { header: 'Total Km', key: 'total_km', width: 10 },
            { header: 'Revenue', key: 'revenue', width: 10 },
            { header: 'Tips', key: 'tips', width: 10 },
            { header: 'Others', key: 'others', width: 10 },
        ];
        worksheet.columns = columns;

        const groupedByDate = groupByDate(attendanceList);
        const groupedByMonth = year ? groupByMonth(groupedByDate) : groupedByDate;

        groupedByMonth.forEach((monthData) => {
            monthData.dates?.forEach((dateData) => {
                dateData.attendanceList?.forEach((attendance, index) => {
                    const date = new Date(attendance.date);
                    const rowData = {
                        month: index === 0 ? date.getMonth() + 1 : null,
                        date: index === 0 ? date.toLocaleDateString().split('T')[0] : null,
                        employee_id: attendance.employee_id,
                        employee_name: attendance.employee_name,
                        department_name: attendance.department_name,
                        position: attendance.position,
                        shift_code: attendance.shift_info.shift_code,
                        shift_type: attendance.shift_info.shift_type,
                        check_in_time: attendance.shift_info.time_slot.check_in_time,
                        check_out_time: attendance.shift_info.time_slot.check_out_time,
                        total_hour: attendance.shift_info.total_hour,
                        total_minutes: attendance.shift_info.total_minutes,
                        check_in_km: attendance.check_in_km ? attendance.check_in_km : '',
                        check_out_km: attendance.check_out_km ? attendance.check_out_km : '',
                        total_km: attendance.total_km ? attendance.total_km : '',
                        revenue: attendance.revenue ? attendance.revenue : '',
                        tips: attendance.tips ? attendance.tips : '',
                        others: attendance.others ? attendance.others : ''
                    };
                    worksheet.addRow(rowData);
                });
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(buffer);

        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }
    } catch (error) {
        console.error('Error exporting attendance data for Inhaber to Excel:', error);
        return res.status(SYSTEM_ERROR).json({ error: 'Internal server error' });
    }
};

export const exportEmployeeDataForInhaberToExcel = async (req, res, next) => {
    const inhaber_name = req.query.inhaber_name;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) {
            return res.status(NOT_FOUND).json({ error: "Inhaber not found" });
        }

        // Fetch employees who are in the Inhaber's department
        const employees = await EmployeeSchema.find({ 'department.name': inhaber.department_name });

        if (!employees || employees.length === 0) {
            return res.status(NOT_FOUND).json({ error: "No employee data found in Inhaber's department" });
        }

        const fileName = `Employee_Data_For_Inhaber_${inhaber_name}.xlsx`;
        const filePath = `../${fileName}`;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employee Data');

        // Define columns for the Excel sheet
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
            // Filter and format the data to include only the information relevant to the Inhaber's department
            const departmentData = employee.department.find(dept => dept.name === inhaber.department_name);
            if (departmentData) {
                // Create a row with the necessary information
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
                    departments: departmentData.name,
                    positions: departmentData.position,
                };
                worksheet.addRow(row);
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(buffer);

        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }
    } catch (error) {
        console.error('Error exporting employee data for Inhaber to Excel:', error);
        return res.status(SYSTEM_ERROR).json({ error: 'Internal server error' });
    }
};

export const exportEmployeeSalaryDataForInhaberToExcel = async (req, res, next) => {
    const { year, month, inhaber_name } = req.query;
    try {
        const inhaber = await AdminSchema.findOne({ name: inhaber_name });
        if (!inhaber) {
            return res.status(NOT_FOUND).json({ error: "Inhaber not found" });
        }

        // Fetch employees who are in the Inhaber's department
        const employees = await EmployeeSchema.find({ 'department.name': inhaber.department_name });

        if (!employees || employees.length === 0) {
            return res.status(NOT_FOUND).json({ error: "No salary data found for Inhaber's department" });
        }

        const fileName = `Employee_Salary_Data_For_Inhaber_${inhaber_name}_${year}_${month}.xlsx`;
        const filePath = `../${fileName}`;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employee Salary Data');

        const columns = [
            { header: 'ID', key: 'id', width: 20 },
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Date Calculate', key: 'date_calculate', width: 15 },
            { header: 'Total Salary', key: 'total_salary', width: 15 },
            { header: 'Normal Hours', key: 'hour_normal', width: 25 },
            { header: 'Overtime Hours', key: 'hour_overtime', width: 25 },
            { header: 'Total KM', key: 'total_km', width: 10 },
            { header: 'a Parameter', key: 'a_parameter', width: 15 },
            { header: 'b Parameter', key: 'b_parameter', width: 15 },
            { header: 'c Parameter', key: 'c_parameter', width: 15 },
            { header: 'd Parameter', key: 'd_parameter', width: 15 },
        ];
        worksheet.columns = columns;

        employees.forEach(employee => {
            const salaryData = employee.salary.find(s => s.year === parseInt(year) && s.month === parseInt(month));

            // Ensure the salary data is related to the Inhaber's department
            if (salaryData && employee.department.some(dept => dept.name === inhaber.department_name)) {
                let normalHoursDetails, overtimeHoursDetails;

                normalHoursDetails = salaryData.hour_normal.map(h => `${h.department_name}: ${h.total_hour}h ${h.total_minutes}m`).join('; ');
                overtimeHoursDetails = salaryData.hour_overtime.map(h => `${h.department_name}: ${h.total_hour}h ${h.total_minutes}m`).join('; ');
                const row = {
                    id: employee.id || '',
                    name: employee.name || '',
                    date_calculate: salaryData ? salaryData.date_calculate : '',
                    total_salary: salaryData ? salaryData.total_salary : '',
                    hour_normal: normalHoursDetails || '',
                    hour_overtime: overtimeHoursDetails || '',
                    total_km: salaryData ? salaryData.total_km : '',
                    a_parameter: salaryData ? salaryData.a_parameter : '',
                    b_parameter: salaryData ? salaryData.b_parameter : '',
                    c_parameter: salaryData ? salaryData.c_parameter : '',
                    d_parameter: salaryData ? salaryData.d_parameter : '',
                };
                worksheet.addRow(row);
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(buffer);

        try {
            fs.writeFileSync(filePath, buffer);
            console.log(`Excel file saved to ${filePath}`);
        } catch (error) {
            next(error);
        }
    } catch (error) {
        console.error('Error exporting salary data for Inhaber to Excel:', error);
        return res.status(SYSTEM_ERROR).json({ error: 'Internal server error' });
    }
};
