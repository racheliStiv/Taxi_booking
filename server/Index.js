// import express from 'express';
// import passengers from './Routes/Passengers.js';
// import drivers from './Routes/Drivers.js';
// import drives from './Routes/Drives.js';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// import cors from 'cors';
// import multer from 'multer';
// import { v4 } from 'uuid';
// import http from 'http';
// import { Server } from 'socket.io';
// import { postDrive } from './DataBase/Drives.js';
// const app = express();
// const PORT = process.env.PORT || 8080;


// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST"]
//   }
// });
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'img/pictures');
//   },
//   filename: (req, file, cb) => {
//     const extension = file.mimetype.split('/')[1];
//     const fileName = v4() + '.' + extension;
//     cb(null, fileName);
//   },
// });

// const upload = multer({ storage });

// app.use(express.json());
// app.use(cors());
// app.use('/img', express.static(path.join(__dirname, 'img')));

// app.post('/picture', upload.single('profilPic'), (req, res) => {
//   res.send({ imagePath: `/pictures/${req.file.filename}` });
// });

// app.post('/upload', upload.single('profilPic'), (req, res) => {
//   const imagePath = `${req.file.filename}`;
//   res.send({ imagePath });
// });

// app.use(express.static('public'));
// app.use('/passengers', passengers);
// app.use('/drivers', drivers);
// app.use('/drives', drives);



// const connectedPassengers  = new Map();

// io.on("connection", (socket) => {
//   console.log("משתמש התחבר:", socket.id);

//   // כשנוסע מתחבר 
//   socket.on("register_passenger", (passengerCode) => {
//     connectedPassengers .set(passengerCode, socket.id);
//     console.log(`נוסע ${passengerCode} התחבר עם socket ${socket.id}`);
//   });

//   // כשהנהג בוחר נסיעה
//   socket.on("driver_chose_drive", (data) => {
//     const passengerSocketId = passengers.get(data.passengerCode);
//     if (passengerSocketId) {
//       io.to(passengerSocketId).emit("driver_on_the_way", {
//         driverCode: data.driverCode,
//         driveCode: data.driveCode,
//       });
//     } else {
//       console.log("נוסע לא מחובר כרגע");
//     }
//   });

//   socket.on("disconnect", () => {
//     //  להסיר את הנוסע מהמפה אם מתנתק
//     for (const [passCode, id] of passengers.entries()) {
//       if (id === socket.id) {
//         passengers.delete(passCode);
//         console.log(`נוסע ${passCode} התנתק`);
//         break;
//       }
//     }
//   });
// });



// server.listen(PORT, () => {
//   console.log(`listen on PORT ${PORT}`);
// });

import dotenv from 'dotenv';
import express from 'express';
import passengers from './Routes/Passengers.js';
import drivers from './Routes/Drivers.js';
import drives from './Routes/Drives.js';

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import multer from 'multer';
import { v4 } from 'uuid';
import http from 'http';
import { Server } from 'socket.io';
import { postDrive } from './DataBase/Drives.js';

const app = express();
const PORT = process.env.PORT || 8080;


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // לא הקליינט שרץ
    methods: ["GET", "POST"]
  }
});

// ניהול נתיב לתמונות
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'img/pictures');
  },
  filename: (req, file, cb) => {
    const extension = file.mimetype.split('/')[1];
    const fileName = v4() + '.' + extension;
    cb(null, fileName);
  },
});

const upload = multer({ storage });

app.use(express.json());
app.use(cors());
app.use('/img', express.static(path.join(__dirname, 'img')));

// נקודת העלאת תמונה
app.post('/picture', upload.single('profilPic'), (req, res) => {
  res.send({ imagePath: `/pictures/${req.file.filename}` });
});

app.post('/upload', upload.single('profilPic'), (req, res) => {
  const imagePath = `${req.file.filename}`;
  res.send({ imagePath });
});

// ראוטים
app.use(express.static('public'));
app.use('/passengers', passengers);
app.use('/drivers', drivers);
app.use('/drives', drives);

const passengerSockets = new Map(); 
const driverSockets = new Map();    

io.on('connection', (socket) => {
  console.log('🔌 משתמש התחבר:', socket.id);

  socket.on('passengerConnected', ({ code }) => {
    passengerSockets.set(code, socket.id);
    console.log(`🧍‍♀️ נוסע ${code} התחבר`);

  });

  socket.on('driverConnected', ({ code }) => {
    driverSockets.set(code, socket.id);
    console.log(`🚗 נהג ${code} התחבר`);
    // socket.emit('yourSocketId', { socketId: socket.id });

  });

  socket.on('driverStartedDrive', ({ passengerCode, driverName, origin, destination }) => {
    console.log("🚗 נהג התחיל נסיעה:", { passengerCode, driverName, origin, destination });
console.log(passengerSockets);

    const passengerSocketId = passengerSockets.get(passengerCode);
    if (passengerSocketId) {
      io.to(passengerSocketId).emit('DrivingBegin', {
        passengerCode,
        driverName,
        origin,
        destination
      });
    } else {
      console.log(`⚠️ נוסע עם קוד ${passengerCode} לא מחובר`);
    }
  });

  socket.on('driverFinishedDrive', ({ code, driver, origin, destination }) => { 
    const passengerSocketId = passengerSockets.get(code);
    if (passengerSocketId) {
      io.to(passengerSocketId).emit('driverFinishedDrive', {
        code,
        driver,
        origin,
        destination
      });
    } else {
      console.log(`⚠️ נוסע עם קוד ${code} לא מחובר`);
    }
  });

  socket.on('disconnect', () => {
    // הסרה ממפות לפי socket.id
    for (const [code, sockId] of passengerSockets) {
      if (sockId === socket.id) {
        passengerSockets.delete(code);
        break;
      }
    }
    for (const [code, sockId] of driverSockets) {
      if (sockId === socket.id) {
        driverSockets.delete(code);
        break;
      }
    }
    console.log('❌ משתמש התנתק:', socket.id);
  });
});


dotenv.config({ path: path.resolve(__dirname, '../.env') });
const googleMapsApiKey = process.env.Maps_API_KEY;

if (!googleMapsApiKey) {
  console.error("שגיאה: מפתח Google Maps API חסר בקובץ .env");
}


app.get('/api/config', (req, res) => {
  console.log("אני פה");

  res.json({

    googleMapsApiKey: googleMapsApiKey // שולחים את המפתח לקליינט
  });
});


server.listen(PORT, () => {
  console.log(`🚀 Server listening on PORT ${PORT}`);
});
