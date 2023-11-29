import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './ScheduleTable.css';

const ScheduleTable = () => {
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(null);

  const handleYearChange = (date) => {
    setSelectedYear(date);
    setSelectedMonth(null);
  };

  const handleMonthChange = (date) => {
    setSelectedMonth(date);
  };

  const renderTileContent = ({ date, view }) => {
    if (view === 'year') {
      const month = date.getMonth() + 1;
      return <div>{`Month ${month}`}</div>;
    }
    return null;
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const renderDaysOfWeek = () => {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return daysOfWeek.map((day, index) => (
      <div key={index} className="day-header">
        {day}
      </div>
    ));
  };

  const renderCalendarDays = () => {
    const year = selectedYear.getFullYear();
    const month = selectedMonth.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const calendarDays = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="empty-day"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(
        <div key={day} className="calendar-day">
          {day}
        </div>
      );
    }

    return calendarDays;
  };

  return (
    <div>
      <h2>Schedule Calendar</h2>

      <div className="calendar-dropdowns">
        <Calendar
          onChange={handleYearChange}
          value={selectedYear}
          tileContent={renderTileContent}
          view="year"
          showNeighboringMonth={false}
        />
        {selectedYear && (
          <Calendar
            onChange={handleMonthChange}
            value={selectedMonth}
            view="month"
            showNeighboringMonth={false}
          />
        )}
      </div>

      {selectedMonth && (
        <div className="calendar-container">
          <div className="days-of-week">{renderDaysOfWeek()}</div>
          <div className="calendar-days">{renderCalendarDays()}</div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTable;
