import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  FaTint,
  FaExclamationTriangle,
  FaPlay,
  FaSatelliteDish,
  FaMapMarkerAlt,
  FaCreditCard,
  FaSearch,
  FaLocationArrow,
  FaUsers,
  FaClipboardList,
  FaPhone,
  FaStar,
} from "react-icons/fa";

// Fix leaflet icon issues with React
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";
import "./index.css";
import { useNavigate } from "react-router-dom";

let DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: iconShadowUrl,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  iconSize: [25, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 13, { animate: true });
    }
  }, [position, map]);

  return null;
}

const plumbersMock = [
  {
    id: 1,
    name: "Mike's Plumbing Pro",
    businessName: "Expert Plumbing Solutions",
    rating: 4.8,
    completedJobs: 147,
    distance: "0.8 km",
    duration: "12 mins",
    hourlyRate: 85,
    services: ["leak_repair", "emergency_service"],
    phone: "+1 (555) 123-4567",
    availability: "Available now",
    profileImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    businessName: "Quick Fix Plumbing",
    rating: 4.9,
    completedJobs: 203,
    distance: "1.2 km",
    duration: "18 mins",
    hourlyRate: 92,
    services: ["leak_repair", "pipe_installation"],
    phone: "+1 (555) 987-6543",
    availability: "Available now",
    profileImage:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Emergency Plumbers Inc",
    businessName: "24/7 Emergency Service",
    rating: 4.7,
    completedJobs: 89,
    distance: "2.1 km",
    duration: "25 mins",
    hourlyRate: 110,
    services: ["emergency_service", "drain_cleaning"],
    phone: "+1 (555) 456-7890",
    availability: "Available now",
    profileImage:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  },
];

const LocationButtons = ({ setLocation }) => (
  <div className="flex space-x-2">
    <button
      onClick={() =>
        setLocation(28.5355, 77.391, "Noida, Uttar Pradesh, India")
      }
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      Noida, India
    </button>
    <button
      onClick={() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              // console.log("User location:", pos.coords.latitude, pos.coords.longitude);
              setLocation(
                () => pos.coords.latitude,
                pos.coords.longitude,
                "Current Location"
              );
            },
            () =>
              alert(
                "Unable to get your location. Please select a location manually."
              )
          );
        } else {
          alert("Geolocation is not supported by this browser.");
        }
      }}
      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
    >
      <FaLocationArrow />
    </button>
  </div>
);

