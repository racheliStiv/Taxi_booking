import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'; // Import BrowserRouter as Router
import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';
import Passenger from './jsx/Passenger'
import Login from './jsx/Login';
import Driver from './jsx/Driver'
import MyGoopleMap from './jsx/MyGoopleMap';

import './App.css'

function App() {
  const [socket, setSocket] = useState(null);


  useEffect(() => {
    const newSocket = io('http://localhost:8080'); 
    setSocket(newSocket);
    newSocket.on('connect', () => {
      console.log('התחברנו לסוקט עם id:', newSocket.id);
    });
    return () => {
      newSocket.disconnect();
    };
  }, []);


  return (
    <Router>
      <Routes>
        <Route path='/' element={<Navigate to='/login/' />} />
        <Route path='/login' element={<Login />} />
        <Route path='/myGoopleMap' element={<MyGoopleMap />} />

        <Route path='/passenger/:passName?' element={<Passenger  />} />
        <Route path='/driver/:driverName?' element={<Driver socket={socket} />} />
      </Routes>
    </Router>
  )
}

export default App
