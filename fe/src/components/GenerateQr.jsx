// import React, { useContext, useEffect, useState } from "react";
// import { AuthContext } from "../context/AuthContext";
// import QRCode from "react-qr-code";
// import QrScanner from "react-qr-scanner";
// import axios from "axios";
// import "./generateQR.css";
// import { useNavigate } from "react-router-dom";

// const GenerateQR = () => {
//   const { user } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const [isAttendanceChecked, setAttendanceChecked] = useState(false);

//   const handleScan = async (data) => {
//     if (data && !isAttendanceChecked) {
//       try {
//         setAttendanceChecked(true); // Set the state to prevent multiple calls
  
//         const res = await axios.post("/employee/check-attendance", {
//           employeeID: user.id,
//         });
  
//         console.log(res);
  
//         if (res.data.success) {
//           alert("Attendance checked successfully!");
//           // You can navigate to another page or show a success message here
//         } else {
//           alert("Failed to check attendance. Please try again.");
//         }
//       } catch (error) {
//         console.error("Error checking attendance:", error);
//         alert("An error occurred while checking attendance.");
//       } finally {
//         // Introduce a delay before allowing another API call (e.g., 5 seconds)
//         setTimeout(() => {
//           setAttendanceChecked(false);
//         }, 30000);
//       }
//     }
//   };

//   const handleError = (error) => {
//     console.error("QR code scanning error:", error);
//   };

//   const [qrData, setQRData] = useState("");

//   useEffect(() => {
//     // Generate your QR code data based on user information or any relevant data
//     if (user) {
//       const data = `User: ${user.name}, ID: ${user.id}`;
//       setQRData(data);
//       setAttendanceChecked(false); // Reset the state when user changes
//     }
//   }, [user]);

//   return (
//     <div className="generate-qr-container">
//       <h2>Your QR Code</h2>
//       {qrData && <QRCode value={qrData} className="qr-code" />}

//       {/* QR Code scanner component */}
//       <QrScanner onScan={handleScan} onError={handleError} style={{ width: "100%" }} />
//     </div>
//   );
// };

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

  const handleScan = async (data) => {
    if (data && !isAttendanceChecked) {
      try {
        setAttendanceChecked(true);

        const res = await axios.post("/employee/check-attendance", {
          employeeID: user.id,
        });

        console.log(res);

        if (res.data.success) {
          alert("Attendance checked successfully!");
          // You can navigate to another page or show a success message here
        } else {
          alert("Failed to check attendance. Please try again.");
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

  const [qrData, setQRData] = useState("");

  useEffect(() => {
    if (user) {
      const data = `User: ${user.name}, ID: ${user.id}`;
      setQRData(data);
      setAttendanceChecked(false);
    }
  }, [user]);

  const startScan = () => {
    // Manually start the scanning process
    setScanning(true);
  };

  return (
    <div className="generate-qr-container">
      <h2>Your QR Code</h2>
      {qrData && <QRCode value={qrData} className="qr-code" />}

      {/* Conditionally render QR Code scanner component */}
      {isScanning && <QrScanner onScan={handleScan} onError={handleError} style={{ width: "100%" }} />}

      {/* Scan button */}
      {!isScanning && <button onClick={startScan}>Scan QR Code</button>}
    </div>
  );
};

export default GenerateQR;