const MapView = ({ lat, lng, plumbers, onRequestService }) => {
  const position = [lat, lng];

  return (
    <MapContainer
      center={position}
      zoom={13}
      className="h-80 rounded-lg border"
      style={{ width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>Your Location</Popup>
      </Marker>
      {plumbers.map((plumber) => {
        // Random nearby coords for demo
        const latOffset = (Math.random() - 0.5) * 0.02;
        const lngOffset = (Math.random() - 0.5) * 0.02;
        const plumberPos = [lat + latOffset, lng + lngOffset];
        return (
          <Marker key={plumber.id} position={plumberPos}>
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold">{plumber.name}</h3>
                <p className="text-sm">{plumber.businessName}</p>
                <p className="text-sm">
                  Rating: {plumber.rating}{" "}
                  <FaStar className="text-yellow-400 inline" />
                </p>
                <p className="text-sm">${plumber.hourlyRate}/hr</p>
                <button
                  onClick={() => onRequestService(plumber.id)}
                  className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Request Service
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
      <LocationUpdater position={position} />
    </MapContainer>
  );
};

const PlumberCard = ({ plumber, onCall, onRequest }) => {
  const stars = Math.floor(plumber.rating);
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition duration-300">
      <div className="flex items-start space-x-4">
        <img
          src={plumber.profileImage}
          alt={plumber.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-semibold">{plumber.name}</h4>
              <p className="text-gray-600">{plumber.businessName}</p>
              <div className="flex items-center mt-1">
                <div className="flex text-yellow-400">
                  {Array.from({ length: stars }, (_, i) => (
                    <FaStar key={i} />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {plumber.rating} ({plumber.completedJobs} jobs)
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-green-600">
                ${plumber.hourlyRate}/hr
              </div>
              <div className="text-sm text-gray-600">
                {plumber.distance} • {plumber.duration}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex space-x-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {plumber.availability}
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {plumber.services.length} services
              </span>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => onCall(plumber.phone)}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
              >
                <FaPhone className="inline mr-1" /> Call
              </button>
              <button
                onClick={() => onRequest(plumber.id)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Request Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const IoTModal = ({ visible, onClose, onViewServiceFlow }) => {
  const [waterLevel, setWaterLevel] = useState(30);

  useEffect(() => {
    if (visible) {
      const interval = setInterval(() => {
        setWaterLevel((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setWaterLevel(30);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg max-w-md w-full m-4">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <FaSatelliteDish className="mr-2 text-blue-500" /> IoT Sensor Alert
          Simulation
        </h3>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span>Water Level:</span>
            <span
              className={`font-semibold ${
                waterLevel >= 95 ? "text-red-600 font-bold" : ""
              }`}
            >
              {waterLevel}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Pressure:</span>
            <span className="font-semibold">42 PSI</span>
          </div>
          <div className="flex justify-between">
            <span>Flow Rate:</span>
            <span
              className={`font-semibold ${
                waterLevel >= 95 ? "text-red-600 font-bold" : ""
              }`}
            >
              180 L/min
            </span>
          </div>
          <div className="flex justify-between">
            <span>Temperature:</span>
            <span className="font-semibold">22°C</span>
          </div>
        </div>
        {waterLevel >= 95 && (
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
            <div className="flex items-center text-red-800">
              <FaExclamationTriangle className="mr-2" />
              <span className="font-semibold">Critical Alert Triggered</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Emergency service request auto-created
            </p>
          </div>
        )}
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Close
          </button>
          <button
            onClick={onViewServiceFlow}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            View Service Request
          </button>
        </div>
      </div>
    </div>
  );
};

const ServiceFlow = () => (
  <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
    <h3 className="text-2xl font-bold mb-6 flex items-center text-purple-500">
      <FaClipboardList className="mr-2" /> Service Request Flow
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
          <FaExclamationTriangle className="text-blue-600 text-xl" />
        </div>
        <h4 className="font-semibold">1. Leak Detected</h4>
        <p className="text-sm text-gray-600">IoT sensor or manual report</p>
      </div>
      <div className="text-center">
        <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
          <FaSearch className="text-green-600 text-xl" />
        </div>
        <h4 className="font-semibold">2. Find Plumbers</h4>
        <p className="text-sm text-gray-600">Location-based matching</p>
      </div>
      <div className="text-center">
        <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
          <FaUsers className="text-yellow-600 text-xl" />
        </div>
        <h4 className="font-semibold">3. Service Assigned</h4>
        <p className="text-sm text-gray-600">Plumber accepts request</p>
      </div>
      <div className="text-center">
        <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
          <FaCreditCard className="text-purple-600 text-xl" />
        </div>
        <h4 className="font-semibold">4. Payment & Verification</h4>
        <p className="text-sm text-gray-600">
          Work verified, payment processed
        </p>
      </div>
    </div>
  </div>
);

const WaterLeakDetection = () => {
  const [currentLat, setCurrentLat] = useState(28.5355);
  const [currentLng, setCurrentLng] = useState(77.391);
  const [currentLocation, setCurrentLocation] = useState(
    "Noida, Uttar Pradesh, India"
  );
  const [serviceType, setServiceType] = useState("leak_repair");
  const [urgencyLevel, setUrgencyLevel] = useState("normal");
  const [plumbers, setPlumbers] = useState([]);
  const [showIoTModal, setShowIoTModal] = useState(false);
  const [showServiceFlow, setShowServiceFlow] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const navigate = useNavigate();

  const setLocation = (lat, lng, locationName) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setCurrentLocation(locationName);
    setShowResults(false);
    setShowServiceFlow(false);
  };

  const findPlumbers = () => {
    // Filter plumbers based on service type
    let availablePlumbers = plumbersMock.filter((plumber) =>
      plumber.services.includes(serviceType)
    );

    // Sort plumbers
    availablePlumbers.sort((a, b) => {
      if (urgencyLevel === "emergency") {
        return parseFloat(a.distance) - parseFloat(b.distance); // Closest first
      } else {
        return b.rating - a.rating; // Highest rated first
      }
    });

    setPlumbers(availablePlumbers);
    setShowResults(true);
    setShowServiceFlow(true);
  };

  useEffect(() => {
    console.log(
      "Current location state:",
      currentLat,
      currentLng,
      currentLocation
    );
  }, [currentLat, currentLng, currentLocation]);

  const callPlumber = (phone) => {
    alert(`Calling ${phone}...`);
  };

  const requestService = (plumberId) => {
    const plumber = plumbersMock.find((p) => p.id === plumberId);
    if (plumber) {
      alert(
        `Service request sent to ${plumber.name}!\n\nEstimated arrival: ${plumber.duration}\nHourly rate: $${plumber.hourlyRate}\n\nThe plumber will contact you shortly to confirm details.`
      );
    }
  };

  const simulateLeakDetection = () => {
    setShowIoTModal(true);
  };

  const closeIoTModal = () => {
    setShowIoTModal(false);
  };

  const handleViewServiceFlow = () => {
    setShowIoTModal(false);
    setServiceType("emergency_service");
    setUrgencyLevel("emergency");
    findPlumbers();
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaTint className="text-2xl" />
            <h1 className="text-2xl font-bold">AquaFlow</h1>
            <span className="text-sm bg-blue-800 px-2 py-1 rounded">
              Complete Water Management
            </span>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate("/staff-login")}
              className="bg-blue-700 px-4 py-2 rounded hover:bg-blue-800"
            >
              Staff Login
            </button>
            <button
              onClick={() => navigate("/plumber-login")}
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              Plumber Login
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Revolutionizing Water Leak Detection & Service Management
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              From IoT sensor alerts to verified plumber services - AquaFlow
              handles it all
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-center">
              <div style={{ textAlign: "-webkit-center" }}>
                <FaSatelliteDish className="text-4xl text-blue-500 mb-4" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                IoT Sensor Integration
              </h3>
              <p className="text-gray-600">
                Real-time monitoring with automatic leak detection and alerts
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-center">
              <div style={{ textAlign: "-webkit-center" }}>
                <FaMapMarkerAlt className="text-4xl text-green-500 mb-4" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Smart Plumber Matching
              </h3>
              <p className="text-gray-600">
                AI-powered location-based matching with verified professionals
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-center">
              <div style={{ textAlign: "-webkit-center" }}>
                <FaCreditCard className="text-4xl text-purple-500 mb-4" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Integrated Payments
              </h3>
              <p className="text-gray-600">
                Secure payment processing with Stripe integration
              </p>
            </div>
          </div>
        </div>

        {/* Find Plumber Demo */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center">
            <FaSearch className="mr-2 text-blue-500" /> Find Plumber Nearby -
            Demo
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Location
                </label>
                <LocationButtons setLocation={setLocation} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  <option value="leak_repair">Leak Repair</option>
                  <option value="emergency_service">Emergency Service</option>
                  <option value="pipe_installation">Pipe Installation</option>
                  <option value="drain_cleaning">Drain Cleaning</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <button
                onClick={findPlumbers}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300"
              >
                <FaSearch className="mr-2" /> Find Nearby Plumbers
              </button>
            </div>
            <div>
              <MapView
                lat={currentLat}
                lng={currentLng}
                plumbers={plumbers}
                onRequestService={requestService}
              />
              <p className="text-sm text-gray-600 mt-2 text-center">
                Location: {currentLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Plumber Results */}
        {showResults && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold mb-6 flex items-center text-green-500">
              <FaUsers className="mr-2" /> Available Plumbers
            </h3>
            <div className="space-y-4">
              {plumbers.map((plumber) => (
                <PlumberCard
                  key={plumber.id}
                  plumber={plumber}
                  onCall={callPlumber}
                  onRequest={requestService}
                />
              ))}
            </div>
          </div>
        )}

        {/* Service Request Flow Demo */}
        {showServiceFlow && <ServiceFlow />}

        {/* IoT Modal */}
        <IoTModal
          visible={showIoTModal}
          onClose={closeIoTModal}
          onViewServiceFlow={handleViewServiceFlow}
        />
      </div>
    </div>
  );
};

export default WaterLeakDetection;
