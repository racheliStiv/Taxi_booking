import express from "express"
import { getRelevantDrives, getDrives, getDrive, putDrive, postDrive, deleteDrive, getCurrentDrive } from '../DataBase/Drives.js';
const app = express.Router();

//החזרת נסיעה / נסיעות
app.get('/', async (req, res) => {
    const { pass_code } = req.query;
    const data = await getDrives(pass_code);
    res.send(data);
});


app.post('/', async (req, res) => {

    const { driveDest, driveSource, pass_code, num_of_pass, duration, date_time} = req.body;
    if (!driveDest || !driveSource || !pass_code || !num_of_pass) {
        return res.status(400).send('Missing required fields');
    }
    try {
        const newDrive = await postDrive(driveDest, driveSource, pass_code, num_of_pass, duration, date_time);
        res.status(201).send(newDrive);
    } catch (error) {
        console.error('Error adding drive:', error);
        res.status(500).send('Error adding drive. Please try again.');
    }
});

//עידכון נסיעה
app.put('/:code', async (req, res) => {
    const { code, date_time, destination, source, pass_code, driver_code, num_of_pass, duration, vacant, done } = req.body;

    try {
        const updateDrive = await putDrive(code, date_time, destination, source, pass_code, driver_code, num_of_pass, duration, vacant,done);
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

//החזרת נסיעה נוכחית עבור נהג
app.get('/current-drive/:driverCode', async (req, res) => {
    const { driverCode } = req.params;
    try {
        const currentDrive = await getCurrentDrive(driverCode);
        res.send(currentDrive);
    } catch (error) {
        console.error('Error fetching current drive:', error);
        res.status(500).send('Error fetching current drive. Please try again.');
    }
});

// החזרת נסיעות רלוונטיות לנהג
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