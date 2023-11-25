// GenerateQR.js
import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";

const GenerateQR = () => {
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

  return (
    <div className="generate-qr-container">
      <h2>Your QR Code</h2>
      {qrData && <QRCode value={qrData} className="qr-code" />}
    </div>
  );
};

export default GenerateQR;
