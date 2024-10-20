import React, { useEffect, useState } from 'react';
import './App.css'; // Include any necessary CSS

const App = () => {
  const [htmlContent, setHtmlContent] = useState(''); // State for HTML content
  const [error, setError] = useState(null); // State for error handling


  // UseEffect to run the server when the component mounts
  useEffect(() => {
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
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} /> {/* Render the fetched HTML */}
    </div>
  );
};

export default App;
