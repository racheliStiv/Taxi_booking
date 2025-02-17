import pool from "../dataBase.js";
import axios from 'axios';

// פונקציה להחזרת נסיעות לפי קוד נוסע
export async function getDrives(code) {
    if (!code) {
        const [allDrives] = await pool.query("SELECT * FROM drives");
        return allDrives;
    } else {
        return getDrive(code);
    }
}

// פונקציה להחזרת נסיעה בודדת לפי קוד
export async function getDrive(code) {
    const [drive] = await pool.query("SELECT * FROM drives WHERE pass_code = ? AND date_time IS NOT NULL", [code]);
    return drive;
}

export async function postDrive(destination, source, pass_code, num_of_pass) {
    try {
        const [result] = await pool.query(
            "INSERT INTO drives (destination, source, pass_code, num_of_pass) VALUES (?, ?, ?, ?)",
            [destination, JSON.stringify(source), pass_code, num_of_pass]
        );

        const insertId = result.insertId;
        return await getDrive(insertId);
    } catch (error) {
        console.error('Error inserting drive:', error);
        throw error;
    }
}

// פונקציה לעדכון נסיעה
export async function putDrive(code, date, destination,source, pCode, dCode, numOfPass, duration, vacant) {
    const driverIsExists = await getDrive(code);
    if (!driverIsExists) {
        throw new Error(`drive ${code} does not exist`);
    }
  
    const [result] = await pool.query(
        "UPDATE drives SET date_time=?, destination=?, source=?, pass_code=?, driver_code=?,  num_of_pass=?, duration=?, vacant=? WHERE code=?",
        [date, destination, source, pCode, dCode, numOfPass, duration, vacant, code]
    ).catch(error => {
        console.error('Error updating drive:', error);
        throw error; // יש לטפל בשגיאה כדי שהיא לא תיברא לאחר מכן
    });
   
    return await getDrive(code);
}

// פונקציה למחיקת נסיעה
export async function deleteDrive(code) {
    const [result] = await pool.query("DELETE FROM drives WHERE code=?", [code]);
    if (result.affectedRows === 0) {
        throw new Error(`drives ${code} does not found`);
    }
    return { code };
}


async function geocodeAddress(address) {
    try {
        const apiKey ="AIzaSyD0y-2f3prjfXVnYibVVwWuq4ww2Z7azh8";
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

        const response = await axios.get(url);

        if (response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            const latitude = location.lat;
            const longitude = location.lng;
            return { latitude, longitude };
        } else {
            throw new Error('No results found');
        }
    } catch (error) {
        console.error('Error geocoding address:', error.message);
        throw error;
    }
}


export async function getRelevantDrives(driverCode, location) {
    try {
        // Step 1: Fetch the driver's details
        const [[driver]] = await pool.query('SELECT code, name, vacant, num_of_places, active ,profilPic FROM drivers WHERE code = ?', [driverCode]);
        if (!driver) {
            throw new Error('Driver not found');
        }
        const numOfPlaces = driver.num_of_places;
        
        // Step 2: Fetch all drives with matching or fewer seats than the driver's capacity and are vacant
        const drivesQuery = `
            SELECT *
            FROM drives
            WHERE num_of_pass <= ?
            AND vacant = 0`;
        
        const [matchingDrives] = await pool.query(drivesQuery, [numOfPlaces]);
        
        // Step 3: Geocode all source addresses of the matching drives
        const geocodingPromises = matchingDrives.map(async (drive) => {
            try {
                const coords = await geocodeAddress(drive.source);
                return {
                    ...drive,
                    sourceCoords: coords
                };
            } catch (error) {
                console.error(`Error geocoding drive ${drive.code}:`, error);
                return {
                    ...drive,
                    sourceCoords: null  // or handle the error as per your requirements
                };
            }
        });

        const drivesWithSourceCoords = await Promise.all(geocodingPromises);
        
        // Step 4: Calculate distances for each drive from the given location
        const drivesWithDistances = drivesWithSourceCoords.map(drive => ({
            ...drive,
            distance_to_location: calculateDistance(location, drive.sourceCoords)  // Implement your distance calculation function
        }));
        // Step 5: Sort drives by distance and return the closest 3 drives
        const sortedDrives = drivesWithDistances
            .filter(drive => drive.distance_to_location !== null)  // Filter out drives with null distance
            .sort((a, b) => a.distance_to_location - b.distance_to_location)
            .slice(0, 3);
        
        return sortedDrives;
    } catch (error) {
        console.error("Error fetching relevant drives:", error);
        throw error;
    }
}

function calculateDistance(location, sourceCoords) {
    if (!sourceCoords || !location) return null;  // Handle cases where sourceCoords is null or location is not provided
    
    const [latitude, longitude] = location.split(',').map(Number);

    if (isNaN(latitude) || isNaN(longitude)) {
        console.error('Invalid location coordinates');
        return null;
    }
    
    const R = 6371e3;  // Radius of the Earth in meters
    const lat1 = latitude * Math.PI / 180;  // Convert degrees to radians
    const lat2 = sourceCoords.latitude * Math.PI / 180;
    const deltaLat = (sourceCoords.latitude - latitude) * Math.PI / 180;
    const deltaLng = (sourceCoords.longitude - longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;  // Distance in meters

    return distance;
}

