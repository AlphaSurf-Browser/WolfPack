import React, { useEffect, useState } from 'react';

const App = () => {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    // Fetch the contents of index.html
    const fetchHtml = async () => {
      try {
        const response = await fetch('/index.html');
        const text = await response.text();
        setHtmlContent(text);
      } catch (error) {
        console.error('Error fetching index.html:', error);
      }
    };

    fetchHtml();
  }, []);

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
};

export default App;
