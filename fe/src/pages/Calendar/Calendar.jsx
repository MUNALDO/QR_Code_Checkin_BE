import React, { useState, useEffect, useContext } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./calendar.css";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const ScheduleTable = () => {
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);

  const {
    user: { id: userID },
  } = useContext(AuthContext);
  // console.log(employeeData.message);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `https://qr-code-checkin.vercel.app/api/admin/manage-employee/get-employee-byId?employeeID=${userID}`
        );

        setEmployeeData(res.data);
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }
    };

    fetchData();
  }, [userID]);

  const renderTileContent = ({ date }) => {
    if (!employeeData || !employeeData.message.schedules) return null;

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const workSchedules = [];
    let hasDayOff = false;
    const dayOffSchedules = [];

    employeeData.message.schedules.forEach((schedule) => {
      if (schedule.dayOff_schedules) {
        schedule.dayOff_schedules.forEach((dayOffSchedule) => {
          const dayOffWeekday = new Date(year, month, day);
          const dayOffDate = new Date(
            dayOffSchedule.date.includes("/")
              ? `${year}/${dayOffSchedule.date}`
              : dayOffSchedule.date
          );

          if (
            dayOffSchedule.date.toLowerCase() ===
              dayOffWeekday.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() ||
            dayOffDate.toDateString() === date.toDateString()
          ) {
            hasDayOff = true;
            dayOffSchedules.push(dayOffSchedule.type);
          }
        });
      }

      if (schedule.work_schedules) {
        schedule.work_schedules.forEach((workSchedule) => {
          const workDate = new Date(year, month, day);
          if (
            workSchedule.date.toLowerCase() ===
              workDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() &&
            !hasDayOff
          ) {
            workSchedules.push(workSchedule.shift_code);
          }
        });
      }
    });

    return (
      <div
        className={`calendar-tile ${hasDayOff ? "day-off" : ""}`}
      >
        {hasDayOff ? (
          dayOffSchedules.map((dayOffType, index) => (
            <div key={index} className="day-off">
              {dayOffType}
            </div>
          ))
        ) : (
          workSchedules.map((shiftCode, index) => (
            <div key={index} className={`work-day ${shiftCode}`}>
              {shiftCode}
            </div>
          ))
        )}
      </div>
    );
  };

  const handleMonthChange = (date) => {
    setSelectedMonth(date);
  };

  return (
    <div>
      <h2>Schedule Calendar</h2>
        {selectedYear && (
          <Calendar
            onChange={handleMonthChange}
            value={selectedMonth}
            view="month"
            showNeighboringMonth={false}
            tileContent={renderTileContent}
          />
        )}
    </div>
  );
};

export default ScheduleTable;
