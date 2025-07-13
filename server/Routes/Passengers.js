// import { getDriver, getDrivers, postDriver, putDriver, deleteDriver } from "../DataBase/Passengers.js";
import express from "express"
import { postPassenger, getPassengers, getPassenger, putPassenger, deletePassenger, isDriveAccept, getPassengerforPassWord } from "../DataBase/Passengers.js";
import { getDriver } from "../DataBase/Drivers.js";
import { getDriverforPassWord } from "../DataBase/Drivers.js"
const app = express.Router();

import { v4 } from "uuid";
import multer from "multer"; import { getDrive } from "../DataBase/Drives.js";
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
    const data = await getPassengers(code);
    res.send(data);
});

app.get('/passenger', async (req, res) => {
    console.log("שלוםלום");

    const { name, password } = req.query;
    if (!name || !password) {
        return res.status(400);
    }
    try {
        const data = await getPassenger(name, password);
        res.send(data);
    } catch (err) {
        res.status(400).json({ error: 'Database error' });
    }
});

//הוספת נוסע
app.post('/', upload.single('profilPic'), async (req, res) => {
    console.log(req)
        const fileName = req.file?.filename || null; 
    const { name, password, address, phone } = req.body;
    try {
        const newPassenger = await postPassenger(name, password, address, phone, fileName);
        res.status(201).send(newPassenger);
    }
    catch (error) {
        console.error('Error adding passenger:', error);
        res.status(500).send('Error adding passenger. Please try again.');
    }

});

//עידכון נוסע
app.put('/', async (req, res) => {
    const { code } = req.query;
    const { name, address, phone } = req.body; try {
        const updatedPost = await putPassenger(code, name, address, phone);
        res.send(updatedPost);
    } catch (error) {
        res.status(404).send(error.message);
    }
});

// מחיקה נוסע
app.delete('/', async (req, res) => {
    const { code } = req.query;
    try {
        await deletePassenger(code);
        res.send({ code });
    } catch (error) {
        res.status(404).send(error.message);
    }
});

//פונקציה לבדיקה האם הנסיעה נבחרה
app.get('/isDriveAccept', async (req, res) => {
    const { code } = req.query;
    const data = await isDriveAccept(code);
    res.send(data);
});

//פונקציה לבדיקת סיסמה קיימת
app.post('/checkPassword', async (req, res) => {
    const { name, password } = req.body;
    try {
        const passengers = await getPassengerforPassWord(name);
        const drivers = await getDriverforPassWord(name);
        if (passengers.length === 0 && drivers.length === 0) {
            return res.json({ isValid: false, error: 'משתמש לא נמצא' });
        }
        let isValid, currentuser, type;
        if (passengers.length != 0) {
            isValid = passengers.some(p => p.password === password);
            currentuser = await getPassenger(name, password);
            type = "passenger";
        }
        else {
            isValid = drivers.some(p => p.password === password);
            currentuser = await getDriver(name, password)
            type = "driver"
        }
        if (isValid) {
            res.json({ isValid: true, currentuser: currentuser,type: type });
        } else {
            res.json({ isValid: false, error: 'סיסמה שגויה' });
        }
    } catch (error) {
        console.error('שגיאה בבדיקת הסיסמה:', error);
        res.status(500).json({ isValid: false, error: 'שגיאה בבדיקת הסיסמה' });
    }
});


export default app;