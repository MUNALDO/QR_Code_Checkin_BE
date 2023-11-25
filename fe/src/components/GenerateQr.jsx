import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import QRCode from "react-qr-code";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import "./generateQR.css";
import { useNavigate } from "react-router-dom";

const GenerateQR = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) {
    navigate("/loginEmployee");
  }

  const [isAttendanceChecked, setAttendanceChecked] = useState(false);
  const [isScanning, setScanning] = useState(false);
  const [qrData, setQRData] = useState(`qr code for employee - ${Date.now()}`);

  useEffect(() => {
    // Function to update QR code data
    const updateQRCode = () => {
      const timestamp = new Date().toISOString();
      setQRData(`QR code for employee - ${timestamp}, https://qr-code-checkin-be.vercel.app/generate-qr`);
    };

    // Manually update QR code on initial render
    updateQRCode();

    // Automatically refresh QR code every 20 seconds
    const intervalId = setInterval(updateQRCode, 20000);

    return () => {
      // Cleanup interval on component unmount
      clearInterval(intervalId);
    };
  }, []);

  const handleScan = async (data) => {
    if (data && !isAttendanceChecked) {
      // console.log(data.text);

      try {
        setAttendanceChecked(true);

        if (data.text === qrData) {
          const res = await axios.post("https://qr-code-checkin.vercel.app/api/employee/check-attendance", {
            employeeID: user.id,
          });

          // console.log(res);

          if (res.data.success) {
            alert("Attendance checked successfully!");
            // You can navigate to another page or show a success message here
          } else {
            alert("Expired QR code. Please generate a new QR code.");
          }
        } else {
          alert("Invalid QR code format.");
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

  const startScan = () => {
    // Manually start the scanning process
    setScanning(true);
  };

  return (
    <div className="generate-qr-container">
      <h2>Your QR Code</h2>
      {qrData && (
        <QRCode
          value={qrData}
          className={isScanning ? "qr-code scanning" : "qr-code"}
        />
      )}

      {isScanning && (
        <QrScanner
          onScan={handleScan}
          onError={handleError}
          style={{ width: "100%" }}
        />
      )}

      {!isScanning && <button onClick={startScan}>Scan QR Code</button>}
    </div>
  );
};

export default GenerateQR;
