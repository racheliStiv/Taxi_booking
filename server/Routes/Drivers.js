import express from "express"
import { getDrivers, getDriver, postDriver, putDriver, deleteDriver, getDriverforPassWord } from "../DataBase/Drivers.js";
import { v4 } from "uuid";
import multer from "multer";
const app = express.Router();
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
//החזרת כל הנוסעים
app.get('/', async (req, res) => {
    const { code } = req.query;
    const data = await getDrivers(code);
    res.send(data);
});

// החזרת נוסע בודד
app.get('/driver', async (req, res) => {
    const { name, password } = req.query;
    if (!name || !password) {
        return res.status(400).send('Missing name or password');
    }
    try {
        const data = await getDriver(name, password);
        res.send(data);
    } catch (err) {
        res.status(400).json({ error: 'Database error' });
    }
});

// מחיקה נוסע
app.delete('/:code', async (req, res) => {
    const { code } = req.params;

    try {
        await deleteDriver(code);

        res.send({ code });
    } catch (error) {
        res.status(404).send(error.message);
    }
});

app.post('/', upload.single('profilPic'), async (req, res) => {
    const fileName = req.file.filename;
    const { name, vacant, numOfPlaces, password } = req.body;
    try {
        const newDriver = await postDriver(name, vacant, numOfPlaces, password, fileName);
        res.status(201).send(newDriver);
    } catch (error) {
        console.error('Error adding driver:', error);
        res.status(500).send('Error adding driver. Please try again.');
    }
});

// Update Driver
app.put('/:code', async (req, res) => {
    const { name, vacant, num_of_places, profilPic } = req.body;

    const { code } = req.params;
    try {

        const updatedDriver = await putDriver(name, vacant, num_of_places, code, profilPic);
        res.send(updatedDriver);
    } catch (error) {
        res.status(404).send(error.message);
    }
});

app.post('/checkPassword', async (req, res) => {
    const { code, password } = req.body;
    try {
        const driver = await getDriverforPassWord(code);
        if (driver.password === password) {
            res.json({ isValid: true });
        } else {
            res.json({ isValid: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'שגיאה בבדיקת הסיסמה' });
    }
});


export default app;