import React, { useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";

const ScanAttendance = () => {
  const { employeeID } = useParams();
  const history = useHistory();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Call an intermediate endpoint to fetch employeeID and call the check attendance API
        await axios.post("/employee/scan-attendance", { employeeID });
        // Redirect back to the main page after processing
        history.push("/");
      } catch (error) {
        console.error("Error scanning attendance:", error);
        // Handle error, you might want to redirect or show an error message
      }
    };

    fetchData();
  }, [employeeID, history]);

  return (
    <div>
      <h2>Scanning Attendance...</h2>
      {/* You can add a loader or some indication that attendance is being processed */}
    </div>
  );
};

export default ScanAttendance;
