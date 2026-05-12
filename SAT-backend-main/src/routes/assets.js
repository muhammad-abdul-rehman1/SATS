import express from 'express';
import Asset from '../models/Asset.js';
import Room from '../models/Room.js';
import ScanLog from '../models/ScanLog.js';
import { isAuthenticated } from '../middleware/auth.js';
import { generateQRCodeForAsset, generateQR } from '../utils/qrcode-proxy.js';

const router = express.Router();

// Get all assets with filtering
router.get('/', isAuthenticated, async (req, res) => {
  try {
    let query = {};
    
    // Normal users can only see assets assigned to them
    if (req.user.role !== 'SUPER_ADMIN') {
      query.ownerId = req.user._id;
    }

    // Apply filters from query params
    const { search, type, status, roomId } = req.query;

    if (search) {
      // Find rooms that match the search term
      const matchedRooms = await Room.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const matchedRoomIds = matchedRooms.map(r => r._id);

      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetTag: { $regex: search, $options: 'i' } },
        { roomId: { $in: matchedRoomIds } }
      ];
    }

    if (type) {
      query.assetType = type;
    }

    if (status) {
      query.status = status;
    }

    if (roomId) {
      query.roomId = roomId;
    }
    
    const assets = await Asset.find(query)
      .populate('ownerId', 'name email')
      .populate('roomId', 'name code building floor')
      .sort({ createdAt: -1 });
    
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assets', error: error.message });
  }
});

// Get single asset
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('roomId', 'name code building floor latitude longitude');
    
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId?._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching asset', error: error.message });
  }
});

// Create new asset (Super Admin only)
router.post('/', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can create assets' });
    }
    
    const assetData = req.body;
    
    // Generate QR code data
    const qrData = JSON.stringify({
      type: 'ASSET',
      id: 'temp', // Will be updated after creation
      tag: assetData.assetTag,
      timestamp: new Date().toISOString()
    });
    
    const asset = await Asset.create({
      ...assetData,
      qrCode: qrData
    });
    
    // Update QR code with actual asset ID
    asset.qrCode = JSON.stringify({
      type: 'ASSET',
      id: asset._id,
      tag: asset.assetTag,
      timestamp: new Date().toISOString()
    });
    await asset.save();
    
    res.status(201).json(asset);
  } catch (error) {
    res.status(500).json({ message: 'Error creating asset', error: error.message });
  }
});

// Update asset
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    Object.assign(asset, req.body);
    await asset.save();
    
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: 'Error updating asset', error: error.message });
  }
});

// Delete asset (Super Admin only)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Only super admins can delete assets' });
    }
    
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting asset', error: error.message });
  }
});

// Generate QR code for asset
router.get('/:id/qr-code', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && String(asset.ownerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const qrCodeDataURL = await generateQRCodeForAsset(asset._id, asset.assetTag);
    res.json({ qrCode: qrCodeDataURL });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
});

