import fetch from 'node-fetch';
import QRCode from 'qrcode';

export const generateQR = async (data, options = {}) => {
  const {
    size = 200,
    color = '#000000',
    backgroundColor = '#FFFFFF',
    errorCorrectionLevel = 'M'
  } = options;

  try {
    // Use local QR code generation for better control
    const qrDataURL = await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: {
        dark: color,
        light: backgroundColor
      },
      errorCorrectionLevel
    });
    
    return qrDataURL;
  } catch (error) {
    console.error('QR generation error:', error);
    // Fallback to external API
    const api = process.env.QR_API || 'https://api.qrserver.com/v1/create-qr-code/';
    const url = `${api}?size=${size}x${size}&data=${encodeURIComponent(data)}&color=${color.replace('#', '')}&bgcolor=${backgroundColor.replace('#', '')}`;
    const resp = await fetch(url);
    return await resp.buffer();
  }
};

export const generateQRCodeForAsset = async (assetId, assetTag) => {
  const qrData = JSON.stringify({
    type: 'ASSET',
    id: assetId,
    tag: assetTag,
    timestamp: new Date().toISOString()
  });
  
  return await generateQR(qrData, {
    size: 200,
    color: '#000000',
    backgroundColor: '#FFFFFF'
  });
};

export const generateQRCodeForRoom = async (roomId, roomCode) => {
  const qrData = JSON.stringify({
    type: 'ROOM',
    id: roomId,
    code: roomCode,
    timestamp: new Date().toISOString()
  });
  
  return await generateQR(qrData, {
    size: 200,
    color: '#0066CC',
    backgroundColor: '#FFFFFF'
  });
};

export const generateQRCodeForLocation = async (locationId, locationName) => {
  const qrData = JSON.stringify({
    type: 'LOCATION',
    id: locationId,
    name: locationName,
    timestamp: new Date().toISOString()
  });
  
  return await generateQR(qrData, {
    size: 200,
    color: '#00AA00',
    backgroundColor: '#FFFFFF'
  });
};
