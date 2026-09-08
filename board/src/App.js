import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import * as pdfjsLib from 'pdfjs-dist';

// Worker CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const COURT_CATEGORIES = [
  { value: 'distcourt', label: 'District Court' },
  { value: 'cjam', label: 'CJAM / JMFC' },
  { value: 'seniorDivision', label: 'Senior Division' },
];

const COURT_NUMBERS = Array.from({ length: 15 }, (_, i) => `courtNo-${i + 1}`);

// Live Combined PDF Renderer Component
const PDFCanvasRenderer = ({ url }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const renderPDF = async () => {
      if (!url) return;
      setLoading(true);
      setError('');
      if (containerRef.current) containerRef.current.innerHTML = '';

      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.2 });

          const canvas = document.createElement('canvas');
          canvas.style.display = 'block';
          canvas.style.margin = '15px auto';
          canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          canvas.style.maxWidth = '100%';

          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;

          if (containerRef.current && isMounted) {
            containerRef.current.appendChild(canvas);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("PDF Render Error:", err);
        if (isMounted) {
          setError('PDF रेंडर करताना अडचण आली. डायरेक्ट लिंक वरून ओपन करा.');
          setLoading(false);
        }
      }
    };

    renderPDF();
    return () => { isMounted = false; };
  }, [url]);

  return (
    <div style={{ marginTop: '20px', background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
      {loading && <p style={{ textAlign: 'center', fontWeight: 'bold' }}>⏳ Combined Board PDF चे सर्व पेजेस लोड होत आहेत...</p>}
      {error && <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>}
      <div ref={containerRef} style={{ maxHeight: '600px', overflowY: 'auto' }} />
    </div>
  );
};

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard Form State
  const [courtCategory, setCourtCategory] = useState(COURT_CATEGORIES[0].value);
  const [courtNumber, setCourtNumber] = useState(COURT_NUMBERS[0]);
  const [civilFile, setCivilFile] = useState(null);
  const [criminalFile, setCriminalFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${courtCategory}_${courtNumber}_Combined_QR`,
  });

  // Login Handle Logic
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('अयोग्य यूजरनेम किंवा पासवर्ड! (Use: admin / admin)');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setPdfUrl('');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!civilFile && !criminalFile) {
      alert('कृपया किमान एक (Civil किंवा Criminal) PDF फाईल निवडा.');
      return;
    }

    setLoading(true);
    setPdfUrl('');

    const formData = new FormData();
    formData.append('courtCategory', courtCategory);
    formData.append('courtNumber', courtNumber);
    if (civilFile) formData.append('civilPdf', civilFile);
    if (criminalFile) formData.append('criminalPdf', criminalFile);

    try {
      // 📌 Vercel / Local backend URL:
   const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://backend-gules-ten-84.vercel.app/api/upload-board'
  : 'http://localhost:5000/api/upload-board';

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const refreshedUrl = `${data.pdfUrl}?v=${Date.now()}`;
        setPdfUrl(refreshedUrl);
        alert('🎉 ' + data.message);
      } else {
        alert('❌ Error: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('सर्व्हरशी संपर्क होऊ शकला नाही.');
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const selectedCategoryLabel = COURT_CATEGORIES.find(c => c.value === courtCategory)?.label || courtCategory;
  const formattedCourtNo = courtNumber.replace('courtNo-', 'Court No. ');

  // ---------------- LOGIN PAGE VIEW ----------------
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e293b',
        fontFamily: 'Segoe UI, Arial',
        padding: '20px'
      }}>
        <div style={{
          background: '#ffffff',
          padding: '35px 30px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#1e40af', marginBottom: '8px', fontSize: '24px' }}>🏛️ Court Admin Portal</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '25px' }}>कृपया लॉग इन करा</p>

          {loginError && (
            <div style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '15px',
              border: '1px solid #fecaca'
            }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ textAlign: 'left', marginBottom: '15px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="उदा. admin"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="उदा. admin"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  marginTop: '5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#1e40af',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                transition: '0.2s'
              }}
            >
              लॉग इन करा (Login)
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------------- DASHBOARD VIEW (AFTER LOGIN) ----------------
  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, Arial', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Top Header with Logout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        background: '#f8fafc',
        padding: '12px 20px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <span style={{ fontWeight: 'bold', color: '#1e40af' }}>👤 Welcome, Admin</span>
        <button
          onClick={handleLogout}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Logout
        </button>
      </div>

      <h2 style={{ textAlign: 'center', color: '#1a365d' }}>🏛️ E-Court Dynamic Board Management System</h2>

      <form onSubmit={handleUploadSubmit} style={{ background: '#f8f9fa', padding: '25px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
        
        {/* Court Category Dropdown */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>१. Court Category निवडा:</label>
          <select 
            value={courtCategory} 
            onChange={(e) => setCourtCategory(e.target.value)} 
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          >
            {COURT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label} ({cat.value})</option>
            ))}
          </select>
        </div>

        {/* Court Number Dropdown */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold' }}>२. Court Number निवडा:</label>
          <select 
            value={courtNumber} 
            onChange={(e) => setCourtNumber(e.target.value)} 
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          >
            {COURT_NUMBERS.map((num) => (
              <option key={num} value={num}>{num.replace('courtNo-', 'Court No. ')} ({num})</option>
            ))}
          </select>
        </div>

        {/* Civil Board Input */}
        <div style={{ marginBottom: '15px', background: '#eff6ff', padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
          <label style={{ fontWeight: 'bold', color: '#1e40af' }}>📘 Civil Board PDF (निवडा):</label>
          <input type="file" accept="application/pdf" onChange={(e) => setCivilFile(e.target.files[0])} style={{ width: '100%', padding: '6px', marginTop: '5px' }} />
        </div>

        {/* Criminal Board Input */}
        <div style={{ marginBottom: '20px', background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
          <label style={{ fontWeight: 'bold', color: '#991b1b' }}>📕 Criminal Board PDF (निवडा):</label>
          <input type="file" accept="application/pdf" onChange={(e) => setCriminalFile(e.target.files[0])} style={{ width: '100%', padding: '6px', marginTop: '5px' }} />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#6c757d' : '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
          {loading ? 'दोन्ही PDF Merge होत आहेत...' : 'बोर्ड Combine करा आणि QR जनरेट करा'}
        </button>
      </form>

      {/* QR Display and Print Section */}
      {pdfUrl && (
        <div style={{ marginTop: '30px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <button 
              onClick={() => handlePrint()} 
              style={{
                padding: '12px 25px', 
                background: '#16a34a', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                fontWeight: 'bold', 
                fontSize: '16px', 
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              🖨️ QR कोड बोर्ड प्रिंट करा (Print Combined Board QR)
            </button>
          </div>

          {/* Printable Display Card */}
          <div 
            ref={printRef} 
            style={{ 
              border: '3px solid #1e40af', 
              borderRadius: '12px', 
              padding: '30px', 
              textAlign: 'center', 
              background: '#ffffff',
              maxWidth: '650px',
              margin: '0 auto',
              color: '#0f172a'
            }}
          >
            <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#1e40af', textTransform: 'uppercase' }}>
              🏛️ DISTRICT & SESSIONS COURT
            </h2>
            <h3 style={{ margin: '5px 0', fontSize: '20px', color: '#334155' }}>
              {selectedCategoryLabel} - {formattedCourtNo}
            </h3>
            
            <div style={{ 
              display: 'inline-block', 
              padding: '6px 18px', 
              background: '#dbeafe', 
              color: '#1e40af', 
              borderRadius: '20px', 
              fontWeight: 'bold', 
              fontSize: '18px',
              margin: '10px 0'
            }}>
              DAILY CIVIL & CRIMINAL BOARD
            </div>

            <p style={{ fontSize: '14px', color: '#64748b', margin: '5px 0 15px 0' }}>
              तारीख / Date: <strong>{currentDate}</strong>
            </p>

            <div style={{ padding: '15px', background: '#f8fafc', display: 'inline-block', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <QRCodeSVG value={pdfUrl} size={250} includeMargin={true} />
            </div>

            <h3 style={{ marginTop: '15px', marginBottom: '5px', fontSize: '18px', color: '#0f172a' }}>
              📲 सिव्हिल व क्रिमिनल दैनिक बोर्ड पाहण्यासाठी स्कॅन करा
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Scan this single QR Code to view both Civil & Criminal daily court boards.
            </p>
          </div>

          {/* TESTING LINK SECTION */}
          <div style={{ marginTop: '25px', padding: '15px', background: '#e0f2fe', borderRadius: '8px', border: '1px solid #bae6fd', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>🧪 Testing & Verification Link:</h4>
            <p style={{ wordBreak: 'break-all', fontSize: '13px', color: '#334155', marginBottom: '10px' }}>
              <strong>Generated URL:</strong> <a href={pdfUrl} target="_blank" rel="noopener noreferrer">{pdfUrl}</a>
            </p>
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: '#0284c7',
                color: '#ffffff',
                borderRadius: '5px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              🔗 Open PDF Direct in Browser
            </a>
          </div>

          {/* Combined Live Preview */}
          <div style={{ textAlign: 'left', marginTop: '30px' }}>
            <h4>📄 Combined Live PDF Preview (Civil + Criminal):</h4>
            <PDFCanvasRenderer url={pdfUrl} />
          </div>

        </div>
      )}
    </div>
  );
}
