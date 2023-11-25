// ScanQR.js
import React, { useContext, useState } from "react";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
// import { useNavigate } from "react-router-dom";

const ScanQR = () => {
  const { user } = useContext(AuthContext);
  // const navigate = useNavigate();
  const [isAttendanceChecked, setAttendanceChecked] = useState(false);

  const handleScan = async (data) => {
    if (data && !isAttendanceChecked) {
      try {
        setAttendanceChecked(true);

        // Assume you have the checkAttendance function defined in your API
        const res = await axios.post(
          "https://qr-code-checkin.vercel.app/api/employee/check-attendance",
          {
            employeeID: user.id,
          }
        );

        if (res.data.success) {
          alert("Attendance checked successfully!");
          // You can navigate to another page or show a success message here
        } else {
          alert("Expired QR code. Please generate a new QR code.");
        }
      } catch (error) {
        console.error("Error checking attendance:", error);
        alert("An error occurred while checking attendance.");
      } finally {
        // Reset the state after the API call
        setAttendanceChecked(false);
      }
    }
  };

  const handleError = (error) => {
    console.error("QR code scanning error:", error);
  };

  return (
    <div className="scan-qr-container">
      <h2>Scan QR Code</h2>
      <QrScanner
        onScan={handleScan}
        onError={handleError}
        style={{ width: "100%" }}
        facingMode="environment"
      />
    </div>
  );
};

export default ScanQR;
