import 'boxicons/css/boxicons.min.css';
import '../css/Login.css';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperclip } from 'react-icons/fa';
import Swal from 'sweetalert2';
import axios from 'axios';
import { imgUrl } from '../config';
const AuthForm = () => {
 
    const [file, setFile] = useState(null);
    const [isAddingPassenger, setIsAddingPassenger] = useState(false);
    const [isAddingDriver, setIsAddingDriver] = useState(true);
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [userDetails, setUserDetails] = useState({
        name: '',
        password: '',
        address: '',
        phone: '',
        vacant: '',
        numOfPlaces: '',
        dateOfBirth: '',
        profilPic: '',
        type: ''
    });

    const navigate = useNavigate();


    const handleChange = (event) => {
        const { name, value, files } = event.target;
        if (name === 'profilPic') {
            setFile(files[0]);
        }
        setUserDetails(prev => ({ ...prev, [name]: name === 'profilPic' ? files[0] : value }));
    };


    const addUser = () => {
        console.log(userDetails);
        const phoneRegex = /^\d{10}$/;
        if (!userDetails.name) return alert('יש להזין שם');
        if (!userDetails.password) return alert('יש להזין סיסמה');
        if (userDetails.phone && !phoneRegex.test(userDetails.phone)) return alert('מספר טלפון לא תקין');

        const data = new FormData();
        Object.entries(userDetails).forEach(([key, val]) => data.append(key, val));
        data.append('profilPic', file);

        const url = isAddingPassenger ? 'http://localhost:8080/passengers' : 'http://localhost:8080/drivers';
        axios.post(url, userDetails)
            .then(res => {
                const newUser = res.data;
                const userType = isAddingPassenger ? 'passenger' : 'driver';
                newUser.type = userType;
                navigate(`/${userType}/${newUser.name}`, { state: { user: newUser } });
            })

            .catch((error) => {
                Swal.fire({
                    icon: 'error',
                    title: 'שגיאה',
                    text: error?.response?.status === 500
                        ? 'משתמש קיים'
                        : 'אירעה שגיאה בעת הוספת המשתמש',
                });
            });

    };


    const Login = (user) => {        
        axios.post('http://localhost:8080/passengers/checkPassword', {
            name: user.name,
            password: user.password
        })
            .then(response => {

                if (response.data.isValid) {
                    let currentUser = response.data.currentuser[0];                    
                    const key = response.data.type === 'passenger' ? 'current_pass' : 'current_driver';
                    // localStorage.setItem(key, JSON.stringify(currentUser));                    
                    navigate(`/${response.data.type}/${currentUser.name}`, { state: { user: currentUser } });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'שגיאה',
                        text: "שם משתמש או סיסמה שגויים",
                    });
                }
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'שגיאה',
                    text: "שם משתמש או סיסמה שגויים",
                });
            });
    };


    return (
        <div className='wrapper'>
            <div className={`container ${isRegisterMode ? 'active' : ''}`}>
                <div className="form-box login">
                    <form>
                        <h1>Login</h1>
                        <div className="input-box">
                            <input type="text" placeholder="Username" required name="name" onChange={handleChange} />
                            <i className="bx bxs-user"></i>
                        </div>
                        <div className="input-box">
                            <input type="password" placeholder="Password" required name="password" onChange={handleChange} />
                            <i className="bx bxs-lock-alt"></i>
                        </div>
                        <button type="button" className="btn" onClick={() => Login(userDetails)}>Login</button>
                    </form>
                </div>


                <div className="form-box register">
                    <form>
                        <h1>Registration</h1>

                        <div className="input-box">
                            <input type="text" placeholder="Username" name="name" onChange={handleChange} />
                            <i className="bx bxs-user"></i>
                        </div>

                        <div className="input-box">
                            <input type="email" placeholder="Email" name="email" onChange={handleChange} />
                            <i className="bx bxs-envelope"></i>
                        </div>

                        <div className="input-box">
                            <input type="password" placeholder="Password" name="password" onChange={handleChange} />
                            <i className="bx bxs-lock-alt"></i>
                        </div>

                        <div className="input-box">
                            <input type="text" placeholder="Phone" name="phone" onChange={handleChange} />
                            <i className="bx bxs-phone"></i>
                        </div>

                        {isAddingPassenger && (
                            <div className="input-box">
                                <input type="text" placeholder="Address" name="address" onChange={handleChange} />
                                <i className="bx bxs-home"></i>
                            </div>
                        )}
                        {isAddingDriver && (
                            <div className="input-box">
                                <select name="numOfPlaces" onChange={handleChange} defaultValue="">
                                    <option value="" disabled>choose number of seats</option>
                                    <option value="5">5</option>
                                    <option value="7">7</option>
                                    <option value="10">10</option>
                                </select>
                                <i className="bx bxs-car-garage"></i>
                            </div>
                        )}
                        <div className="role-toggle">
                            <button
                                type="button"
                                className={isAddingPassenger ? "role-btn active" : "role-btn"}
                                onClick={() => {
                                    setIsAddingPassenger(true);
                                    setIsAddingDriver(false);
                                }}
                            >
                                נוסע
                            </button>
                            <button
                                type="button"
                                className={isAddingDriver ? "role-btn active" : "role-btn"}
                                onClick={() => {
                                    setIsAddingDriver(true);
                                    setIsAddingPassenger(false);
                                }}
                            >
                                נהג
                            </button>
                        </div>

                        <div className="input-box file-upload">
                            <label htmlFor="file-input" className="file-upload-label">
                                <FaPaperclip className="file-upload-icon" /> תמונת פרופיל
                            </label>
                            <input name="profilPic" type="file" id="file-input" className="file-upload-input" onChange={handleChange} />
                        </div>

                        <button type="button" className="btn" onClick={addUser}>Register</button>
                    </form>
                </div>

                <div className="toggle-box">
                    <div className="toggle-panel toggle-left">
                        <h1>Hello, Welcome!</h1>
                        <p>Don't have an account?</p>
                        <button className="btn register-btn" type="button" onClick={() => setIsRegisterMode(true)}>Register</button>
                    </div>
                    <div className="toggle-panel toggle-right">
                        <h1>Welcome Back!</h1>
                        <p>Already have an account?</p>
                        <button className="btn login-btn" type="button" onClick={() => setIsRegisterMode(false)}>Login</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AuthForm;
