import React, { useState } from 'react';
import { FaWater, FaTools, FaCheckCircle, FaTimesCircle, FaDollarSign, FaMicrochip, FaBars, FaBell } from 'react-icons/fa';

const sections = [
  { id: 'overview', label: 'Overview', icon: <FaBars /> },
  { id: 'leak-monitoring', label: 'Leak Monitoring', icon: <FaWater /> },
  { id: 'service-requests', label: 'Service Requests', icon: <FaTools /> },
  { id: 'plumber-verification', label: 'Plumber Verification', icon: <FaCheckCircle /> },
  { id: 'payment-processing', label: 'Payments', icon: <FaDollarSign /> },
  { id: 'iot-device-management', label: 'IoT Devices', icon: <FaMicrochip /> },
];

// Sample Data
const leakAlertsData = [
  { id: 1, location: 'Building A - Floor 2', severity: 'High', time: '2025-08-30 14:22', acknowledged: false },
  { id: 2, location: 'Building B - Basement', severity: 'Medium', time: '2025-08-29 10:41', acknowledged: true },
  { id: 3, location: 'Building C - Floor 10', severity: 'Critical', time: '2025-08-30 06:15', acknowledged: false },
];

const serviceRequestsData = [
  { id: 101, plumber: 'Mike’s Plumbing Pro', service: 'Leak Repair', location: 'Building A', status: 'Pending' },
  { id: 102, plumber: 'Sarah Johnson', service: 'Pipe Installation', location: 'Building C', status: 'In Progress' },
  { id: 103, plumber: 'Emergency Plumbers Inc', service: 'Emergency Service', location: 'Building B', status: 'Completed' },
];

const plumberVerificationsData = [
  { id: 201, name: 'John Doe', license: 'TX12345', status: 'Pending' },
  { id: 202, name: 'Anna Smith', license: 'CA67890', status: 'Approved' },
];

const paymentTransactionsData = [
  { id: 301, customer: 'Company X', amount: 350, date: '2025-08-20', status: 'Paid' },
  { id: 302, customer: 'Company Y', amount: 220, date: '2025-08-25', status: 'Pending' },
];

const iotDevicesData = [
  { id: 401, name: 'Sensor A', status: true },
  { id: 402, name: 'Sensor B', status: false },
  { id: 403, name: 'Sensor C', status: true },
];

const Sidebar = ({ activeSection, setActiveSection }) => (
  <nav className="w-full bg-white shadow-lg p-6 flex flex-row items-center">
    <ul className="flex flex-row space-x-4 flex-grow">
      {sections.map(({ id, label, icon }) => (
        <li key={id}>
          <button
            onClick={() => setActiveSection(id)}
            className={`flex items-center space-x-3 px-4 py-2 rounded ${
              activeSection === id
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-blue-100'
            }`}
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </button>
        </li>
      ))}
    </ul>
  </nav>
);


const Overview = () => (
  <div>
    <h2 className="text-2xl font-bold mb-6">Overview</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-blue-600 text-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Active Leak Alerts</h3>
        <div className="text-4xl font-bold flex items-center">
          3 <FaBell className="ml-2" />
        </div>
      </div>
      <div className="bg-green-600 text-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Pending Service Requests</h3>
        <div className="text-4xl font-bold">5</div>
      </div>
      <div className="bg-purple-600 text-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Unverified Plumbers</h3>
        <div className="text-4xl font-bold">2</div>
      </div>
    </div>
  </div>
);

