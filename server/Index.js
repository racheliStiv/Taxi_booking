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
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
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

app.post('/picture', upload.single('profilPic'), (req, res) => {
  res.send({ imagePath: `/pictures/${req.file.filename}` });
});
app.post('/upload', upload.single('profilPic'), (req, res) => {
  const imagePath = `${req.file.filename}`;
  res.send({ imagePath });
});

app.use(express.static('public'));
app.use('/passengers', passengers);
app.use('/drivers', drivers);
app.use('/drives', drives);






io.on('connection', (socket) => {
  socket.on("addDrive", async (drive) => {
    const newD = await postDrive(drive);
    io.emit("newDrive", newD);
  });

});






app.listen(PORT, () => {
  console.log(`listen on PORT ${PORT}`);
});