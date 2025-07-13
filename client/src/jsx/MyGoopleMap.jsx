import '../css/MyGoopleMap.css';
import { useState, useEffect, useRef } from "react";
import { geocode, RequestType, } from "react-geocode";
import { GoogleMap, MarkerF, useLoadScript, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
const libraries = ["places"];

export default function MyGoopleMap({ apiKey, duration, setDestination, source, destination, newDrive, setDirections, setDuration, setNewDrive, directions }) {
    const [position, setPosition] = useState({
        lat: 32.0853,
        lng: 34.7818
    });
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
        <div style={{ width: "100%", height: "100vh" }}>
            {/* מפה ברקע */}
            <GoogleMap className="map"
                mapContainerStyle={mapContainerStyle}
                zoom={10}
                center={position}
                options={options}
                onClick={changeDest}
                onLoad={(map) => {
                    mapRef.current = map;
                }} >
                {!source && !destination && <MarkerF key={Math.random()}
                    position={position} />}
                {/* Marker for source */}
                {source && <MarkerF
                    position={source}
                    icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                        scaledSize: new window.google.maps.Size(50, 50),
                    }}
                    label="התחלה"
                />}
                {/* Marker for Destination */}
                {destination && <MarkerF
                    position={destination}
                    icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        scaledSize: new window.google.maps.Size(50, 50),
                    }}
                    label="יעד"
                />}
                {newDrive.driveDest && (<DirectionsService
                    options={{
                        origin: newDrive.driveSource,
                        destination: newDrive.driveDest,
                        travelMode: 'DRIVING',
                    }}
                    callback={directionsCallback} />)}
                {directions && (
                    <DirectionsRenderer
                        options={{
                            directions: directions,
                            suppressMarkers: true,
                            zoomControl: true,
                        }}
                        icon={null} />)}
            </GoogleMap>
        </div>
        // <APIProvider apiKey={apiKey}>
        //     <div style={{ width: "100%", height: "100vh" }}>
        //         <Map mapId={"d68837e82aeea5a854ddb298"}
        //             center={position}
        //             zoom={10}
        //             options={options}
        //             onLoad={(map) => {
        //                 mapRef.current = map;
        //             }}
        //         />
        //         {!source && !destination && <AdvancedMarker key={Math.random()}
        //             position={position} />}
        //         {/* Marker for source */}
        //         {source && <AdvancedMarker
        //             position={source}
        //             icon={{
        //                 url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        //                 scaledSize: new window.google.maps.Size(50, 50),
        //             }}
        //             label="התחלה"
        //         />}
        //         {/* Marker for Destination */}
        //         {destination && <AdvancedMarker
        //             position={destination}
        //             icon={{
        //                 url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        //                 scaledSize: new window.google.maps.Size(50, 50),
        //             }}
        //             label="יעד"
        //         />}
        //         {/* {newDrive.driveDest && (<DirectionsService
        //             options={{
        //                 origin: newDrive.driveSource,
        //                 destination: newDrive.driveDest,
        //                 travelMode: 'DRIVING',
        //             }}
        //             callback={directionsCallback} />)} */}
        //         {directions && (
        //             <DirectionsRenderer
        //                 options={{
        //                     directions: directions,
        //                     suppressMarkers: true,
        //                     zoomControl: true,
        //                 }}
        //                 icon={null} />)}
        //     </div>
        // </APIProvider>
    );
}