const LeakMonitoring = () => {
  const [alerts, setAlerts] = useState(leakAlertsData);

  const acknowledgeAlert = (id) => {
    setAlerts(alerts.map(alert => alert.id === id ? { ...alert, acknowledged: true } : alert));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Leak Monitoring</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-blue-100">
            <th className="border border-gray-300 px-4 py-2">Location</th>
            <th className="border border-gray-300 px-4 py-2">Severity</th>
            <th className="border border-gray-300 px-4 py-2">Time</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
            <th className="border border-gray-300 px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map(({ id, location, severity, time, acknowledged }) => (
            <tr key={id} className={acknowledged ? 'bg-gray-100' : ''}>
              <td className="border border-gray-300 px-4 py-2">{location}</td>
              <td className="border border-gray-300 px-4 py-2 font-semibold">{severity}</td>
              <td className="border border-gray-300 px-4 py-2">{time}</td>
              <td className="border border-gray-300 px-4 py-2 text-center">
                {acknowledged ? <span className="text-green-600 font-semibold">Acknowledged</span> : <span className="text-red-600 font-semibold">New</span>}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-center">
                {!acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Acknowledge
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ServiceRequests = () => {
  const [requests, setRequests] = useState(serviceRequestsData);

  const updateStatus = (id, newStatus) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Service Requests</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-green-100">
            <th className="border border-gray-300 px-4 py-2">Request ID</th>
            <th className="border border-gray-300 px-4 py-2">Plumber</th>
            <th className="border border-gray-300 px-4 py-2">Service</th>
            <th className="border border-gray-300 px-4 py-2">Location</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
            <th className="border border-gray-300 px-4 py-2">Update Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(({ id, plumber, service, location, status }) => (
            <tr key={id}>
              <td className="border border-gray-300 px-4 py-2">{id}</td>
              <td className="border border-gray-300 px-4 py-2">{plumber}</td>
              <td className="border border-gray-300 px-4 py-2">{service}</td>
              <td className="border border-gray-300 px-4 py-2">{location}</td>
              <td className="border border-gray-300 px-4 py-2">{status}</td>
              <td className="border border-gray-300 px-4 py-2">
                <select
                  value={status}
                  onChange={(e) => updateStatus(id, e.target.value)}
                  className="border border-gray-300 rounded p-1 w-full"
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PlumberVerification = () => {
  const [requests, setRequests] = useState(plumberVerificationsData);

  const updateVerificationStatus = (id, newStatus) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Plumber Verification</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-purple-100">
            <th className="border border-gray-300 px-4 py-2">Plumber Name</th>
            <th className="border border-gray-300 px-4 py-2">License</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
            <th className="border border-gray-300 px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(({ id, name, license, status }) => (
            <tr key={id}>
              <td className="border border-gray-300 px-4 py-2">{name}</td>
              <td className="border border-gray-300 px-4 py-2">{license}</td>
              <td className="border border-gray-300 px-4 py-2">{status}</td>
              <td className="border border-gray-300 px-4 py-2 space-x-2">
                {status === 'Pending' && (
                  <>
                    <button
                      onClick={() => updateVerificationStatus(id, 'Approved')}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateVerificationStatus(id, 'Rejected')}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PaymentProcessing = () => {
  const [transactions, setTransactions] = useState(paymentTransactionsData);
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = filterStatus === 'All' ? transactions : transactions.filter(t => t.status === filterStatus);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Payment Processing</h2>
      <div className="mb-4">
        <label className="mr-4 font-semibold">Filter by Status:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded p-1"
        >
          <option>All</option>
          <option>Paid</option>
          <option>Pending</option>
        </select>
      </div>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-yellow-100">
            <th className="border border-gray-300 px-4 py-2">Transaction ID</th>
            <th className="border border-gray-300 px-4 py-2">Customer</th>
            <th className="border border-gray-300 px-4 py-2">Amount</th>
            <th className="border border-gray-300 px-4 py-2">Date</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(({ id, customer, amount, date, status }) => (
            <tr key={id}>
              <td className="border border-gray-300 px-4 py-2">{id}</td>
              <td className="border border-gray-300 px-4 py-2">{customer}</td>
              <td className="border border-gray-300 px-4 py-2">${amount}</td>
              <td className="border border-gray-300 px-4 py-2">{date}</td>
              <td className="border border-gray-300 px-4 py-2">{status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const IoTDeviceManagement = () => {
  const [devices, setDevices] = useState(iotDevicesData);

  const toggleDevice = (id) => {
    setDevices(devices.map(d => d.id === id ? { ...d, status: !d.status } : d));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">IoT Device Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {devices.map(({ id, name, status }) => (
          <div key={id} className="bg-gray-100 p-4 rounded shadow flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{name}</h3>
              <p className={`font-medium ${status ? 'text-green-600' : 'text-red-600'}`}>
                {status ? 'Online' : 'Offline'}
              </p>
            </div>
            <button
              onClick={() => toggleDevice(id)}
              className={`px-4 py-2 rounded ${
                status ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {status ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const contentComponents = {
  overview: Overview,
  'leak-monitoring': LeakMonitoring,
  'service-requests': ServiceRequests,
  'plumber-verification': PlumberVerification,
  'payment-processing': PaymentProcessing,
  'iot-device-management': IoTDeviceManagement,
};

const StaffDashboard = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const ActiveComponent = contentComponents[activeSection];

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <main className="flex-grow p-8 bg-white rounded m-6 shadow-lg overflow-auto max-h-screen">
        <ActiveComponent />
      </main>
    </div>
  );
};

export default StaffDashboard;
