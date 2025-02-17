import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPaperclip } from 'react-icons/fa';
import Swal from 'sweetalert2'
import axios from 'axios';
import { imgUrl } from '../config'
import '../css/Login.css';

const Login = () => {
    const [allUsers, setAllUsers] = useState([]);
    const [hoveredUser, setHoveredUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [file, setFile] = useState(null);
    const [isAddUser, setIsAddUser] = useState(false);
    const [isAddingPassenger, setIsAddingPassenger] = useState(false);
    const [isAddingDriver, setIsAddingDriver] = useState(false);
    const [userDetails, setUserDetails] = useState({
        name: '',
        password: '',
        address: '',
        phone: '',
        vacant: '',
        numOfPlaces: '',
        dateOfBirth: '',
        profilPic: ''
    });
    const [originalUsers, setOriginalUsers] = useState([]);
    const navigate = useNavigate();
//שליפת כל המשתמשים
    useEffect(() => {
        axios.get('http://localhost:8080/passengers')
            .then(response => {
                const passengers = Array.isArray(response.data) ? response.data : [];
                return axios.get('http://localhost:8080/drivers')
                    .then(response => {
                        const drivers = Array.isArray(response.data) ? response.data : [];
                        const allUsers = [
                            ...passengers.map(user => ({ ...user, type: 'passenger' })),
                            ...drivers.map(user => ({ ...user, type: 'driver' }))
                        ];
                        setAllUsers(allUsers);
                        setOriginalUsers(allUsers); // Save original users
                    });
            })
            .catch(error => {
                if (error.response) {
                    alert(`Server failed: ${error.response.data}`);
                } else if (error.request) {
                    alert('No response received from server');
                } else {
                    alert(`Error: ${error.message}`);
                }
            });
    }, []);
// שליחת הסיסמא לשרת 
    const handleSelect = (user) => {
        setCurrentUser(user);

        Swal.fire({
            title: 'הזן סיסמת משתמש',
            input: 'password',
            inputAttributes: {
                autocapitalize: 'off'
            },
            showCloseButton: true,
            closeButtonHtml: '<span style="font-size: 24px; color: #888;">&#10005;</span>',
            confirmButtonText: 'אישור',
            showLoaderOnConfirm: true,
            preConfirm: (pass) => {
                
                return  axios.post('http://localhost:8080/passengers/checkPassword', {
                    name: user.name,
                    password: pass
                })
                    .then(response => {
                        if (response.data.isValid) {
                            const newUser = { ...user };
                            localStorage.setItem('currentUser', JSON.stringify(newUser));
                            setCurrentUser(newUser);
                            return "ברוך הבא";
                        } else {
                            throw new Error("סיסמה שגויה, נסה שנית.");
                        }
                    })
                    .catch(error => {
                        Swal.showValidationMessage(
                            `שגיאה בבדיקת הסיסמה: ${error}`
                        );
                    });
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed) {
                navigate(`/${user.type}/${user.name}`);
            }
        });
    };
//תפיסת הפרטים המוכנסים
    const handleChange = (event) => {
        const { name, value } = event.target;
        setUserDetails((prevDetails) => ({
            ...prevDetails,
            [name]: value
        }));
    };
//הוספת משתמש חדש
    const addUser = () => {
        const phoneRegex = /^\d{10}$/;
        if (userDetails.name.length === 0) {
            alert("יש להזין שם");
        } else if (userDetails.password.length === 0) {
            alert("יש להזין סיסמה");
        } else if (!phoneRegex.test(userDetails.phone) && userDetails.phone.length !== 0) {
            alert('מספר טלפון לא תקין');
        } else {
            const data = new FormData();
            Object.keys(userDetails).forEach(x => {
                data.append(x, userDetails[x])
            })
            //הוספת התמונה
            data.append('profilPic', file)
            const url = isAddingPassenger ? `http://localhost:8080/passengers` : 'http://localhost:8080/drivers';
            axios.post(url, userDetails).then(newUser => {
                localStorage.setItem('currentUser', JSON.stringify(userDetails));
                setCurrentUser(newUser.data);
            }).catch(() => { alert('ERROR') });
            setIsAddUser(false);
        }
    };
//חיפוש לפי שם משתמש
    const handleSearch = (event) => {
        const searchValue = event.target.value.toLowerCase();
        if (searchValue.trim() === '') {
            setAllUsers(originalUsers); // Restore original users
        } else {
            setAllUsers(prevUsers => prevUsers.filter(user => user.name.toLowerCase().includes(searchValue)));
        }
    };
    return (
        <div className='mainL'>
            {isAddUser && <div>
                <div className="addUserL">
                    <form>
                    <button id="addpassL"  onClick={() => setIsAddUser(!isAddUser)}>+</button>
                        <p>הוספת משתמש</p>
                        <div>
                            <input className='addL' type="text" placeholder='שם' onChange={handleChange} name='name' required />
                            <input className='addL'type="password" placeholder='סיסמה' onChange={handleChange} name='password' required />
                            {isAddingPassenger && (
                                <>
                                    <input className='addL' type="text" placeholder='כתובת' onChange={handleChange} name='address' />
                                    <input className='addL' type="text" placeholder='טלפון' onChange={handleChange} name='phone' />
                                </>
                            )}
                            {isAddingDriver && (
                                <>
                                    <input className='addL' type="text" placeholder='מספר מקומות ברכב' onChange={handleChange} name='numOfPlaces' />
                                    <input className='addL' type="text" placeholder='תאריך לידה' onChange={handleChange} name='dateOfBirth' />
                                </>
                            )}
                            <label htmlFor="file-input" className="file-upload-label">
                                <FaPaperclip className="file-upload-icon" />תמונת פרופיל
                            </label>
                            <input name='profilPic' type="file" id="file-input" className="file-upload-input" onChange={(event) => setFile(event.target.files[0])} />
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddingPassenger(true); // לחיצה על כפתור נוסע
                                    setIsAddingDriver(false); // איפוס כפתור נהג
                                }}
                                style={{ margin: '10px', backgroundColor: isAddingPassenger ? 'lightblue' : 'white' }}
                            >
                                נוסע
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddingDriver(true); // לחיצה על כפתור נהג
                                    setIsAddingPassenger(false); // איפוס כפתור נוסע
                                }}
                                style={{ margin: '10px', backgroundColor: isAddingDriver ? 'lightblue' : 'white' }}
                            >
                                נהג
                            </button>
                        </div>
                        <button className='btn' onClick={addUser}>הוסף</button>
                    </form>
                </div>
            </div>}
            {!isAddUser && <div className='allPassL'>
            <h2 style={{ textAlign: 'center' }}>our members </h2>
             
                <div id='title'>
                <button id="addpassL"  onClick={() => setIsAddUser(!isAddUser)}>+</button>
                <input id='search' type="text" placeholder="חפש לפי שם" onChange={handleSearch} /></div>
                <ul className='userListL' style={{ listStyleType: 'none' }}>
                    {allUsers.map((user, index) => (
                        <li id='liUsersL' key={index}
                            style={{ transition: 'transform 0.2s ease-in-out', transform: hoveredUser === user ? 'scale(1.1)' : 'scale(1)', boxShadow: hoveredUser === user ? '0 0 10px rgba(0, 0, 0, 0.2)' : 'none', backgroundColor: '#f0f0f0'}}
                            onMouseEnter={() => setHoveredUser(user)}
                            onMouseLeave={() => setHoveredUser(null)}
                            onClick={() => handleSelect(user)}>
                            <div >
                                <span >{user.name}</span>
                                <img src={`${imgUrl}/pictures/${user.profilPic}`} style={{ width: '50px', height: '50px', borderRadius: '50%', marginLeft: '10px' }} />
                            </div>
                        </li>
                    ))}
                </ul>

            </div>
              } 
        </div>
     
    );  
};

export default Login;