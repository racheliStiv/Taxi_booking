import pool from "../dataBase.js";

export async function getDrivers(code) {
    if (!code) {
        const [allDrivers] = await pool.query("SELECT code, name, vacant, num_of_places, active, profilPic FROM drivers WHERE active = true");
        return allDrivers;
    } else {
        return getDriver(code);
    }
}

export async function getDriver(name, pass) {
    if (name != null && pass == null) {
        const [[driver]] = await pool.query(`SELECT code, name, vacant, num_of_places, active,profilPic FROM drivers WHERE code = ? `, [name]);
        return driver;
    }
    const [[driver]] = await pool.query(`SELECT code, name, vacant, num_of_places, active, profilPic FROM drivers WHERE password = ? AND name = ?`, [pass, name]);
    return driver;
}

export async function getDriverByCode(code) {
    const [[driver]] = await pool.query(`SELECT code, name, vacant, num_of_places, active, profilPic FROM drivers WHERE code = ?`, [code]);
    return driver;
}

export async function postDriver(name, vacant, numOfPlaces, password,profilPic) {

    const driverIsExists = await getDriver(name, password);
    if (driverIsExists) throw new Error(`driver ${name} already exists`);
    const [{ insertId }] = await pool.query(
        `INSERT INTO drivers (name, vacant, num_of_places, password, active, profilPic) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, vacant, numOfPlaces, password, profilPic]
    );
    return await getDriverByCode(insertId);
}

export async function putDriver(name, vacant, numOfPlaces, code,profilPic) {
    try {
        const driverIsExists = await getDriverByCode(code);
        if (!driverIsExists) throw new Error(`driver ${name} does not exist`);
        if (!name) {
            name = driverIsExists.name;
        }
        const [result] = await pool.query(
            `UPDATE drivers SET name=?, vacant=?, num_of_places=?,profilPic= ? WHERE code=?`,
            [name, vacant, numOfPlaces,profilPic, driverIsExists.code]
        );
        console.log(result.numOfPlaces)
        if (result.affectedRows === 0) throw new Error(`driver ${name} was not updated`);
        return await getDriverByCode(code);
    } catch (error) {
        console.error("Error updating driver:", error);
        throw error;
    }
}

export async function deleteDriver(code) {
    try {

        // עדכון השדה active להיות false
        const [result] = await pool.query(`UPDATE drivers SET active=? WHERE code=?`, [false, code]);

        // בדיקת מספר הרשומות המעודכנות
        if (result.affectedRows === 0) {
            throw new Error(`driver ${code} does not found`);
        }

        return { code };
    } catch (error) {
        console.error("Error updating driver:", error);
        throw error;
    }
}

export async function getDriverforPassWord(name) {
    try {
        const [rows] = await pool.query('SELECT * FROM drivers WHERE name = ?', [name]);
        if (rows.length === 0) {
            console.log(`Driver ${name} not found`);
            return [];
        }
        return rows; // החזרת כל הרשומות שנמצאו
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}