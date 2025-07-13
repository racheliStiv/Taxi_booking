import mySql from "mysql2"
const pool = mySql.createPool({
    host: "127.0.0.1",
    password: "rs325978674",
    user: 'root',
    database: 'server_gettaxi'
}).promise();

export default pool;
