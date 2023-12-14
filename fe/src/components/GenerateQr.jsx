import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

const GenerateQR = () => {
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [qrData, setQRData] = useState(`QR code for department - ${Date.now()}`);

    useEffect(() => {
        const updateQRCode = () => {
            const timestamp = new Date().toISOString();
            setQRData(`QR code for department ${selectedDepartment} - ${timestamp}`);
        };

        updateQRCode();

        const intervalId = setInterval(updateQRCode, 20000);

        return () => {
            clearInterval(intervalId);
        };
    }, [selectedDepartment]);

    const handleDepartmentChange = (event) => {
        setSelectedDepartment(event.target.value);
    };

    return (
        <div className="generate-qr-container">
            <label htmlFor="department">Choose a department:</label>
            <select id="department" value={selectedDepartment} onChange={handleDepartmentChange}>
                <option value="">Select Department</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
                <option value="C3">C3</option>
                <option value="C4">C4</option>
                <option value="C5">C5</option>
                <option value="C6">C6</option>
                <option value="C Ulm">C Ulm</option>
                <option value="Wabi">Wabi</option>
                <option value="Buero">Buero</option>
                <option value="FacTech">FacTech</option>
            </select>

            <h2>Your QR Code</h2>
            {qrData && <QRCode value={qrData} className="qr-code" />}
        </div>
    );
};

export default GenerateQR;
