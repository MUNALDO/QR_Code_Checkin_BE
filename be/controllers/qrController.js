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

// export const scanQRCode = (req, res) => {
//     let requesterIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

//     // Handle IPv6-mapped IPv4 addresses
//     const ipv4Match = requesterIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
//     if (ipv4Match) {
//         requesterIp = ipv4Match[1];
//     }

//     console.log(requesterIp);
//     if (requesterIp === localIpAddress) {
//         console.log(`Device with IP ${requesterIp} successfully scanned the QR code.`);
//         res.status(OK).json({ success: 'QR code scanned successfully' });
//     } else {
//         console.log(`Device with IP ${requesterIp} attempted to scan the QR code but is not on the allowed network.`);
//         res.status(FORBIDDEN).json({ error: 'Access denied' });
//     }
// }
