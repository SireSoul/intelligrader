import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { marked } from "marked";
import * as motion from "motion/react-client";

// Convert Markdown to HTML
const getHTMLFromMarkdown = (markdown) => {
  if (!markdown) return "<p>No content available</p>";
  return marked(markdown);
};

const ResultPage = () => {
  const router = useRouter();
  const { response, input } = router.query;
  const responseAsString = Array.isArray(response) ? response[0] : response;
  const typedInput = Array.isArray(input) ? input[0] : input;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Function to resend the DBQ input
  const run = async () => {
    setIsPopupOpen(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Grade this APUSH DBQ: ${typedInput}` }),
      });
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      router.push(`/result?response=${encodeURIComponent(data.response)}&input=${encodeURIComponent(typedInput)}`);
    } catch (err) {
      console.error('Error during retry:', err);
    }
  };

  const handleHomeButtonClick = () => router.push('/');

  const togglePopup = () => setIsPopupOpen(!isPopupOpen);

  return (
    <div className="container">

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <h2 className="toggle-button" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</h2>
        <ul>
          <li>
            <button className="sidebar-button" onClick={handleHomeButtonClick}>Home</button>
          </li>
          <li>
            <button className="sidebar-button" onClick={run}>Retry</button>
          </li>
        </ul>
      </aside>

      {/* Main Chat-like Content */}
      <main className="chat-container">
        <h1 className="chat-title">Results</h1>
        <div
          className="chat-message"
          dangerouslySetInnerHTML={{ __html: getHTMLFromMarkdown(responseAsString) }}
        />
      </main>

      {/* Full-page Modal */}
      {isPopupOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Grading in progress...</h2>
            <p className="text-gray-700">This may take a moment.</p>
            <p className="text-gray-700 mt-2">Grab a cookie while you wait 🍪</p>
            <button
              className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              onClick={togglePopup}
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* CSS Styles */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }

        .container {
          display: flex;
          height: 100vh;
          background: radial-gradient(circle, #ffffff, #fff1ff);
          color: #333;
          overflow: hidden;
        }

        /* Sidebar */
        .sidebar {
          width: 200px;
          background: rgba(255,255,255,0.4);
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          backdrop-filter: blur(10px);
          border-right: 1px solid rgba(255,255,255,0.1);
          transition: width 0.3s ease-in-out;
        }
        .sidebar.closed { width: 60px; align-items: center; }
        .toggle-button { font-size: 2rem; margin-bottom: 20px; color: #333; cursor: pointer; transition: transform 0.2s; align-self: center; }
        .toggle-button:hover { transform: scale(1.1); }
        .sidebar ul { list-style: none; padding: 0; width: 100%; }
        .sidebar li { display: flex; align-items: center; padding: 12px; cursor: pointer; font-size: 1.2rem; border-radius: 8px; transition: background 0.3s, transform 0.2s; }
        .sidebar li:hover { background: rgba(0,0,0,0.05); transform: scale(1.05); }
        .sidebar-button { font-size: 1.2rem; padding: 12px; background: transparent; color: #333; border: none; cursor: pointer; text-align: left; width: 100%; border-radius: 8px; transition: background 0.3s, transform 0.2s; }
        .sidebar.closed .sidebar-button { display: none; }
        .sidebar-button:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }

        /* Chat Container */
        .chat-container {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 20px;
          padding-top: 10px;
          text-align: center;
          width: calc(100% - 60px);
          transition: width 0.3s ease-in-out;
          overflow-y: auto;
        }
        .sidebar.open ~ .chat-container { width: calc(100% - 200px); }
        .chat-title {
          font-size: 2.5rem;
          background: linear-gradient(to right, #fbbf24, #9b4dca);
          -webkit-background-clip: text;
          color: transparent;
          margin-bottom: 15px;
          text-shadow: 2px 2px 5px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        }
        .chat-title:hover { transform: scale(1.05); }
        .chat-message {
          background: rgba(255,255,255,0.1);
          padding: 0.5in;
          border-radius: 12px;
          width: 98%;
          max-width: 98%;
          font-size: 1.3rem;
          text-align: left;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 15px rgba(255,255,255,0.1);
          border: 1px solid rgba(0,0,0,0.2);
          white-space: normal;
          overflow-wrap: break-word;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default ResultPage;
