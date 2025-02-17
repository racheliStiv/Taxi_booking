
import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { imgUrl } from '../config'
import axios from 'axios';
import '../css/Driver.css'
const libraries = ["places"];
const apiKey = import.meta.env.VITE_API_KEY;

const center = {
    lat: 31.7683,
    lng: 35.2137,
};

const Driver = () => {
    const [showTripList, setShowTripList] = useState(true);
    const [isOpenMenu, setIsOpenMenu] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [driverDetails, setDriverDetails] = useState(JSON.parse(localStorage.getItem('currentUser')));
    const [isvacant, setIsVacant] = useState(driverDetails.vacant == 1 ? true : false);
    const [verifyDel, setVerifyDel] = useState(false);
    const [relevantDrives, setRelevantDrives] = useState([]);
    const [location, setLocation] = useState(center);
    const [selectedDrive, setSelectedDrive] = useState(isvacant ? null : JSON.parse(localStorage.getItem('currentDrive')));
    const [directions, setDirections] = useState(null);
    // const mapContainerStyle = showTripList ? { height: '50%', width: '50%' } : { height: '50%', width: '50%' };
    const navigate = useNavigate();

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries,
    });

    //שליפת נסיעות רלוונטיות
    useEffect(() => {
        fetchRelevantDrives(); // קריאה ראשונית לפונקציה
        const intervalId = setInterval(fetchRelevantDrives, 100); // הגדרת אינטרוול ל-20 שניות
        return () => clearInterval(intervalId); // ניקוי האינטרוול כשנטענת הקומפוננטה
    }, [driverDetails.code]);

    // Function to fetch relevant drives
    const fetchRelevantDrives = () => {
        axios.get(`http://localhost:8080/drives/relevant-drives/${driverDetails.code}/${location.lat},${location.lng}`)
            .then(response => {
                const relevantDrives = response.data;
                setRelevantDrives(relevantDrives);
            })
            .catch(error => console.error('Error fetching relevant drives:', error));
    };

    useEffect(() => {
        fetchRelevantDrives(); // קריאה ראשונית לפונקציה
    }, [driverDetails.code]); // תלות בקוד הנהג והמיקום


    useEffect(() => {
        // Get current location using Geolocation API
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setLocation({
                    lat: latitude,
                    lng: longitude,
                });
            }, (error) => {
                console.error('Error getting current position:', error);
            });
        } else {
            console.error('Geolocation is not supported');
        }

        if (isLoaded && selectedDrive && !isvacant) {
            displaySelectedDriveOnMap(selectedDrive);
        }
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
        axios.put(`http://localhost:8080/drivers/${driverDetails.code}`, driverDetails)
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

    //מחיקת נסיעה
    const deleteDriver = () => {
        axios.delete(`http://localhost:8080/drivers/${driverDetails.code}`)
            .then(() => {
                localStorage.removeItem('currentDriver');
                navigate('/login');
            })
            .catch(error => console.error("Error deleting driver:", error));
    };


    const logOut = () => {
        localStorage.removeItem('currentDriver');
        navigate('/login');
    };


    const selectDrive = (drive) => {
        setSelectedDrive(drive);
        setShowTripList(true); // שמור על הרשימה מוצגת
    };

    //הנהג בחר נסיעה
    const toggleVacantStatus = () => {
        if (selectedDrive) {
            selectedDrive.vacant = true;
            selectedDrive.driver_code = driverDetails.code
            selectedDrive.date_time = new Date();
            setIsVacant(false);
            // Update drive's vacant status on the server
            axios.put(`http://localhost:8080/drives/${selectedDrive.code}`, selectedDrive)
                .then(() => {
                    localStorage.setItem('currentDrive', JSON.stringify(selectedDrive));
                })
                .catch(error => console.error("Error updating drive vacant status:", error));
            driverDetails.vacant = false;
            axios.put(`http://localhost:8080/drivers/${driverDetails.code}`, driverDetails)
                .then(() => {
                    setDriverDetails(prevDriver => ({
                        ...prevDriver,
                        vacant: false
                    }));
                    // Save updated driverDetails to localStorage
                    localStorage.setItem('currentDriver', JSON.stringify(driverDetails));
                    setShowTripList(false)
                })
                .catch(error => console.error("Error updating driver vacant status:", error));
        }
    };


    const displaySelectedDriveOnMap = (drive) => {
        const geocoder = new window.google.maps.Geocoder();

        const geocodeAddress = (address) => {
            return new Promise((resolve, reject) => {
                geocoder.geocode({ address: address }, (results, status) => {
                    if (status === window.google.maps.GeocoderStatus.OK) {
                        const location = results[0].geometry.location;
                        resolve(location);
                    } else {
                        reject(`Geocode was not successful for the following reason: ${status}`);
                    }
                });
            });
        };

        const isCoordinates = (input) => {
            return Array.isArray(input) && input.length === 2 && typeof input[0] === 'number' && typeof input[1] === 'number';
        };

        const getGeocodePromise = (input) => {
            if (isCoordinates(input)) {
                return Promise.resolve(new window.google.maps.LatLng(input[0], input[1]));
            } else {
                return geocodeAddress(input);
            }
        };

        Promise.all([
            getGeocodePromise(drive.source),
            getGeocodePromise(drive.destination)
        ])
            .then(([origin, destination]) => {
                const directionsService = new window.google.maps.DirectionsService();
                directionsService.route(
                    {
                        origin: origin,
                        destination: destination,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    },
                    (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                            setDirections(result);
                        } else {
                            console.error(`Error fetching directions for drive: ${drive.code}`);
                        }
                    }
                );
            })
            .catch(error => console.error(`Error geocoding addresses: ${error}`));
    };

    //הנהג סיים נסיעה
    const finishDrive = () => {
        if (selectedDrive) {
            driverDetails.vacant = true;
            axios.put(`http://localhost:8080/drivers/${driverDetails.code}`, driverDetails)
                .then(() => {
                    setDriverDetails(prevDriver => ({
                        ...prevDriver,
                        vacant: true
                    }));
                    localStorage.setItem('currentDriver', JSON.stringify(driverDetails));
                    fetchRelevantDrives();
                    setIsVacant(true);
                    setSelectedDrive(null);
                    setShowTripList(true);
                })
                .catch(error => console.error("Error updating driver vacant status:", error));
        }
    };

    if (loadError) return 'Error loading maps';
    if (!isLoaded) return 'Loading maps';

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
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => setIsEditMode(true)}>עדכון הפרטים</button>
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => setVerifyDel(true)} >מחיקת נהג</button>
                            <button style={{ position: 'sticky', marginTop: "3%", width: '50%', color: 'black', fontWeight: 'bold', fontSize: '18px', zIndex: '100' }} onClick={() => logOut()}>logout</button>

                        </div>
                    </div>
                }
            </div>

            {showTripList && isvacant &&
                <div className='driveList' style={{ direction: 'rtl' }}>
                    <h3>רשימת הנסיעות הרלוונטיות</h3>
                    <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
                        {relevantDrives.map((drive, index) => (
                            <li key={index}>
                                <p>מוצא: {drive.source}</p>
                                <p>יעד: {drive.destination}</p>

                                {selectedDrive && selectedDrive.code == drive.code ? (
                                    <>
                                        <p>מספר מקומות ברכב:  {drive.num_of_pass}</p>
                                        <p>סטטוס: {drive.vacant ? 'לא פנוי' : ' פנוי'}</p>
                                        <button onClick={toggleVacantStatus}>בחר נסיעה זו</button>
                                        <button onClick={() => selectDrive(null)}>X</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => selectDrive(drive)}>הצג עוד</button>
                                        <button onClick={() => selectDrive(null)}>X</button>

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
                                </div>
                                <div className='subInputs'>
                                    <input type="text" placeholder='שם' name='name' value={driverDetails.name} onChange={handleEditChange} required />
                                    <input type="text" placeholder='מספר מקומות ברכב' name='num_of_places' value={driverDetails.num_of_places} onChange={handleEditChange} />
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

            {selectedDrive && !isvacant && (
                <>

                    <div style={{ marginTop: '20px', direction: 'rtl' }}>
                        <h3>פרטי הנסיעה שנבחרה</h3>
                        <p>מוצא: {selectedDrive.source}</p>
                        <p>יעד: {selectedDrive.destination}</p>
                        <p>תאריך: {new Date(selectedDrive.date_time).toLocaleDateString()}</p>
                        <p>מספר מקומות ברכב: {selectedDrive.num_of_pass}</p>
                        <button onClick={finishDrive}>סיום נסיעה</button>
                    </div>
                    {/* <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        zoom={15}
                        center={location}
                        options={{ disableDefaultUI: true }}
                        onLoad={displaySelectedDriveOnMap(selectedDrive)}
                    >
                        {relevantDrives.map((drive, index) => (
                            <Marker
                                key={index}
                                position={{
                                    lat: parseFloat(drive.originLatitude),
                                    lng: parseFloat(drive.originLongitude)
                                }}
                                onClick={() => selectDrive(drive)}
                            />
                        ))}
                        {selectedDrive && !isvacant && (
                            <DirectionsRenderer
                                options={{ suppressMarkers: true }}
                                directions={directions}
                            />
                        )}
                    </GoogleMap> */}
                </>
            )}
        </div>
    );
};

export default Driver;

