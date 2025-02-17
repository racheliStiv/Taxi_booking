import express from "express"
import {getRelevantDrives, getDrives, getDrive, putDrive, postDrive, deleteDrive } from '../DataBase/Drives.js';
const app = express.Router();

//החזרת כל הנסיעהים
app.get('/', async (req, res) => {
    const { code } = req.query;
    const data = await getDrives(code);
    res.send(data);
});

//החזרת נסיעה בודד
app.get('/drive', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400);
    }
    try {
        const data = await getDrive(code);
        res.send(data);
    } catch (err) {
        res.status(400).json({ error: 'Database error' });
    }
});

app.post('/', async (req, res) => {
    const { driveDest, driveSource, pass_code, num_of_pass } = req.body;
    if (!driveDest || !driveSource || !pass_code || !num_of_pass) {
        return res.status(400).send('Missing required fields');
    }
    try {
        const newDrive = await postDrive(driveDest, driveSource, pass_code, num_of_pass);
        res.status(201).send(newDrive);
    } catch (error) {
        console.error('Error adding drive:', error);
        res.status(500).send('Error adding drive. Please try again.');
    }
});

//עידכון נסיעה
app.put('/:code', async (req, res) => {
    const { code,date_time, destination, source, pass_code, driver_code, num_of_pass, duration, vacant} = req.body;
    try {
        const updateDrive = await putDrive(code,date_time, destination, source, pass_code, driver_code, num_of_pass, duration, vacant);
        res.send(updateDrive);
    } catch (error) {
        res.status(404).send(error.message);
    }
});

// מחיקה נסיעה
app.delete('/drive', async (req, res) => {
    const { code } = req.params;

    try {
        await deleteDrive(code);
        res.send({ code });
    } catch (error) {
        res.status(404).send(error.message);
    }
});

app.get('/relevant-drives/:driverCode/:location', async (req, res) => {
    const { driverCode, location } = req.params;
    try {
        const drives = await getRelevantDrives(driverCode, location);
        res.send(drives);
    } catch (error) {
        console.error('Error fetching relevant drives:', error);
        res.status(500).send('Error fetching relevant drives. Please try again.');
    }
});
export default app;