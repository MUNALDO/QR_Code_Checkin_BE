import React, { useState, useEffect, useContext } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./calendar.css";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";

const ScheduleTable = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [employeeData, setEmployeeData] = useState(null);

  const {
    user: { id: userID },
  } = useContext(AuthContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `https://qr-code-checkin.vercel.app/api/employee/get-schedules?employeeID=${userID}`,
          {
            // Include the current month in the request body
            data: { month: selectedMonth.getMonth() + 1 },
          }
        );
        setEmployeeData(res.data);
      } catch (error) {
        console.error("Error fetching employee data:", error);
      }
    };

    fetchData();
  }, [userID, selectedMonth]);

  const renderTileContent = ({ date }) => {
    if (!employeeData || !employeeData.message) return null;

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const schedules = employeeData.message;

    const scheduleOnDate = schedules.find((schedule) => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate.toDateString() === date.toDateString();
    });

    if (!scheduleOnDate) return null;

    const isDayOff = scheduleOnDate.shift_design.some(
      (shift) => shift.time_slot && shift.time_slot.total_number === 0
    );

    return (
      <div className={`calendar-tile ${isDayOff ? "day-off" : ""}`}>
        {isDayOff ? (
          <div className="day-off">{/* Render day-off content here */}</div>
        ) : (
          <div
            className={`work-day ${scheduleOnDate.shift_design[0].shift_code}`}
          >
            {/* Render work schedule content here */}
          </div>
        )}
      </div>
    );
  };

  // const handleMonthChange = (date) => {
  //   setSelectedMonth(date);
  // };

  return (
    <div>
      <h2>Schedule Calendar</h2>
      {selectedMonth && (
        <Calendar
          // Remove selectedYear state and handleMonthChange function
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
