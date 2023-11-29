import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const ScheduleTable = () => {
  const [selectedMonth, setSelectedMonth] = useState(null);

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

  return (
    <div>
      <h2>Schedule Calendar</h2>

      <Calendar
        onChange={handleMonthChange}
        value={selectedMonth}
        tileContent={renderTileContent}
        view="year"
        showNeighboringMonth={false}
      />

      {selectedMonth && (
        <Calendar
          value={selectedMonth}
          view="month"
          showNeighboringMonth={false}
          tileContent={({ date, view }) =>
            view === 'month' ? <div>{date.getDate()}</div> : null
          }
        />
      )}
    </div>
  );
};

export default ScheduleTable;
