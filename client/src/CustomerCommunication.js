import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000'); // your Node.js backend URL

const CustomerCommunication = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = () => {
    if (input.trim() === '') return;

    const message = {
      from: 'plumber',
      text: input,
      timestamp: new Date(),
    };

    socket.emit('send_message', message);
    setMessages((prev) => [...prev, message]);
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Customer Communication</h2>
      <div className="border rounded p-4 max-h-72 overflow-y-auto mb-4 flex flex-col space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded ${msg.from === 'plumber' ? 'bg-green-200 self-end' : 'bg-gray-200 self-start'}`}>
            <p>{msg.text}</p>
            <small className="text-xs text-gray-600">{new Date(msg.timestamp).toLocaleTimeString()}</small>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow border rounded p-2"
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700">
          Send
        </button>
      </div>
    </div>
  );
};

export default CustomerCommunication;
