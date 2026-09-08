import 'dotenv/config'; // 👈 हे अगदी १ ल्या ओळीवर जोडणे आवश्यक आहे!
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import { v2 as cloudinary } from 'cloudinary';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// 📌 Cloudinary Configuration
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// ✅ dotenv काम करतंय की नाही हे चेक करण्यासाठी हे लॉग ठेवून बघा:
console.log('API Key Status:', process.env.CLOUDINARY_API_KEY ? '✅ Loaded' : '❌ Not Loaded');

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload-board', upload.fields([
  { name: 'civilPdf', maxCount: 1 },
  { name: 'criminalPdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const { courtCategory, courtNumber } = req.body;
    const civilFile = req.files['civilPdf'] ? req.files['civilPdf'][0] : null;
    const criminalFile = req.files['criminalPdf'] ? req.files['criminalPdf'][0] : null;

    if (!courtCategory || !courtNumber) {
      return res.status(400).json({ success: false, message: 'कोर्ट श्रेणी आणि नंबर निवडा.' });
    }

    if (!civilFile && !criminalFile) {
      return res.status(400).json({ success: false, message: 'किमान एक (Civil किंवा Criminal) PDF फाईल निवडा.' });
    }

    // PDF Merge Logic
    const mergedPdf = await PDFDocument.create();

    if (civilFile) {
      const civilPdfDoc = await PDFDocument.load(civilFile.buffer);
      const civilPages = await mergedPdf.copyPages(civilPdfDoc, civilPdfDoc.getPageIndices());
      civilPages.forEach((page) => mergedPdf.addPage(page));
    }

    if (criminalFile) {
      const criminalPdfDoc = await PDFDocument.load(criminalFile.buffer);
      const criminalPages = await mergedPdf.copyPages(criminalPdfDoc, criminalPdfDoc.getPageIndices());
      criminalPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: true });
    const mergedBuffer = Buffer.from(mergedPdfBytes);

    const customPublicId = `${courtCategory}_${courtNumber}_Combined`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        format: 'pdf',
        folder: 'court_daily_boards',
        public_id: customPublicId,
        overwrite: true,
        invalidate: true
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Error:', error);
          return res.status(500).json({ success: false, message: 'Upload Failed: ' + error.message });
        }

        console.log('✅ Public ID:', customPublicId);
        console.log('✅ Direct Preview URL:', result.secure_url);

        return res.json({
          success: true,
          message: `${courtCategory} (${courtNumber}) - बोर्ड यशस्वीरीत्या अपडेट झाला!`,
          pdfUrl: result.secure_url
        });
      }
    );

    uploadStream.end(mergedBuffer);

  } catch (error) {
    console.error('Server Error:', error.message);
    return res.status(500).json({ success: false, message: 'सर्व्हर एरर: ' + error.message });
  }
});

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });

// Local Development साठी listen चालेल
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Vercel Serverless Function साठी Export करा:
export default app;