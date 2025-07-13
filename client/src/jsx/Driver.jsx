import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { imgUrl } from '../config'
import axios from 'axios';

import '../css/Driver.css'
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const center = {
    lat: 31.7683,
    lng: 35.2137,
};

const Driver = ({ socket }) => {
    const loc = useLocation();
    const MySwal = withReactContent(Swal);
    const [isOpenMenu, setIsOpenMenu] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [driverDetails, setDriverDetails] = useState(loc.state.user);
    const [verifyDel, setVerifyDel] = useState(false);
    const [relevantDrives, setRelevantDrives] = useState([]);
    const [location, setLocation] = useState(center);
    const [selectedDrive, setSelectedDrive] = useState(null);
    const navigate = useNavigate();


    //שליפת נסיעות רלוונטיות
    useEffect(() => {
        fetchRelevantDrives(); // קריאה ראשונית לפונקציה
        const intervalId = setInterval(fetchRelevantDrives, 100); // הגדרת אינטרוול ל-20 שניות
        return () => clearInterval(intervalId); // ניקוי האינטרוול כשנטענת הקומפוננטה
    }, [driverDetails.code]);


    const fetchRelevantDrives = () => {
        axios.get(`http://localhost:8080/drives/relevant-drives/${driverDetails.code}/${location.lat},${location.lng}`)
            .then(response => {
                const relevantDrives = response.data;
                setRelevantDrives(relevantDrives);
            })
            .catch(error => console.error('Error fetching relevant drives:', error));
    };

    //שליפת נסיעה נוכחית
    useEffect(() => {
        axios.get(`http://localhost:8080/drives/current-drive/${driverDetails.code}`)
            .then(response => {
                const currentDrive = response.data;
                console.log(driverDetails);

                if (currentDrive) {
                    setSelectedDrive(currentDrive);
                    showDriveDetails(currentDrive);
                }
            })
            .catch(error => console.error('Error fetching current drive:', error));
    }, []);


    //קליטת העריכה של אינפוט
    const handleEditChange = (event) => {
        const { name, value } = event.target;
        setDriverDetails((prevDetails) => ({
            ...prevDetails,
            [name]: value
        }));
    };

    //עדכון פרטי נהג
    const handleUpdateDriver = () => {
        axios.putDriver(`http://localhost:8080/drivers/${driverDetails.code}`, driverDetails)
            .then(response => {
                localStorage.setItem('currentDriver', JSON.stringify(driverDetails));
                alert('פרטי הנהג עודכנו בהצלחה');
                setIsEditMode(false);
            })
            .catch(error => {
                console.error('Error updating driver:', error);
                alert('שגיאה בעדכון פרטי הנהג');
            });
    };

    //מחיקת נהג
    const deleteDriver = () => {
        axios.delete(`http://localhost:8080/drivers/${driverDetails.code}`)
            .then(() => {
                localStorage.removeItem('current_driver');
                navigate('/login');
            })
            .catch(error => console.error("Error deleting driver:", error));
    };

    //התנתקות
    const logOut = () => {
        navigate('/login');
    };


    useEffect(() => {
        if (socket && driverDetails?.code) {
            socket.emit('driverConnected', { code: driverDetails.code });
        }
    }, [socket, driverDetails]);


    //הנהג בחר נסיעה
    const toggleVacantStatus = () => {
        console.log(driverDetails);

        if (driverDetails.vacant == true) {
            driverDetails.vacant = false;
            selectedDrive.driver_code = driverDetails.code;
            selectedDrive.date_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
            selectedDrive.vacant = false;
            fetchRelevantDrives()

            axios.put(`http://localhost:8080/drives/${selectedDrive.code}`, selectedDrive)
                .then(() => {
                    socket.emit("driverStartedDrive", {
                        passengerCode: selectedDrive.pass_code,
                        driverName: driverDetails.name,
                        origin: selectedDrive.source,
                        destination: selectedDrive.destination
                    });
                })
                .catch(error => console.error("Error updating drive vacant status:", error));

            axios.put(`http://localhost:8080/drivers/${driverDetails.code}`, driverDetails)
                .then(() => {
                    setDriverDetails(prevDriver => ({
                        ...prevDriver,
                        vacant: false

                    }));
                    showDriveDetails()
                })
                .catch(error => console.error("Error updating driver vacant status:", error));
        } else {
            MySwal.fire({
                title: '🚗 סיום נסיעה',
                text: 'הנך בנסיעה כרגע, האם אתה בטוח שברצונך לסיים את הנסיעה ?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'כן, סיים נסיעה',
                cancelButtonText: 'לא, ביטול',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
            }).then((result) => {
                if (result.isConfirmed) {
                    finishDrive();
                }
            });
        }

    };

    //הנהג סיים נסיעה
    const finishDrive = () => {
        if (selectedDrive) {
            //עדכון כי הנהג פנוי
            driverDetails.vacant = true;
            axios.put(`http://localhost:8080/drivers/${driverDetails.code}`, driverDetails)
                .then(() => {
                    setDriverDetails(prevDriver => ({
                        ...prevDriver,
                        vacant: true
                    }));
                })
                .catch(error => console.error("Error updating driver vacant status:", error));
            //עדכון כי הניסעה בוצעה
            selectedDrive.done = true;
            axios.put(`http://localhost:8080/drives/${selectedDrive.code}`, selectedDrive)
                .then(() => {
                    //הקפצת הודעה לנוסע כי הנהג סיים את הנסיעה
                    socket.emit("driverFinishedDrive", {
                        code: selectedDrive.pass_code,
                        driver: driverDetails.name,
                        origin: selectedDrive.source,
                        destination: selectedDrive.destination
                    });
                    setSelectedDrive(null)
                })
                .catch(error => console.error("Error updating driver vacant status:", error));
            MySwal.fire({
                title: 'נסיעה הסתיימה',
                text: 'הנסיעה שלך הסתיימה בהצלחה.',
                icon: 'success',
                confirmButtonText: 'אוקי'
            });

        }
    };

    //פרטי הנסיעה הנוכחית
    const showDriveDetails = async (currentDrive) => {
        if (currentDrive == null && selectedDrive != null) {
            currentDrive = selectedDrive;
            MySwal.fire({
                title: '🚗 פרטי הנסיעה הנוכחית',
                html: `
      <div dir="rtl" style="text-align: right; font-size: 16px;">
        <p><strong>מוצא:</strong> ${currentDrive?.source}</p>
        <p><strong>יעד:</strong> ${currentDrive?.destination}</p>
        <p><strong>תאריך:</strong> ${new Date(currentDrive?.date_time).toLocaleDateString()}</p>
        <p><strong>מספר מקומות ברכב:</strong> ${currentDrive?.num_of_pass}</p>
      </div>
    `,
                confirmButtonText: 'סיום נסיעה',
                showCancelButton: true,
                cancelButtonText: 'ביטול',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                customClass: {
                    popup: 'swal-wide'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    finishDrive(); // קריאה לפונקציית סיום נסיעה
                }
            });
        }
        else {
            Swal.fire({
                title: 'אינך בנסיעה כרגע',
                text: 'אין לך נסיעה נוכחית. אנא בחר נסיעה מהרשימה. ',
                icon: 'info',
                confirmButtonText: 'אוקי',
            });
        }
    };


    return (
        <div className="mainD">
            <div className="sidebar">
                <button className="menuBTN" onClick={() => setIsOpenMenu(!isOpenMenu)}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                </button>
                {isOpenMenu &&
                    <div className='menu'>
                        <div style={{ fontSize: "25px", position: 'fixed', right: '40%', top: '7%', textAlign: 'center', margin: '0 auto' }}>
                            <img src={`${imgUrl}/pictures/${driverDetails.profilPic}`} style={{ width: '90px', height: '90px', borderRadius: '50%', marginLeft: '10px' }} alt="Profile Pic" />
                            <p>{driverDetails.name}</p>
                        </div>
                        <div style={{ flexDirection: 'column', display: 'flex', alignItems: 'center', marginTop: '70%' }}>
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => showDriveDetails()}>פרטי נסיעה נוכחית</button>
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => setIsEditMode(true)}>עדכון הפרטים</button>
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => setVerifyDel(true)} >מחיקת נהג</button>
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => logOut()}>logout</button>

                        </div>
                    </div>
                }
            </div>

            {
                <div className='driveList' style={{ direction: 'rtl' }}>
                    <h3>רשימת הנסיעות הרלוונטיות</h3>
                    <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
                        {relevantDrives.map((drive, index) => (
                            <li key={index}>
                                <p>מוצא: {drive.source}</p>
                                <p>יעד: {drive.destination}</p>

                                {selectedDrive?.code === drive.code ? (
                                    <>
                                        <p>מספר מקומות ברכב:  {drive.num_of_pass}</p>
                                        <p>סטטוס: {drive.vacant ? 'לא פנוי' : ' פנוי'}</p>
                                        <button onClick={toggleVacantStatus}>בחר נסיעה זו</button>
                                        <button onClick={() => setSelectedDrive(null)}>X</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setSelectedDrive(drive)}>הצג עוד</button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                    {relevantDrives.length == 0 && <p>אין נסיעות מתאימות</p>}
                </div>
            }

            {isEditMode && (
                <>
                    <div className='updateDetailsD'>
                        <div className='subUpdateD'>
                            <button className='closeUpdate' onClick={() => setIsEditMode(false)}>X</button>
                            <h2 style={{ fontSize: '20px', textAlign: 'center' }}>עריכת פרטים אישיים</h2>
                            <div className='Ainputs'>
                                <div className='texts'>
                                    <p>שם</p>
                                    <p>מספר מקומות </p>
                                    <p>טלפון</p>
                                </div>
                                <div className='subInputs'>
                                    <input type="text" placeholder='שם' name='name' value={driverDetails.name} onChange={handleEditChange} required />
                                    <input type="text" placeholder='מספר מקומות ברכב' name='num_of_pass' value={driverDetails.num_of_places} onChange={handleEditChange} />
                                    <input type="text" placeholder='טלפון' name='phone' value={driverDetails.phone} onChange={handleEditChange} />
                                </div>

                            </div>
                            <div>
                                <button className='btn' onClick={handleUpdateDriver}>ערוך</button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {verifyDel && (
                <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '10px', border: '1px solid #ccc', marginTop: '20px' }}>
                    <h2>אישור מחיקת נהג</h2>
                    <p>האם למחוק את הנהג {driverDetails.name}?</p>
                    <button className='btn btn-danger' onClick={deleteDriver}>אישור</button>
                    <button className='btn btn-primary' onClick={() => setVerifyDel(false)}>ביטול</button>
                </div>
            )}

        </div>
    );
};

export default Driver;


// Get current location using Geolocation API
// useEffect(() => {
//     if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition((position) => {
//             const { latitude, longitude } = position.coords;
//             setLocation({
//                 lat: latitude,
//                 lng: longitude,
//             });
//         }, (error) => {
//             console.error('Error getting current position:', error);
//         });
//     } else {
//         console.error('Geolocation is not supported');
//     }

//     if (isLoaded && selectedDrive && !isvacant) {
//         displaySelectedDriveOnMap(selectedDrive);
//     }
// }, []);
