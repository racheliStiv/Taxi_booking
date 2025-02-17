import { io } from 'socket.io-client';
import '../css/Passenger.css';
import Swal from 'sweetalert2';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { url, imgUrl } from '../config'
import { setKey, geocode, RequestType, } from "react-geocode";
// import { AdvancedMarkerElement } from '@googlemaps/marker'

import { GoogleMap, MarkerF, useLoadScript, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import Geolocation from '@react-native-community/geolocation';
import axios from 'axios';
const libraries = ["places"];
//const apiKey = "AIzaSyD0y-2f3prjfXVnYibVVwWuq4ww2Z7azh8"
const apiKey = "AIzaSyBfgzVdk3QnZZBbyu1tguleiguMLT1SQCk"

const Passenger = () => {

    const [isOpenMenu, setIsOpenMenu] = useState(false);
    const [isOpenUpdate, setIsOpenUpdate] = useState(false);
    const [passenger, setPassenger] = useState(JSON.parse(localStorage.getItem('currentUser')));
    const [verifyDel, setVerifyDel] = useState(false);
    const [showMyDrives, setShowMyDrives] = useState(false);
    const [myDrives, setMyDrives] = useState([]);
    const [selectedDrive, setSelectedDrive] = useState(null);
    const navigate = useNavigate();
    const [directions, setDirections] = useState(null);
    const [destination, setDestination] = useState(null);
    const [duration, setDuration] = useState(null)
    const [showfreedrive, setShowfreedrive] = useState(false);
    const [entitlement, setEntitlement] = useState(false);
    const [noEntitlement, setNoEntitlement] = useState(false);
    const [totalDuration, setTotalDuration] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [eligibilityText, setEligibilityText] = useState('');
    const [newSource, setNewSource] = useState(null)
    const [position, setPosition] = useState({
        lat: 32.0853,
        lng: 34.7818
    });

    const [newDrive, setNewDrive] = useState({
        driveDest: '',
        driveSource: '',
        pass_code: passenger.code,
        num_of_pass: '',
        duration: ''
    });

    //שליפת הסיסמה
    useEffect(() => {
        axios.get(`http://localhost:8080/passengers?code=${passenger.code}`)
            .then(res => {
                setPassenger(prevPassenger => ({
                    ...prevPassenger,
                    password: res.data.password
                }));
            })
            .catch(err => { alert(err) });

    }, [passenger.code]);


    //הודעה אם המוננית בדרך
    useEffect(() => {
        const fetchTaxiStatus = () => {
            axios.get(`http://localhost:8080/passengers/isDriveAccept?code=${passenger.code}`)
                .then(res => {
                    if (res.data.length !== 0) {
                        Swal.fire({
                            title: '!המונית שלך בדרך',
                            text: 'המונית תגיע בעוד כמה דקות',
                            imageUrl: '/pictures/taxiIcon.jpg',
                            imageWidth: 100,
                            imageHeight: 100,
                            imageAlt: 'מונית בתנועה',
                            confirmButtonText: 'אישור',
                            customClass: 'custom-swal-icon'
                        });

                        // ניקוי האינטרוול אחרי שמוצג ה-alert
                        clearInterval(intervalId);
                    }
                })
                .catch(err => {
                    Swal.fire("Error", err.message, "error");
                });
        };

        fetchTaxiStatus(); // קריאה ראשונית לפונקציה
        const intervalId = setInterval(fetchTaxiStatus, 2000); // הגדרת אינטרוול ל-20 שניות

        return () => clearInterval(intervalId); // ניקוי האינטרוול כשנטענת הקומפוננטה
    }, [passenger.code]);// תלות בקוד הנוסע

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
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        if (name == 'driveSource') {
            setNewSource(value);
        }

        setNewDrive(prevDrive => ({
            ...prevDrive,
            [name]: value
        }));



    };

    //הזמנת נסיעה
    const orderDrive = () => {
        if (!newDrive.driveSource || !newDrive.driveDest || !newDrive.num_of_pass) {
            alert('חסרים פרטים להזמנת נסיעה');
        } else {
            axios.post('http://localhost:8080/drives', newDrive).then((res) => {
                alert("הזמנתך נוספה למערכת");
                setNewDrive(prevD => ({
                    ...prevD,
                    driveDest: '',
                    pass_code: passenger.code,
                    num_of_pass: '',
                    duration: ''
                }));
                setDestination(null)
                window.location.reload();//לשאול את שורהלה אם זה סבבהה!!!!!
            }).catch(error => console.error("Error fetching comments:", error));
        }
    };

    //שליפת כל הנסיעות שלי
    useEffect(() => {
        axios.get(`http://localhost:8080/drives?code=${passenger.code}`)
            .then(res => {
                setMyDrives(res.data);
            })
            .catch(err => { alert(err) });
    }, [passenger.code]);

    //שמירת נסיעה נבחרת
    const handleDriveClick = (drive) => {
        setSelectedDrive(drive);
    };


    const closeMyDrives = () => {
        setShowMyDrives(false);
        setSelectedDrive(null);
    };

    const logOut = () => {
        localStorage.removeItem('currentPassenger');
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
    //המפה ברקע
    useEffect(() => {
        setKey("AIzaSyBfgzVdk3QnZZBbyu1tguleiguMLT1SQCk")
        Geolocation.getCurrentPosition((pos) => {
            const crd = pos.coords;
            setPosition({
                lat: crd.latitude,
                lng: crd.longitude,
            });
            geocode(RequestType.LATLNG, `${crd.latitude},${crd.longitude}`)
                .then(({ results }) => {
                    const address = results[0].formatted_address;
                    setNewDrive(prevDrive =>
                    ({
                        ...prevDrive,
                        driveSource: address
                    })
                    )
                })
                .catch(console.error);
        })
    }, []);

    const mapContainerStyle = {
        width: "100%",
        height: "100%",
    }

    const mapRef = useRef(null);
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries,
    });


    const options = {
        disableDefaultUI: true,
        zoomControl: true,
        initialRegion: { position },
        showsUserLocation: true,
    }

    const handleBlur = (event) => {
        const address = event.target.value.trim(); // קידום שליחה ובסוף שלא
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

    //ציור המסלול על המפה
    const [arrivalTime, setArrivalTime] = useState(null)
    const directionsCallback = (response) => {
        if (response !== null && response.status === 'OK') {
            setDirections(response);
            setDuration(response.routes[0].legs[0].duration.text.match(/\d+/g));
            setNewDrive((prev) => ({ ...prev, duration: duration }))
        } else {
            console.error('שגיאה בקבלת הנתונים:', response);
        }
    };

    //חישוב משך הנסיעה
    useEffect(() => {
        if (newDrive.duration != null && newDrive.duration.length > 1) {
            const hours = newDrive.duration[0];
            const minutes = newDrive.duration[1];
            const durationString = `hours: ${hours}, minutes: ${minutes} `;
            setNewDrive((prev) => ({ ...prev, duration: durationString }))
        }
    }, [duration])



    if (loadError) return "Error loading maps"
    if (!isLoaded) return "Loading Maps"

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
                            <img src={`${imgUrl}/pictures/${passenger.profilPic}`} style={{ width: '90px', height: '90px', borderRadius: '50%' }} alt="Profile Pic" />
                            <p>{passenger.name}</p>
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

                {!showMyDrives && !isOpenUpdate &&
                    <div className='orderDrive' >
                        <div style={{ display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
                            <h2 >הזמנת נסיעה</h2>
                            <input
                                placeholder='נקודת התחלה'
                                name='driveSource'
                                value={newDrive.driveSource || ''}
                                onChange={handleInputChange}
                                onBlur={handleBlur} />
                            <input
                                placeholder='נקודת יעד'
                                name='driveDest'
                                value={newDrive.driveDest || ''}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                            />
                            <select className='selector' value={newDrive.num_of_pass || ''} onChange={handleSelectTaxiChange}>
                                <option value='' disabled hidden>גודל המונית</option>
                                <option value="5">5 מקומות</option>
                                <option value="7">7 מקומות</option>
                                <option value="10">10 מקומות</option>
                            </select>
                            <button onClick={orderDrive}>הזמן</button>

                            {duration && duration[1] != null && <p>משך הנסיעה: {`${duration[0]} שעות,ו ${duration[1]} דקות `} </p>}
                            {duration && duration[1] == null && <p>משך הנסיעה: {`${duration[0]} דקות `} </p>}
                            {arrivalTime && <p>זמן ההגעה המשוער: {arrivalTime.getHours()}:{arrivalTime.getMinutes()}</p>}
                        </div></div>}

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
                                <li key={index} onClick={() => handleDriveClick(drive)} style={{ cursor: 'pointer', padding: '10px', borderBottom: '1px solid #ccc' }}>
                                    <p><strong>מאיפה:</strong> {drive.source}</p>
                                    <p><strong>לאן:</strong> {drive.destination}</p>
                                    <p><strong>תאריך:</strong> {drive.date_time}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                }

                {isOpenUpdate &&
                    <div className='updateDetails'>
                        <div className='subUpdate'>
                            <button className='closeUpdate' onClick={() => setIsOpenUpdate(false)}>X</button>
                            <h2 style={{ fontSize: '20px', textAlign: 'center' }}>עריכת פרטים אישיים</h2>
                            <div className='Ainputs'>
                                <div className='texts'>
                                    <p>שם</p>
                                    {/* <p>סיסמה</p> */}
                                    <p>כתובת</p>
                                    <p>טלפון</p>
                                </div>
                                <div className='subInputs'>
                                    <input type="text" value={passenger.name || ''} placeholder='username' onChange={handleChange} name='name' />
                                    {/* <input type="password" value={passenger.password || ''} placeholder='password' onChange={handleChange} name='password' /> */}
                                    <input type="text" value={passenger.address || ''} placeholder='address' onChange={handleChange} name='address' />
                                    <input type="text" value={passenger.phone || ''} placeholder='phone' onChange={handleChange} name='phone' />
                                </div>

                            </div>
                            <div>
                                <button className='btn' onClick={updatePass}>ערוך</button>
                            </div>
                        </div>
                    </div>
                }
            </div>

            <GoogleMap className="map"
                mapContainerStyle={mapContainerStyle}
                zoom={10}
                center={position}
                options={options}
                onClick={changeDest}
                onLoad={(map) => {
                    mapRef.current = map;
                }} >
                <MarkerF key={Math.random()}
                    position={position} />
                {destination != null && (<DirectionsService
                    options={{
                        origin: newDrive.driveSource,
                        destination: destination,
                        travelMode: 'DRIVING',
                    }}
                    callback={directionsCallback} />)}
                {directions && (
                    <DirectionsRenderer
                        options={{
                            directions: directions,
                        }} />)}
            </GoogleMap>

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