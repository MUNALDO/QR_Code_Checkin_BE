import React, { useContext, useEffect, useState } from "react";
import QrScanner from "react-qr-scanner";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { BrowserBarcodeReader } from "@zxing/library";
import { VideoInputDevice, VideoInputDevices } from "@zxing/library/esm/browser/BrowserCodeReader";

const ScanQR = () => {
  const {
    user: { id: userID },
  } = useContext(AuthContext);
  const [isAttendanceChecked, setAttendanceChecked] = useState(false);

  const [devices, setDevices] = useState < VideoInputDevices > [];
  const [selectedDevice, setSelectedDevice] =
    (useState < VideoInputDevice) | (null > null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const videoDevices = await BrowserBarcodeReader.listVideoInputDevices();
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Use the first video device as the default
          setSelectedDevice(videoDevices[0]);
        }
      } catch (error) {
        console.error("Error listing video devices:", error);
      }
    };

    fetchDevices();
  }, []);

  const handleScan = async (data) => {
    if (data && !isAttendanceChecked) {
      try {
        setAttendanceChecked(true);

        const res = await axios.post(
          "https://qr-code-checkin.vercel.app/api/employee/check-attendance",
          {
            employeeID: userID,
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
      {devices.length > 0 && (
        <>
          <label htmlFor="cameraSelect">Select Camera:</label>
          <select
            id="cameraSelect"
            onChange={(e) =>
              setSelectedDevice(
                devices.find((device) => device.deviceId === e.target.value) ||
                  null
              )
            }
            value={selectedDevice?.deviceId || ""}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${devices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </>
      )}
      <react-zxing-scanner
        onScan={(data: any) => handleScan(data)}
        onError={handleError}
        style={{ width: "100%" }}
        deviceId={selectedDevice?.deviceId}
      />
    </div>
  );
};

export default ScanQR;
