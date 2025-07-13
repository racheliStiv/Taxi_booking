import '../css/Passenger.css';
import MyGoopleMap from './MyGoopleMap';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { url, imgUrl } from '../config'
import Swal from 'sweetalert2'
import { geocode, RequestType, } from "react-geocode";
import axios from 'axios';
import { io } from 'socket.io-client';

const Passenger = () => {
    const location = useLocation();

    const [apiKey, setApiKey] = useState("AIzaSyBag636q6od-8TZAa3M3fKipqzFPIfUr9E");
    const [isOpenMenu, setIsOpenMenu] = useState(false);
    const [isOpenUpdate, setIsOpenUpdate] = useState(false);
    const [passenger, setPassenger] = useState(location.state?.user);
    const [currentDriver, setCurrentDriver] = useState(JSON.parse(localStorage.getItem('current_driver')));
    const [verifyDel, setVerifyDel] = useState(false);
    const [showMyDrives, setShowMyDrives] = useState(false);
    const [myDrives, setMyDrives] = useState([]);
    const [selectedDrive, setSelectedDrive] = useState(null);
    const navigate = useNavigate();
    const [directions, setDirections] = useState(null);
    const [source, setSource] = useState(null);
    const [destination, setDestination] = useState(null);
    const [duration, setDuration] = useState(null)
    const [showfreedrive, setShowfreedrive] = useState(false);
    const [entitlement, setEntitlement] = useState(false);
    const [noEntitlement, setNoEntitlement] = useState(false);
    const [totalDuration, setTotalDuration] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [eligibilityText, setEligibilityText] = useState('');
    const [socketId, setSocketId] = useState(null);

    const [newDrive, setNewDrive] = useState({
        driveDest: '',
        driveSource: '',
        pass_code: '',
        num_of_pass: '',
        duration: ''
    });

    const phoneNumber = currentDriver ? currentDriver.phone : null;
    const message = 'שלום רציתי לשאול על המוצר';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    const socket = useRef(null);


    //הודעה לנוסע כשנהג בוחר/מסיים נסיעה
    useEffect(() => {
        socket.current = io('http://localhost:8080');
        socket.current.on('connect', () => {
            console.log('התחברנו לסוקט עם id:', socket.current.id);
            setSocketId(socket.current.id);
            socket.current.emit('passengerConnected', { code: passenger.code });

        });
        socket.current.on('DrivingBegin', (newDrive) => {
            Swal.fire({
                title: '!המונית שלך בדרך',
                text: `המונית שלך מ ${newDrive.origin} ל-${newDrive.destination} תגיע בעוד כמה דקות`,
                imageUrl: '/pictures/taxiIcon.jpg',
                imageWidth: 100,
                imageHeight: 100,
                imageAlt: 'מונית בתנועה',
                confirmButtonText: 'אישור',
                customClass: 'custom-swal-icon'
            });
            // }
        })
        socket.current.on('driverFinishedDrive', (data) => {
            Swal.fire({
                title: 'הנסיעה הסתיימה',
                text: `הנסיעה שלך מ ${data.origin} ל-${data.destination} הסתיימה בהצלחה.`,
                icon: 'success',
                confirmButtonText: 'אוקי'
            });
        });
        return () => {
            socket.current.disconnect();
        };

    }, []);



    //פונ להצגת הנסיעות
    useEffect(() => {
        axios.get(`http://localhost:8080/drives?pass_code=${passenger.code}`)
            .then(res => {
                setMyDrives(res.data);
            })
            .catch(err => { alert(err) });
    }, [passenger.code]);


    //עדכון אינפוטים
    const handleChange = (e) => {
        const { name, value } = e.target;
        setPassenger(prevPassenger => ({
            ...prevPassenger,
            [name]: value || ''
        }));
    };

    //עדכון נוסע
    const updatePass = () => {
        const phoneRegex = /^\d{10}$/;
        if (passenger.name.length === 0) {
            alert("יש להזין שם");
        } else if (!phoneRegex.test(passenger.phone) && passenger.phone.length !== 0) {
            alert('מספר טלפון לא תקין');
        } else {
            axios.put(`http://localhost:8080/passengers?code=${passenger.code}`, {
                name: passenger.name,
                // password: passenger.password,
                address: passenger.address,
                phone: passenger.phone
            }).then(() => {
                localStorage.setItem('currentPassenger', JSON.stringify(passenger));
            })
                .catch((err) => { alert(err) });
            setIsOpenUpdate(false);
        }
    };

    //מחיקת נוסע
    const deletePass = () => {
        axios.delete(`http://localhost:8080/passengers?code=${passenger.code}`).then(() => {
            localStorage.removeItem('currentPassenger');
            navigate(`/login`);
        })
            .catch(error => console.error("Error fetching comments:", error));
    };

    //בחירת גודל מונית
    const handleSelectTaxiChange = (event) => {
        setNewDrive(prevDrive => ({
            ...prevDrive,
            num_of_pass: event.target.value
        }));
    };


    //עדכון יעד ומקור נסיעה
    const handleInputChange = async (event) => {
        const { name, value } = event.target;
        const path = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(value)}&key=${apiKey}`;
        const response = await axios.get(path)
        const data = response.data;
        if (!data || data.status === "ZERO_RESULT") {
            console.log("BUG");
        }
        else {
            const coordinate = data.results[0].geometry.location;
            if (name == 'driveSource') {
                setSource({ lat: coordinate.lat, lng: coordinate.lng });
            }
            else {
                setDestination({ lat: coordinate.lat, lng: coordinate.lng });
            }
        }
        setNewDrive(prevDrive => ({
            ...prevDrive,
            [name]: value
        }));
    };


    //המזנת נסיעה
    const orderDrive = async () => {

        // בדיקת שדות חובה
        if (!newDrive.driveSource || !newDrive.driveDest || !newDrive.num_of_pass) {
            alert('חסרים פרטים להזמנת נסיעה');
            return;
        }
        // ביצוע ההזמנה
        try {
            newDrive.pass_code = passenger.code;
            newDrive.date_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
            newDrive.duration = duration ? `${Math.floor(duration / 60)} שעות ו-${duration % 60} דקות` : '';

            axios.post('http://localhost:8080/drives', newDrive).then(res => {
                const addedDrive = res.data[0];
                setMyDrives(prevDrives => [...prevDrives, addedDrive]);
                Swal.fire({
                    title: 'הזמנתך נוספה בהצלחה!',
                    icon: 'success',
                    confirmButtonColor: "#007bff",
                });
            }).catch(err => {
                console.error("Error ordering drive:", err);
                Swal.fire({
                    title: 'שגיאה בהזמנה',
                    text: err.message,
                    icon: 'error',
                });
            });
            // ניקוי השדות
            setNewDrive(prevD => ({
                ...prevD,
                driveSource: '',
                driveDest: '',
                pass_code: passenger.code,
                num_of_pass: '',
                duration: ''
            }));
            setDestination(null);
            setSource(null)
            setDirections('')
            setDuration(null)
            //למחוק את הסמנים מהמפה!!!!!!!!!!!!!
            //למחוק את משך הנסיעה!!!!!!!!!!!!!
        } catch (error) {
            console.error("Error ordering drive:", error);
            Swal.fire({
                title: 'שגיאה בהזמנה',
                text: error.message,
                icon: 'error',
            });
        }
    };


    const closeMyDrives = () => {
        setShowMyDrives(false);
        setSelectedDrive(null);
    };


    const logOut = () => {
        navigate('/login');
    };

    //פונקציה שבודקת האם יש זכאות לנסיעת חינם
    const checkFreeDrive = () => {
        let totalMinutes = 0;
        myDrives.forEach(drive => {
            if (drive.duration != null) {
                const durationParts = drive.duration.match(/\d+/g);
                const hours = parseInt(durationParts[0]);
                const minutes = parseInt(durationParts[1]);
                totalMinutes += (hours * 60) + minutes;
            }

        });
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        setTotalDuration(` ${totalHours} שעות ו-${remainingMinutes} דקות`);

        setIsChecking(true);
        setEligibilityText('מחשב...');
        setTimeout(() => {
            setIsChecking(false);
            setEligibilityText('');
            if (totalHours > 30) {
                setEntitlement(true);
                return totalHours, remainingMinutes;
            }
            else {
                setNoEntitlement(true);
            }
        }, 1000);


    };


    const closeFreeDrive = () => {
        setShowfreedrive(false)
        setEntitlement(false)
        setNoEntitlement(false);

    }


    const handleBlur = (event) => {
        const address = event.target.value.trim();
        if (address !== '') {
            geocode(RequestType.ADDRESS, address)
                .then(({ results }) => {
                    if (results.length > 0) {
                        const { lat, lng } = results[0].geometry.location;
                        const newDestination = { lat: lat, lng: lng };
                        setDestination(newDestination);
                        if (event.target.name == 'driveDest') {
                            setNewDrive(prevDrive => ({
                                ...prevDrive,
                                driveDest: address
                            }));
                        }
                        else {
                            setNewDrive(prevDrive => ({
                                ...prevDrive,
                                driveSource: address
                            }));
                        }
                    } else {
                        console.error('לא נמצאו תוצאות עבור הכתובת:', address);
                    }
                })
                .catch(console.error);
        }
    };

    //שינוי יעד על ידי לחיצה על המפה
    const changeDest = (event) => {
        const { latLng } = event;
        const latitude = latLng.lat();
        const longitude = latLng.lng();
        const newDestination = { lat: latitude, lng: longitude };
        setDestination(newDestination);
        geocode(RequestType.LATLNG, `${latitude},${longitude}`)
            .then(({ results }) => {
                const address = results[0].formatted_address;
                setNewDrive(prevDrive => ({
                    ...prevDrive,
                    driveDest: address
                }));
            })
            .catch(console.error);
    };

    const [arrivalTime, setArrivalTime] = useState(null)



    return (
        <div className="main">
            <div className="sidebar">
                <button className="menuBTN" onClick={() => setIsOpenMenu(!isOpenMenu)}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                </button>

                {isOpenMenu &&
                    <div className='menu' >
                        <div style={{ fontSize: "25px", position: 'fixed', right: '40%', top: '7%', textAlign: 'center', margin: '0 auto' }}>
                            {passenger != null &&
                                <>
                                    <img src={`${imgUrl}/pictures/${passenger.profilPic}`} style={{ width: '90px', height: '90px', borderRadius: '50%' }} alt="Profile Pic" />
                                    <p>{passenger.name}</p>
                                </>}
                        </div>
                        <div style={{ flexDirection: 'column', display: 'flex', alignItems: 'center', marginTop: '70%' }}>
                            <button onClick={() => setIsOpenUpdate(true)} style={{ zIndex: '100', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', display: 'block' }}> עדכון הפרטים</button>
                            <button onClick={() => setShowMyDrives(true)} style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }}>הנסיעות שלי</button>
                            <button onClick={() => setShowfreedrive(true)} style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }}>נסיעת חינם</button>
                            <button onClick={() => setVerifyDel(true)} style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }}>מחיקת נוסע</button>
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => logOut()}>logout</button>
                        </div>

                    </div>
                }

                {/* הזמנת נסיעה */}
                {!showMyDrives && !isOpenUpdate &&
                    <>
                        <div className='orderDrive' >
                            <div style={{ position: 'fixed', display: 'flex', flexDirection: 'column', direction: 'rtl', width: '13%', height: '40%' }}>
                                <h2 >הזמנת נסיעה</h2>
                                <input
                                    placeholder='נקודת התחלה'
                                    name='driveSource'
                                    value={newDrive.driveSource || ''}
                                    onChange={handleInputChange}
                                // onBlur={handleBlur} 
                                />
                                <input
                                    placeholder='נקודת יעד'
                                    name='driveDest'
                                    value={newDrive.driveDest || ''}
                                    onChange={handleInputChange}
                                // onBlur={handleBlur}
                                />
                                <select className='selector' value={newDrive.num_of_pass || ''} onChange={handleSelectTaxiChange}>
                                    <option value='' disabled hidden>גודל המונית</option>
                                    <option value="5">5 מקומות</option>
                                    <option value="7">7 מקומות</option>
                                    <option value="10">10 מקומות</option>
                                </select>
                                <button onClick={orderDrive}>הזמן</button>

                                {duration != null && duration[1] != null && <p>משך הנסיעה: {`${duration[0]} שעות,ו ${duration[1]} דקות `} </p>}
                                {duration != null && duration[1] == null && <p>משך הנסיעה: {`${duration[0]} דקות `} </p>}
                                {arrivalTime && <p>זמן ההגעה המשוער: {arrivalTime.getHours()}:{arrivalTime.getMinutes()}</p>}
                            </div></div>

                    </>
                }

                {showMyDrives &&
                    <div className='myDrives' >
                        {selectedDrive && (
                            <>
                                <div className="overlay" onClick={() => setSelectedDrive(false)}></div>
                                <div className='driveDetails'>
                                    <button onClick={() => setSelectedDrive(false)}>X</button>
                                    <h2>פרטי נסיעה</h2>
                                    <p><strong>מאת:</strong> {selectedDrive.source}</p>
                                    <p><strong>אל:</strong> {selectedDrive.destination}</p>
                                    <p><strong>תאריך:</strong> {selectedDrive.date_time}</p>
                                    <p><strong>נהג:</strong> {selectedDrive.driver_code}</p>
                                    <p><strong>מספר נוסעים:</strong> {selectedDrive.num_of_pass}</p>
                                    <p><strong>משך נסיעה:</strong> {selectedDrive.duration}</p>
                                </div></>)}
                        <button onClick={closeMyDrives}>X</button>
                        <h2>הנסיעות שלי</h2>
                        <ul style={{ listStyleType: 'none', padding: 0 }}>
                            {myDrives.map((drive, index) => (

                                <li key={index} onClick={() => setSelectedDrive(drive)} style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #ccc' }}>
                                    <p><strong>מאיפה:</strong> {drive.source}</p>
                                    <p><strong>לאן:</strong> {drive.destination}</p>
                                    <p><strong>תאריך:</strong> {drive.date_time}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                }

                {isOpenUpdate ? (
                    <div className='updateDetails'>
                        <div style={{ position: 'fixed', display: 'flex', flexDirection: 'column', direction: 'rtl', width: '13%', height: '40%' }}>
                            <div style={{ position: 'relative', paddingTop: '40px', paddingInline: '20px', paddingBottom: '20px' }}>
                                <button className="closeUpdate" onClick={() => setIsOpenUpdate(false)} style={{
                                    position: 'absolute', top: '-18px', right: '-28px', border: '1px solid #5A67D8', backgroundColor: 'white', color: 'black', fontSize: '16px', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 0 0 2px rgba(90, 103, 216, 0.3)', lineHeight: '1',
                                }}>X</button>
                                <h2 style={{ fontSize: '22px', textAlign: 'center', margin: '0 ', marginBottom: '20px', }}> עריכת פרטים אישיים</h2>
                            </div>
                            <div className='Ainputs'>
                                <div className='texts'>
                                    <p>שם</p>
                                    <p>כתובת</p>
                                    <p>טלפון</p>
                                </div>
                                <div >
                                    <input type="text" value={passenger.name || ''} placeholder='username' onChange={handleChange} name='name' />
                                    <input type="text" value={passenger.address || ''} placeholder='address' onChange={handleChange} name='address' />
                                    <input type="text" value={passenger.phone || ''} placeholder='phone' onChange={handleChange} name='phone' />
                                </div>

                            </div>
                            <button className='btn' onClick={updatePass}>ערוך</button>
                        </div>
                    </div>
                ) : null}

                <div className="tooltip-container">
                    <a
                        href={phoneNumber ? url : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            if (!phoneNumber) {
                                e.preventDefault(); // מונע מעבר לקישור
                                alert("עדיין אין לך נהג 😐");
                            }
                        }}
                    >
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                            alt="Chat on WhatsApp"
                            style={{ width: '50px', height: '50px' }}
                        />
                    </a>
                    <span className="tooltip-text">להתכתב עם הנהג שלך</span>
                </div>
            </div>
            {/*  הצגת המפה*/}
            <MyGoopleMap apiKey={apiKey} duration={duration} setDestination={setDestination} source={source} destination={destination} newDrive={newDrive} setDirections={setDirections} setDuration={setDuration} setNewDrive={setNewDrive} directions={directions} />

            {/* נסיעת חינם */}
            {showfreedrive && (
                <>
                    <div className="overlay"></div>
                    <div className="freeDrive">
                        <div className="subFree">
                            <button className="closeButton" onClick={closeFreeDrive}>X</button>
                            <h2>הסבר קצר:</h2>
                            <p>נסיעת חינם ניתנת לכל לקוח שנסע מעל ל-30 שעות עם נהגים מהחברה שלנו</p>
                            <p>האם את/ה זכאים לנסיעת חינם? לחצו על הכפתור למטה ובדקו זאת!!</p>
                            <button className='checkEntitlement' onClick={checkFreeDrive}>בדיקת זכאות</button>
                            {isChecking && <p>{eligibilityText}</p>}
                            {entitlement && <p>איזה יופייי הנכם זכאים לנסיעת חינם, תהנו!!!!</p>}
                            {noEntitlement && <p>כמעט שם...</p>}
                            {noEntitlement || entitlement && <p>עד עתה נסעת:{<br></br>} {totalDuration}</p>}
                        </div>
                    </div>
                </>
            )}

            {/* אישור לפני מחיקת משתמש */}
            {verifyDel &&
                <><div className="overlay"></div>
                    <div className='verifyDel'>
                        <div className="modal-content">
                            <p>האם אתה בטוח שברצונך למחוק את המשתמש?</p>
                            <div className="btn-group">
                                <button onClick={deletePass}>!בהחלט</button>
                                <button onClick={() => setVerifyDel(false)}>ביטול</button>
                            </div>
                        </div>
                    </div>
                </>
            }
        </div>
    );
};

export default Passenger;







// const socket = useRef(null);
// socket.current = io(url);

// useEffect(() => {
//     // console.log();
//     socket.current.on("newDrive", (newDrive) => {
//         Swal.fire({
// title: '!המונית שלך בדרך',
//     text: 'המונית תגיע בעוד כמה דקות',
//         imageUrl: '/pictures/taxiIcon.jpg',
//             imageWidth: 100,
//                 imageHeight: 100,
//                     imageAlt: 'מונית בתנועה',
//                         confirmButtonText: 'אישור',
//                             customClass: 'custom-swal-icon'
//     });
//     });
// }, []);