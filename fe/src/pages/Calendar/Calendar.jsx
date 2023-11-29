import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './calendar.css';

const ScheduleTable = () => {
  const [selectedYear, setSelectedYear] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(null);

  const handleMonthChange = (date) => {
    setSelectedMonth(date);
  };

  return (
    <div>
      <h2>Schedule Calendar</h2>
      <div className="calendar-dropdowns">
        {selectedYear && (
          <Calendar
            onChange={handleMonthChange}
            value={selectedMonth}
            view="month"
            showNeighboringMonth={false}
          />
        )}
      </div>
    </div>
  );
};

export default ScheduleTable;
