import React, { useContext, useState } from "react";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const ScanQR = () => {
  const {
    user: { id: userID },
  } = useContext(AuthContext);
  const [isAttendanceChecked, setAttendanceChecked] = useState(false);

  const handleScan = async (data) => {
    if (data && !isAttendanceChecked) {
      try {
        setAttendanceChecked(true);

        const res = await axios.post(
          "https://qr-code-checkin.vercel.app/api/employee/check-attendance",
          {
            employeeID: userID,
          },
          { withCredentials: true },
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
        key="environment"
        constraints={{ audio: false, video: { facingMode: "environment" } }}
      />
    </div>
  );
};

export default ScanQR;
