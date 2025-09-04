import React, { useState } from 'react';

const LoginPage = ({ userType, onLoginSuccess }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic example validation - replace with real auth logic
    if (
      (userType === 'staff' && usernameOrEmail === 'staff' && password === 'password') ||
      (userType === 'plumber' && usernameOrEmail === 'plumber@example.com' && password === 'password')
    ) {
      setError('');
      onLoginSuccess(userType);
    } else {
      setError('Invalid username/email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">{userType === 'staff' ? 'Staff Login' : 'Plumber Login'}</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="usernameEmail" className="block text-gray-700 mb-2 font-medium">
              {userType === 'staff' ? 'Username' : 'Email'}
            </label>
            <input
              id="usernameEmail"
              type="text"
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              autoFocus
              placeholder={userType === 'staff' ? 'staff' : 'plumber@example.com'}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 mb-2 font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="password"
            />
          </div>

          {error && <p className="text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            className={`w-full py-3 rounded text-white ${userType === 'staff' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
