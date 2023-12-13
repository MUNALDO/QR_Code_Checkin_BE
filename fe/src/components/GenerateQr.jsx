import React, { useContext, useState } from "react";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const ScanQR = () => {
  const {
    user: { id: userID, department_name: departmentName },
  } = useContext(AuthContext);
  const [isAttendanceChecked, setAttendanceChecked] = useState(false);

  const verifyLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Check if the position is within your expected area
            // Example: if (position.coords.latitude === expectedLatitude && position.coords.longitude === expectedLongitude)
            // Adjust the condition to match your requirements
            console.log(position);
            resolve(true);
          },
          (error) => {
            console.error("Error getting location:", error);
            reject(error);
          }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
        reject(new Error("Geolocation not supported"));
      }
    });
  };

  const handleScan = async (data) => {
    if (data && !isAttendanceChecked) {
      try {
        const isLocationValid = await verifyLocation();
        if (!isLocationValid) {
          alert("You are not in the required location.");
          return;
        }

        setAttendanceChecked(true);
        const timestamp = new Date().toISOString();
        const expectedQRData = `QR code for department ${departmentName} - ${timestamp}`;

        if (data === expectedQRData) {
          const res = await axios.post(
            "https://qr-code-checkin.vercel.app/api/employee/check-attendance",
            { employeeID: userID },
            { withCredentials: true }
          );

          if (res.data.success) {
            alert("Attendance checked successfully!");
          } else {
            alert("Expired QR code. Please generate a new QR code.");
          }
        } else {
          alert("Invalid QR code. Please scan the correct QR code.");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred.");
      } finally {
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
