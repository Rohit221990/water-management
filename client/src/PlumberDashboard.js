import React, { useState } from 'react';
import { FaTasks, FaClipboardList, FaDollarSign, FaUser, FaComments, FaBars, FaCheck, FaTimes } from 'react-icons/fa';
import Earnings from './Earnings'; // Import the Earnings component

// Sidebar sections tailored for plumber
const sections = [
  { id: 'overview', label: 'Overview', icon: <FaBars /> },
  { id: 'job-requests', label: 'Job Requests', icon: <FaTasks /> },
  { id: 'job-management', label: 'Job Management', icon: <FaClipboardList /> },
  { id: 'earnings', label: 'Earnings', icon: <FaDollarSign /> },
  { id: 'profile', label: 'Profile', icon: <FaUser /> },
  { id: 'customer-communication', label: 'Customer Communication', icon: <FaComments /> },
];

// Sample Data
const jobRequestsData = [
  { id: 101, customer: 'Building A', service: 'Leak Repair', scheduled: '2025-08-31 10:00', status: 'Pending' },
  { id: 102, customer: 'Building C', service: 'Pipe Installation', scheduled: '2025-09-01 14:00', status: 'Pending' },
];

const jobManagementData = [
  { id: 201, customer: 'Building B', service: 'Emergency Service', scheduled: '2025-08-30 16:00', status: 'In Progress' },
  { id: 202, customer: 'Building A', service: 'Drain Cleaning', scheduled: '2025-08-29 11:00', status: 'Completed' },
];

const messagesData = [
  { id: 1, from: 'Customer - Building A', message: 'Please come ASAP.', date: '2025-08-30' },
  { id: 2, from: 'Customer - Building B', message: 'Thank you for completing the job.', date: '2025-08-29' },
];

const Sidebar = ({ activeSection, setActiveSection }) => (
  <nav className="w-full bg-white shadow-lg p-4 flex flex-row items-center">
    <ul className="flex flex-row space-x-4 flex-grow">
      {sections.map(({ id, label, icon }) => (
        <li key={id}>
          <button
            onClick={() => setActiveSection(id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded ${
              activeSection === id
                ? 'bg-green-600 text-white'
                : 'text-gray-700 hover:bg-green-100'
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
      <div className="bg-green-600 text-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Pending Jobs</h3>
        <div className="text-4xl font-bold">2</div>
      </div>
      <div className="bg-blue-600 text-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">In Progress</h3>
        <div className="text-4xl font-bold">1</div>
      </div>
      <div className="bg-purple-600 text-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Completed Jobs</h3>
        <div className="text-4xl font-bold">5</div>
      </div>
    </div>
  </div>
);

const JobRequests = () => {
  const [requests, setRequests] = useState(jobRequestsData);

  const respondToRequest = (id, accepted) => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: accepted ? 'Accepted' : 'Rejected' } : r));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Job Requests</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-green-100">
            <th className="border border-gray-300 px-4 py-2">Customer</th>
            <th className="border border-gray-300 px-4 py-2">Service</th>
            <th className="border border-gray-300 px-4 py-2">Scheduled Time</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
            <th className="border border-gray-300 px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(({ id, customer, service, scheduled, status }) => (
            <tr key={id}>
              <td className="border border-gray-300 px-4 py-2">{customer}</td>
              <td className="border border-gray-300 px-4 py-2">{service}</td>
              <td className="border border-gray-300 px-4 py-2">{scheduled}</td>
              <td className="border border-gray-300 px-4 py-2">{status}</td>
              <td className="border border-gray-300 px-4 py-2 space-x-2">
                {status === 'Pending' && (
                  <>
                    <button
                      onClick={() => respondToRequest(id, true)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Accept <FaCheck className="inline ml-1" />
                    </button>
                    <button
                      onClick={() => respondToRequest(id, false)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Reject <FaTimes className="inline ml-1" />
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

const JobManagement = () => {
  const [jobs, setJobs] = useState(jobManagementData);

  const updateStatus = (id, newStatus) => {
    setJobs(jobs.map(job => job.id === id ? { ...job, status: newStatus } : job));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Job Management</h2>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-blue-100">
            <th className="border border-gray-300 px-4 py-2">Customer</th>
            <th className="border border-gray-300 px-4 py-2">Service</th>
            <th className="border border-gray-300 px-4 py-2">Scheduled Time</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
            <th className="border border-gray-300 px-4 py-2">Update Status</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(({ id, customer, service, scheduled, status }) => (
            <tr key={id}>
              <td className="border border-gray-300 px-4 py-2">{customer}</td>
              <td className="border border-gray-300 px-4 py-2">{service}</td>
              <td className="border border-gray-300 px-4 py-2">{scheduled}</td>
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

const Earning = () => {
  // For brevity, not including charts here, but placeholders for chart integration (e.g. Chart.js, Recharts)
  return (
    <Earnings />
  );
};

const Profile = () => {
  const [profile, setProfile] = useState({
    name: 'John Plumber',
    phone: '+1 (555) 234-5678',
    email: 'john.plumber@example.com',
    bio: 'Experienced plumber with 10 years of service.',
  });

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = () => {
    setProfile(formData);
    setEditMode(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Profile Management</h2>
      {editMode ? (
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="w-full border rounded p-2"
              rows={4}
            />
          </div>
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save
          </button>
          <button
            onClick={() => setEditMode(false)}
            className="ml-4 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="max-w-md space-y-4">
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Phone:</strong> {profile.phone}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Bio:</strong> {profile.bio}</p>
          <button
            onClick={() => setEditMode(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
};

const CustomerCommunication = () => {
  const [messages, setMessages] = useState(messagesData);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (newMessage.trim() === '') return;
    const newMsg = {
      id: messages.length + 1,
      from: 'You',
      message: newMessage,
      date: new Date().toISOString().slice(0, 10),
    };
    setMessages([newMsg, ...messages]);
    setNewMessage('');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Customer Communication</h2>
      <div className="mb-4">
        <textarea
          rows={3}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full border rounded p-2 resize-none"
        />
        <button
          onClick={sendMessage}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
      <ul className="space-y-4 max-h-64 overflow-auto">
        {messages.map(({ id, from, message, date }) => (
          <li key={id} className="p-4 border rounded bg-gray-50">
            <p className="font-semibold">{from} <span className="text-gray-500 text-sm">({date})</span></p>
            <p>{message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

const contentComponents = {
  overview: Overview,
  'job-requests': JobRequests,
  'job-management': JobManagement,
  earnings: Earning,
  profile: Profile,
  'customer-communication': CustomerCommunication,
};

const PlumberDashboard = () => {
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

export default PlumberDashboard;