// Downloadable QR (PNG) or raw payload for printing/embedding without auth on scan
// GET /api/assets/:id/qr
// Query params:
//   download=1 -> force attachment download with filename
//   size=300 -> override pixel size
//   payload=1 -> return raw JSON payload instead of image (debug/label systems)
router.get('/:id/qr', async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    // Public endpoint: no user check

    // The payload encoded in the QR image
    const payload = JSON.stringify({
      type: 'ASSET',
      id: asset._id,
      tag: asset.assetTag,
      // Keep timestamp stable-ish for caching unless force param requested
      timestamp: asset.updatedAt?.toISOString() || new Date().toISOString()
    });

    if (req.query.payload === '1') {
      return res.json({ payload });
    }

    const size = Math.min(1000, Math.max(80, parseInt(req.query.size) || 300));
    const format = (req.query.format || 'png').toString().toLowerCase();
    const copies = Math.min(100, Math.max(1, parseInt(req.query.copies) || 1));

    const dataUrl = await generateQR(payload, { size });
    const base64 = dataUrl.split(',')[1];
    const imgBuffer = Buffer.from(base64, 'base64');

    if (format === 'pdf') {
      // Lazy import pdfkit only when needed
      const { default: PDFDocument } = await import('pdfkit');
      const filename = `asset-${asset.assetTag || asset._id}.pdf`;
      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      }
      res.setHeader('Content-Type', 'application/pdf');
      const style = (req.query.style || 'basic').toString();
      const border = req.query.border === '1' || style === 'label';
      const logoUrl = typeof req.query.logo === 'string' ? req.query.logo : null;
      const doc = new PDFDocument({ autoFirstPage: false });
      doc.pipe(res);
      for (let i = 0; i < copies; i++) {
        const pageWidth = size + 60;
        const pageHeight = size + 140; // extra space for texts/logo
        doc.addPage({ size: [pageWidth, pageHeight], margins: { top: 20, left: 20, right: 20, bottom: 20 } });

        // Optional border / label style
        if (border) {
          doc.save();
          doc.lineWidth(1.2).roundedRect(5, 5, pageWidth - 10, pageHeight - 10, 8).stroke('#333');
          doc.restore();
        }

        // Dynamic font sizing
        const titleFontSize = Math.max(10, Math.min(22, Math.round(size / 10))); // scales with size
        const tagFontSize = Math.max(8, Math.min(14, Math.round(size / 14)));
        const metaFontSize = Math.max(6, Math.min(10, Math.round(size / 22)));

        let cursorY = 20;
        // Logo (remote fetch not implemented here; user can supply data URL later)
        if (logoUrl && /^data:image\//.test(logoUrl)) {
          // If data URI provided, embed
            try {
              const b64 = logoUrl.split(',')[1];
              const lbuf = Buffer.from(b64, 'base64');
              const logoSize = Math.min(64, Math.round(size / 3));
              doc.image(lbuf, (pageWidth - logoSize) / 2, cursorY, { width: logoSize, height: logoSize });
              cursorY += logoSize + 6;
            } catch {
              // ignore logo failure
            }
        }

        doc.fontSize(titleFontSize).text(asset.name, 30, cursorY, { align: 'center', width: pageWidth - 60 });
        cursorY += titleFontSize + 4;
        doc.fontSize(tagFontSize).fillColor('#555').text(`Tag: ${asset.assetTag}`, { align: 'center' });
        cursorY += tagFontSize + 2;
        if (asset.assetType) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Type: ${asset.assetType}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        if (asset.status) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Status: ${asset.status}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        if (asset.roomId && asset.roomId.name) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Location: ${asset.roomId.name}${asset.roomId.code ? ` (${asset.roomId.code})` : ''}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        if (asset.ownerId && asset.ownerId.name) {
          doc.fontSize(tagFontSize).fillColor('#555').text(`Owner: ${asset.ownerId.name}`, { align: 'center' });
          cursorY += tagFontSize + 2;
        }
        cursorY += 4;
        // Center QR
        const qrX = (pageWidth - size) / 2;
        doc.image(imgBuffer, qrX, cursorY, { width: size, height: size });
        cursorY += size + 6;
        doc.fontSize(metaFontSize).fillColor('#000').text(`Generated: ${new Date().toLocaleString()}`, 20, cursorY, { align: 'center', width: pageWidth - 40 });
        cursorY += metaFontSize + 2;
      }
      doc.end();
    } else {
      const filename = `asset-${asset.assetTag || asset._id}.png`;
      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      }
      res.setHeader('Content-Type', 'image/png');
      res.send(imgBuffer);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating downloadable QR code', error: error.message });
  }
});

// Scan asset QR code
router.post('/:id/scan', isAuthenticated, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    // Log the scan
    const scanLog = await ScanLog.create({
      qrData: asset.qrCode,
      qrType: 'ASSET',
      scannedBy: req.user._id,
      location: req.body.location,
      deviceInfo: req.body.deviceInfo,
      action: req.body.action || 'VIEW',
      metadata: req.body.metadata
    });
    
    // Update asset scan statistics
    asset.scanCount += 1;
    asset.lastScanned = new Date();
    await asset.save();
    
    res.json({
      asset,
      scanLog,
      message: 'Asset scanned successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error scanning asset', error: error.message });
  }
});

