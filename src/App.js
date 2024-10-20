import React, { useEffect, useState } from 'react';
import './App.css'; // Include any necessary CSS
import { spawn } from 'node:child_process';
import path from 'path';

const App = () => {
  const [htmlContent, setHtmlContent] = useState(''); // State for HTML content
  const [error, setError] = useState(null); // State for error handling

  // Function to start the Express server
  const startServer = () => {
    const serverPath = path.join('', 'server.js'); // Adjust the path if necessary

    const server = spawn('node', [serverPath], { stdio: 'inherit' });

    server.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });
  };

  // UseEffect to run the server when the component mounts
  useEffect(() => {
    startServer(); // Start the Express server
    const fetchHtml = async () => {
      try {
        const response = await fetch('/'); // Fetch the index.html served by the Express server
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text(); // Get the response as text
        setHtmlContent(data); // Set the fetched HTML content
      } catch (err) {
        setError(err.message);
        console.error('Fetch error:', err);
      }
    };

    fetchHtml();
  }, []);

  if (error) {
    return <div>Error: {error}</div>; // Display error message if fetch fails
  }

  return (
    <div className="App">
      <h1>Howl App</h1>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} /> {/* Render the fetched HTML */}
    </div>
  );
};

export default App;
