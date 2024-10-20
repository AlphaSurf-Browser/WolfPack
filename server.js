// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost/wolfpack', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// User Model
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  avatarUrl: String,
});

const User = mongoose.model('User', userSchema);

// Howl Model
const howlSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  timestamp: { type: Date, default: Date.now },
  paws: { type: Number, default: 0 },
  rehowls: { type: Number, default: 0 },
  replies: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  media: {
    url: String,
    type: String,
  },
});

const Howl = mongoose.model('Howl', howlSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      username: req.body.username,
      password: hashedPassword,
      avatarUrl: `https://api.dicebear.com/6.x/avataaars/svg?seed=${req.body.username}`,
    });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(500).send('Error registering user');
  }
});

app.post('/api/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (user && await bcrypt.compare(req.body.password, user.password)) {
    const token = jwt.sign({ id: user._id, username: user.username }, 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, username: user.username, avatarUrl: user.avatarUrl } });
  } else {
    res.status(400).send('Invalid credentials');
  }
});

app.post('/api/howls', authenticateToken, upload.single('media'), async (req, res) => {
  try {
    const howl = new Howl({
      author: req.user.id,
      content: req.body.content,
      media: req.file ? {
        url: `/uploads/${req.file.filename}`,
        type: req.file.mimetype.startsWith('image') ? 'image' : 'video',
      } : undefined,
    });
    await howl.save();
    res.status(201).json(howl);
  } catch (error) {
    res.status(500).send('Error creating howl');
  }
});

app.get('/api/howls', async (req, res) => {
  try {
    const howls = await Howl.find().sort('-timestamp').populate('author', 'username avatarUrl');
    res.json(howls);
  } catch (error) {
    res.status(500).send('Error fetching howls');
  }
});

app.post('/api/howls/:id/like', authenticateToken, async (req, res) => {
  try {
    const howl = await Howl.findById(req.params.id);
    if (!howl) return res.status(404).send('Howl not found');

    const likeIndex = howl.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      howl.likes.splice(likeIndex, 1);
    } else {
      howl.likes.push(req.user.id);
    }
    await howl.save();
    res.json(howl);
  } catch (error) {
    res.status(500).send('Error liking/unliking howl');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));