// Generate PDF with all assets and QR codes
router.get('/all/qr-pdf', isAuthenticated, async (req, res) => {
  // Set a longer timeout for the response
  res.setTimeout(120000); // 2 minutes timeout
  
  let doc = null;
  const chunks = [];
  
  try {
    // Set appropriate headers early
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=all-assets-qr.pdf');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    let query = {};
    // Normal users can only get their assets
    if (req.user.role !== 'SUPER_ADMIN') {
      query.ownerId = req.user._id;
    }

    // Use lean() for better memory performance
    const assets = await Asset.find(query)
      .lean()
      .populate('ownerId', 'name email')
      .populate('roomId', 'name code building floor')
      .sort({ assetTag: 1 }); // Sort by asset tag

    if (!assets.length) {
      return res.status(404).json({ message: 'No assets found' });
    }

    const size = Math.min(1000, Math.max(80, parseInt(req.query.size) || 300));

    // Constants for layout
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 40;
    const qrSize = Math.min(size, 180); // QR code size — fits cleanly on A4

    // Generate QR codes in batches to manage memory
    const batchSize = 10;
    const qrCodes = [];
    
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      const batchQRs = await Promise.all(batch.map(async (asset) => {
        const payload = JSON.stringify({
          type: 'ASSET',
          id: asset._id,
          tag: asset.assetTag,
          timestamp: asset.updatedAt?.toISOString() || new Date().toISOString()
        });
        const dataUrl = await generateQR(payload, { size: qrSize });
        return {
          asset,
          imgBuffer: Buffer.from(dataUrl.split(',')[1], 'base64')
        };
      }));
      qrCodes.push(...batchQRs);
      
      // Give event loop a chance to handle other operations
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const contentWidth = pageWidth - (margin * 2);
    const itemHeight = qrSize + 100; // QR + text space

    // Create the PDF document
    const { default: PDFDocument } = await import('pdfkit');
    doc = new PDFDocument({
      autoFirstPage: true,
      size: 'A4',
      margin: 0,
      bufferPages: true
    });

    // Create a PassThrough stream to handle backpressure
    const { PassThrough } = await import('stream');
    const passThrough = new PassThrough();
    passThrough.pipe(res);
    passThrough.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming PDF', error: err.message });
      }
    });
    doc.pipe(passThrough);

    // ─── COVER PAGE ────────────────────────────────────────────────────────────
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    // Background accent bar
    doc.rect(0, 0, pageWidth, 8).fill('#0066FF');

    // Title
    doc.fontSize(32).fillColor('#001A4D').font('Helvetica-Bold')
      .text('Asset QR Codes', margin, centerY - 80, { align: 'center', width: contentWidth });

    // Subtitle line
    doc.moveTo(margin + 80, centerY - 28).lineTo(pageWidth - margin - 80, centerY - 28)
      .strokeColor('#0066FF').lineWidth(2).stroke();

    doc.fontSize(13).fillColor('#555').font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, margin, centerY - 18, { align: 'center', width: contentWidth });
    doc.fontSize(13).fillColor('#555')
      .text(`Total Assets: ${assets.length}`, margin, centerY + 6, { align: 'center', width: contentWidth });

    // Bottom bar
    doc.rect(0, pageHeight - 8, pageWidth, 8).fill('#0066FF');

    // ─── ONE ASSET PER PAGE ────────────────────────────────────────────────────
    for (const { asset, imgBuffer } of qrCodes) {
      doc.addPage();

      // Top accent bar
      doc.rect(0, 0, pageWidth, 6).fill('#0066FF');

      // Asset name — large, bold, centered
      doc.fontSize(20).fillColor('#001A4D').font('Helvetica-Bold')
        .text(asset.name, margin, 40, { align: 'center', width: contentWidth });

      // Asset tag badge area
      doc.fontSize(12).fillColor('#3949ab').font('Helvetica')
        .text(`Tag: ${asset.assetTag}`, margin, 68, { align: 'center', width: contentWidth });

      // Divider
      doc.moveTo(margin + 60, 90).lineTo(pageWidth - margin - 60, 90)
        .strokeColor('#e0e0e0').lineWidth(1).stroke();

      // QR Code — centered, large
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 110;
      doc.rect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20)
        .strokeColor('#e0e0e0').lineWidth(1).stroke();
      doc.image(imgBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Details section below QR
      let detY = qrY + qrSize + 30;

      // Divider
      doc.moveTo(margin + 60, detY - 10).lineTo(pageWidth - margin - 60, detY - 10)
        .strokeColor('#e0e0e0').lineWidth(1).stroke();

      const addDetail = (label, value, color = '#333') => {
        if (!value) return;
        doc.fontSize(11).fillColor('#888').font('Helvetica')
          .text(label, margin, detY, { align: 'center', width: contentWidth });
        doc.fontSize(12).fillColor(color).font('Helvetica-Bold')
          .text(value, margin, detY + 14, { align: 'center', width: contentWidth });
        detY += 36;
      };

      const statusColors = { ACTIVE: '#2e7d32', MAINTENANCE: '#e65100', INACTIVE: '#616161', RETIRED: '#c62828' };
      addDetail('TYPE', asset.assetType?.replace(/_/g, ' '));
      addDetail('STATUS', asset.status, statusColors[asset.status] || '#333');
      if (asset.roomId?.name) {
        addDetail('LOCATION', `${asset.roomId.name} (${asset.roomId.code})`);
      }
      if (asset.ownerId?.name) {
        addDetail('ASSIGNED TO', asset.ownerId.name);
      }

      // Bottom bar
      doc.rect(0, pageHeight - 6, pageWidth, 6).fill('#0066FF');
    }

    // ─── PAGE NUMBERS ─────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(9).fillColor('#aaa').font('Helvetica')
        .text(
          i === 0 ? 'Smart Asset Tracking System' : `Page ${i} of ${range.count - 1}`,
          margin, pageHeight - 24,
          { align: 'center', width: contentWidth }
        );
    }

    // Finalize the PDF and end the stream
    doc.end();
  } catch (error) {
    console.error('Error generating all assets PDF:', error);
    
    // Clean up if document was created
    if (doc) {
      try {
        // Only end the document if it hasn't been ended
        if (!doc.isEnded) {
          doc.end();
        }
      } catch (endError) {
        console.error('Error ending document:', endError);
      }
    }

    // Clean up the PassThrough stream if it exists
    if (passThrough && !passThrough.destroyed) {
      try {
        passThrough.destroy();
      } catch (streamError) {
        console.error('Error destroying stream:', streamError);
      }
    }

    // Only send error if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating PDF', error: error.message });
    } else {
      // If headers were sent but we haven't finished, end the response
      try {
        res.end();
      } catch (endError) {
        console.error('Error ending response:', endError);
      }
    }
  }
  
  // Handle client disconnect
  req.on('close', () => {
    if (doc && !doc.isEnded) {
      try {
        doc.end();
      } catch (error) {
        console.error('Error cleaning up after client disconnect:', error);
      }
    }
  });
});

export default router;
