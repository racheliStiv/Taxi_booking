import pool from "../dataBase.js";

export async function getPassengers(code) {
    if (!code) {
        const [allPassengers] = await pool.query("SELECT code, name, address, phone, profilPic, active FROM passengers WHERE active = true");
        return allPassengers;
    }
    return getPassenger(code);
}

export async function getPassenger(name, password) {
    if (name != null && password == null) {
        const [[passenger]] = await pool.query(`SELECT code, name, address, phone, profilPic, active FROM passengers WHERE active = true AND code = ?`, [name]);
        return passenger;
    }
    const [[passenger]] = await pool.query(`SELECT code, name, address, phone, profilPic, active FROM passengers WHERE active = true AND name=? AND password = ?`, [name, password]);
    return passenger;
}

export async function postPassenger(name, password, address, phone, profilPic) {
    const passengerIsExists = await getPassenger(name, password);
    if (passengerIsExists)
        throw new Error(`passenger ${name} allready exist`);
    const [{ insertCode }] = await pool.query(`INSERT INTO passengers ( name, password, address, phone, profilPic) VALUES (?, ?,?, ?, ?)`, [name, password, address, phone, profilPic]);
    return await getPassenger(insertCode);
}

export async function putPassenger(code, name, address, phone, profilPic) {
    const passengerExists = await getPassengers(code);
    if (!passengerExists) {
        throw new Error(`passenger ${name} does not exist`);
    }
    const [result] = await pool.query(`UPDATE passengers SET name=?, address=?, phone=?,profilPic=? WHERE code=?`, [name, address, phone, profilPic, code]);
    if (result.affectedRows === 0) {
        throw new Error(`passenger ${name} does not found`);
    }
    return await getPassengers(code);
}

export async function deletePassenger(code) {
    try {

        // עדכון השדה active להיות false
        const [result] = await pool.query(`UPDATE passengers SET active=? WHERE code=?`, [false, code]);

        // בדיקת מספר הרשומות המעודכנות
        if (result.affectedRows === 0) {
            throw new Error(`passenger ${code} does not found`);
        }

        return { code };
    } catch (error) {
        console.error("Error updating driver:", error);
        throw error;
    }
}

export async function isDriveAccept(code) {

    const [result] = await pool.query(`SELECT *
           FROM drives d1
           JOIN drivers d2 ON d1.driver_code = d2.code
           WHERE d1.pass_code = ? AND d1.vacant = 1 AND d2.vacant = 0 AND d2.active = 1`, [code]);
    if (result.affectedRows != 0) {
        return result;
    }
    return false;;
}

export async function getPassengerforPassWord(name) {
    try {
        const [rows] = await pool.query('SELECT * FROM passengers WHERE name = ?', [name]);
        if (rows.length === 0) {
            return [];
        }
        return rows; // החזרת כל הרשומות שנמצאו
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}
