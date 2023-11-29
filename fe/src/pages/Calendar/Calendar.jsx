import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const ScheduleTable = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const renderTileContent = ({ date, view }) => {
    if (view === 'year') {
      // Customize the content for each month
      // You can replace this logic with your schedule data
      const month = date.getMonth() + 1;
      return <div>{`Month ${month}`}</div>;
    }
    return null;
  };

  return (
    <div>
      <h2>Schedule Calendar</h2>

      <Calendar
        onChange={handleDateChange}
        value={selectedDate}
        tileContent={renderTileContent}
        showNeighboringMonth={false}
        calendarType="ISO 8601"
        view="year"
        minDetail="year"
        maxDetail="decade"
      />
    </div>
  );
};

export default ScheduleTable;
