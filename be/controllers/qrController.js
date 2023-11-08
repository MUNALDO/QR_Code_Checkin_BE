import qr from 'qrcode';
import { OK, SYSTEM_ERROR } from '../constant/HttpStatus.js';

const localIpAddress = process.env.IP_ADDRESS;
const port = 8800;
const url = `http://${localIpAddress}:${port}`;

export const generateQRCode = (req, res) => {
    qr.toFile('Home_QR.png', url, (err) => {
        if (err) {
            console.error(err);
            res.status(SYSTEM_ERROR).json({ error: 'Failed to generate QR code' });
        } else {
            console.log('QR code for your web application generated and saved as my_web_app_qr_code.png');
            res.status(OK).json({ success: 'QR code generated and saved' });
        }
    });
}
