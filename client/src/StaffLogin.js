import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

const StaffLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
    const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple validation example (replace with real auth)
    if (username === 'staff' && password === 'password') {
      setError('');
    //   onLoginSuccess('staff');
      navigate('/staff-dashboard'); // Redirect to staff dashboard
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded shadow mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">Staff Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Username</label>
          <input
            type="text"
            className="w-full border border-gray-300 p-2 rounded"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <input
            type="password"
            className="w-full border border-gray-300 p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default StaffLogin;
