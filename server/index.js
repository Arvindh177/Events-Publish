const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const imageDownloader = require('image-downloader');
const multer = require('multer');
const fs = require('fs');
const User = require('./models/User'); 
const Place = require('./models/Place.js');
const Booking = require('./models/Booking');
require('dotenv').config();

const app = express();
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET || 'fasefraw4r5r3wq45wdfgw34twdfg';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cors({
  credentials: true,
  origin: 'https://events-publish-frontend.vercel.app',
  methods: ["POST", "GET"]
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Helper function to get user data from JWT
function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    const { token } = req.cookies;
    if (!token) {
      return reject('Token not provided');
    }

    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) {
        return reject('Invalid token');
      }
      resolve(userData);
    });
  });
}

// Routes
app.get('/test', (req, res) => {
  res.json('test ok');
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(422).json(e);
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });

  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign({ email: userDoc.email, id: userDoc._id }, jwtSecret, {}, (err, token) => {
        if (err) {
          return res.status(500).json({ error: 'Token generation failed' });
        }
        res.cookie('token', token).json(userDoc);
      });
    } else {
      res.status(422).json({ error: 'Password is incorrect' });
    }
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.get('/profile', async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);
    const { name, email, _id } = await User.findById(userData.id);
    res.json({ name, email, _id });
  } catch (e) {
    res.status(401).json(null);
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json(true);
});

app.post('/upload-by-link', async (req, res) => {
  const { link } = req.body;
  const newName = 'photo' + Date.now() + '.jpeg';
  
  try {
    await imageDownloader.image({
      url: link,
      dest: __dirname + '/uploads/' + newName,
    });
    res.json(newName);
  } catch (e) {
    res.status(500).json({ error: 'Image download failed' });
  }
});

const photosMiddleware = multer({ dest: 'uploads/' });

app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;

    fs.renameSync(path, newPath);
    uploadedFiles.push(newPath.replace('uploads/', ''));
  }
  res.json(uploadedFiles);
});

app.post('/places', async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);
    const { title, address, addedPhotos, description, perks, extraInfo, checkin, checkOut, maxGuests, price } = req.body;

    const placeDoc = await Place.create({
      owner: userData.id,
      title,
      address,
      photos: addedPhotos,
      description,
      perks,
      extraInfo,
      checkin,
      checkOut,
      maxGuests,
      price,
    });
    res.json(placeDoc);
  } catch (e) {
    res.status(401).json({ error: 'Failed to create place' });
  }
});

app.get('/user-places', async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);
    res.json(await Place.find({ owner: userData.id }));
  } catch (e) {
    res.status(401).json({ error: 'Failed to retrieve user places' });
  }
});

app.get('/places/:id', async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

app.put('/places', async (req, res) => {
  const { id, title, address, addedPhotos, description, perks, extraInfo, checkin, checkOut, maxGuests, price } = req.body;

  try {
    const userData = await getUserDataFromReq(req);
    const placeDoc = await Place.findById(id);
    
    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkin,
        checkOut,
        maxGuests,
        price,
      });
      await placeDoc.save();
      res.json('ok');
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (e) {
    res.status(401).json({ error: 'Failed to update place' });
  }
});

app.get('/places', async (req, res) => {
  res.json(await Place.find());
});

app.post('/bookings', async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);
    const { place, checkIn, checkOut, numberOfGuests, name, phone, price } = req.body;

    const bookingDoc = await Booking.create({
      place,
      checkIn,
      checkOut,
      numberOfGuests,
      name,
      phone,
      price,
      user: userData.id,
    });

    res.json(bookingDoc);
  } catch (e) {
    res.status(401).json({ error: 'Failed to create booking' });
  }
});

app.get('/bookings', async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);
    res.json(await Booking.find({ user: userData.id }).populate('place'));
  } catch (e) {
    res.status(401).json({ error: 'Failed to retrieve bookings' });
  }
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
