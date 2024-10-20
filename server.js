const express = require('express');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');

// Initialize the app
const app = express();
const PORT = process.env.PORT || 5000;

// In-memory storage for uploaded files
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudflare R2 S3 configuration
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

// Utility function to read data from R2
async function readDataFromR2(key) {
  try {
    const data = await s3.getObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }).promise();
    return JSON.parse(data.Body.toString());
  } catch (err) {
    console.error('Error reading from R2:', err);
    return [];
  }
}

// Utility function to write data to R2
async function writeDataToR2(key, data) {
  try {
    await s3.putObject({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    }).promise();
  } catch (err) {
    console.error('Error writing to R2:', err);
  }
}

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all methods
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the public directory

// Upload and create howl (post) with media to R2
app.post('/api/howls', upload.single('media'), async (req, res) => {
  try {
    const howls = await readDataFromR2('howls.txt');
    let mediaUrl = null;

    // Upload media to R2 if it exists
    if (req.file) {
      const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: `${Date.now()}_${req.file.originalname}`,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const data = await s3.upload(params).promise();
      mediaUrl = data.Location;
    }

    // Create a new howl (post)
    const newHowl = {
      id: howls.length + 1,
      content: req.body.content,
      media: mediaUrl ? {
        url: mediaUrl,
        type: req.file.mimetype.startsWith('image') ? 'image' : 'video',
      } : null,
      timestamp: new Date(),
      likes: 0,  // Add likes property for reactions
    };

    howls.push(newHowl);

    // Store the howls back to R2
    await writeDataToR2('howls.txt', howls);

    res.status(201).json(newHowl);
  } catch (error) {
    console.error('Error creating howl:', error);
    res.status(500).send('Error creating howl');
  }
});

// Fetch all howls (posts)
app.get('/api/howls', async (req, res) => {
  try {
    const howls = await readDataFromR2('howls.txt');
    res.json(howls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (error) {
    console.error('Error fetching howls:', error);
    res.status(500).send('Error fetching howls');
  }
});

// Like or Unlike a howl (persisted in R2)
app.post('/api/howls/:id/like', async (req, res) => {
  const howlId = parseInt(req.params.id);
  try {
    let howls = await readDataFromR2('howls.txt');
    const howl = howls.find(h => h.id === howlId);

    if (!howl) {
      return res.status(404).send('Howl not found');
    }

    // Toggle "like" status
    howl.likes = (howl.likes || 0) + 1;

    // Store the updated howls back to R2
    await writeDataToR2('howls.txt', howls);

    res.json(howl);
  } catch (error) {
    console.error('Error liking howl:', error);
    res.status(500).send('Error liking howl');
  }
});

// Catch-all for any undefined routes
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
