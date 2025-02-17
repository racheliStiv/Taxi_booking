import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'; // Import BrowserRouter as Router

import Passenger from './jsx/Passenger'
import Login from './jsx/Login';
import Driver from './jsx/Driver'
import './App.css'

function App() {
 


  return (
    <Router>
      <Routes>
        <Route path='/' element={<Navigate to='/login' />} />
        <Route path='/login' element={<Login />} />
        <Route path='/passenger/:passName' element={<Passenger />} />
        <Route path='/driver/:driverName' element={<Driver />} />
      </Routes>
    </Router>

  )
}

export default App
