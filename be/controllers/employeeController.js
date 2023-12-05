import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from "../constant/HttpStatus.js";
import AttendanceSchema from "../models/AttendanceSchema.js";
import EmployeeSchema from "../models/EmployeeSchema.js";
import { createError } from "../utils/error.js";

export const checkAttendance = async (req, res, next) => {
    const employeeID = req.body.employeeID;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const currentTime = new Date();
        const current_date = currentTime.toLocaleDateString();
        const day = currentTime.getDate();

        const date = employee.schedules.find(schedule => {
            return schedule.date.getDate() === day;
        });
        if (!date) return next(createError(NOT_FOUND, 'Design not found for the current day'));

        // Collect time ranges from shift_design
        const timeRanges = date.shift_design.map(shift => {
            const totalNumber = shift.time_slot.total_number;
            const startTime = shift.time_slot.detail[0].start_time;
            const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;
            return { startTime, endTime };
        });

        // Compare the current time with each time range
        const currentTimestamp = currentTime.getTime();
        let currentTimeRange = null;

        for (const timeRange of timeRanges) {
            const startTime = new Date(`${current_date} ${timeRange.startTime}`).getTime();
            const endTime = new Date(`${current_date} ${timeRange.endTime}`).getTime();
            if (currentTimestamp >= startTime && currentTimestamp <= endTime) {
                currentTimeRange = timeRange;
                break;
            }
        }

        // Find the corresponding shift_design based on currentTimeRange
        const currentShiftDesign = date.shift_design.find(shift => {
            const totalNumber = shift.time_slot.total_number;
            const startTime = shift.time_slot.detail[0].start_time;
            const endTime = totalNumber === 1 ? shift.time_slot.detail[0].end_time : shift.time_slot.detail[1].end_time;

            return startTime === currentTimeRange.startTime && endTime === currentTimeRange.endTime;
        });

        if (!currentShiftDesign) {
            return next(createError(NOT_FOUND, 'No matching shift design for the current time range'));
        }

        const shift_code = currentShiftDesign.shift_code;
        const time_slot = currentShiftDesign.time_slot;

        const existingAttendance = await AttendanceSchema.findOne({
            employee_id: employee.id,
            date: {
                $gte: new Date().setHours(0, 0, 0, 0),
                $lt: new Date().setHours(23, 59, 59, 999),
            },
        });

        if (!existingAttendance) {
            // only check in
            const newAttendance = new AttendanceSchema({
                date: date,
                employee_id: employeeID,
                employee_name: employee.name,
                department_name: employee.department_name,
                role: employee.role,
                position: employee.position,
                shift_info: {
                    shift_code: shift_code
                }
            });
            const [startHours, startMinutes] = time_slot.detail[0].start_time.split(':').map(Number);
            const startTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHours, startMinutes);
            // Calculate startTime - 30 minutes
            const startTimeMinus30 = new Date(startTime);
            startTimeMinus30.setMinutes(startTime.getMinutes() - 30);

            // Calculate startTime
            const startTimeOrigin = new Date(startTime);
            startTimeOrigin.setMinutes(startTime.getMinutes());
            if (currentTime > startTimeMinus30 && currentTime < startTimeOrigin) {
                // check in on time
                newAttendance.shift_info.time_slot.check_in = true;
                newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString()}`;
                newAttendance.shift_info.time_slot.check_in_status = 'on time';
                await newAttendance.save();
                return res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newAttendance,
                    log: `${currentTime}`,
                });
            } else if (currentTime > startTimeOrigin) {
                // check in late
                newAttendance.shift_info.time_slot.check_in = true;
                newAttendance.shift_info.time_slot.check_in_time = `${currentTime.toLocaleTimeString()}`;
                newAttendance.shift_info.time_slot.check_in_status = 'late';
                await newAttendance.save();
                return res.status(CREATED).json({
                    success: true,
                    status: CREATED,
                    message: newAttendance,
                    log: `${currentTime}`,
                });
            } else if (currentTime < startTimeMinus30) {
                // check in too soon
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: `You can not check in at this time ${currentTime.toLocaleTimeString()}`,
                });
            }
        } else {
            // only check out
            if (existingAttendance.shift_info.time_slot.check_in != true) {
                return res.status(BAD_REQUEST).json({
                    success: false,
                    status: BAD_REQUEST,
                    message: "You haven't check in yet",
                });
            } else {
                const checkInTime = new Date(existingAttendance.shift_info.time_slot.check_in_time);
                if (time_slot.total_number == 1) {
                    const [endHours, endMinutes] = time_slot.detail[0].end_time.split(':').map(Number);
                    const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

                    // Calculate endTime + 30 minutes
                    const endTimePlus30 = new Date(endTime);
                    endTimePlus30.setMinutes(endTime.getMinutes() + 30);
                    if (currentTime > endTime && currentTime < endTimePlus30) {
                        // check out on time
                        existingAttendance.shift_info.time_slot.check_out = true;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString()}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                        const timeDifference = currentTime - checkInTime;
                        const totalHours = timeDifference / (1000 * 60 * 60);
                        existingAttendance.shift_info.total_hour = totalHours;
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                            log: `${currentTime}`,
                        });
                    } else if (currentTime > endTimePlus30) {
                        // check out late
                        existingAttendance.shift_info.time_slot.check_out = true;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString()}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'late';
                        const timeDifference = currentTime - checkInTime;
                        const totalHours = timeDifference / (1000 * 60 * 60);
                        existingAttendance.shift_info.total_hour = totalHours;
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                            log: `${currentTime}`,
                        });
                    } else if (currentTime < endTime) {
                        // check out too soon
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                        });
                    }
                } else if (time_slot.total_number == 2) {
                    const [endHours, endMinutes] = time_slot.detail[1].end_time.split(':').map(Number);
                    const endTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);
                    // Calculate endTime + 30 minutes
                    const endTimePlus30 = new Date(endTime);
                    endTimePlus30.setMinutes(endTime.getMinutes() + 30);
                    if (currentTime > endTime && currentTime < endTimePlus30) {
                        // check out on time
                        existingAttendance.shift_info.time_slot.check_out = true;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString()}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'on time';
                        const timeDifference = currentTime - checkInTime;
                        const totalHours = timeDifference / (1000 * 60 * 60);
                        existingAttendance.shift_info.total_hour = totalHours;
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                            log: `${currentTime}`,
                        });
                    } else if (currentTime > endTimePlus30) {
                        // check out late
                        existingAttendance.shift_info.time_slot.check_out = true;
                        existingAttendance.shift_info.time_slot.check_out_time = `${currentTime.toLocaleTimeString()}`;
                        existingAttendance.shift_info.time_slot.check_out_status = 'late';
                        const timeDifference = currentTime - checkInTime;
                        const totalHours = timeDifference / (1000 * 60 * 60);
                        existingAttendance.shift_info.total_hour = totalHours;
                        await existingAttendance.save();
                        return res.status(OK).json({
                            success: true,
                            status: OK,
                            message: existingAttendance,
                            log: `${currentTime}`,
                        });
                    } else if (currentTime < endTime) {
                        // check out too soon
                        return res.status(BAD_REQUEST).json({
                            success: false,
                            status: BAD_REQUEST,
                            message: `You can not check out at this time ${currentTime.toLocaleTimeString()}`,
                        });
                    }
                }
            }
        };
    } catch (err) {
        next(err);
    }
}

export const getAttendanceHistory = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const year = req.query.year;
    const month = req.query.month;

    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found"))

        const query = {
            employee_id: employee.id,
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

export const getDateDesignInMonthByEmployee = async (req, res, next) => {
    const employeeID = req.query.employeeID;
    const targetMonth = req.body.month;
    try {
        const employee = await EmployeeSchema.findOne({ id: employeeID });
        if (!employee) return next(createError(NOT_FOUND, "Employee not found!"));

        // Filter schedules for the target month
        const schedulesInMonth = employee.schedules.filter(schedule => {
            const scheduleMonth = schedule.date.getMonth() + 1;
            return scheduleMonth === targetMonth;
        });

        if (schedulesInMonth.length === 0) {
            return res.status(NOT_FOUND).json({
                success: false,
                status: NOT_FOUND,
                message: `No schedules found for the employee in the specified month.`,
            });
        }

        res.status(OK).json({
            success: true,
            status: OK,
            message: schedulesInMonth,
        });
    } catch (err) {
        next(err);
    }
};