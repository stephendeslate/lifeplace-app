// frontend/admin-crm/src/App.tsx
// Ultra simple test without any MUI dependencies
import React from "react";
import {
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";

// Basic HTML login form
const SimpleLogin: React.FC = () => {
  console.log("SimpleLogin component rendering!");
  
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '400px', 
      margin: '50px auto',
      border: '1px solid #ccc',
      borderRadius: '8px'
    }}>
      <h1>LifePlace Login</h1>
      <form>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input 
            type="email" 
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '5px' 
            }} 
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input 
            type="password" 
            style={{ 
              width: '100%', 
              padding: '8px', 
              marginTop: '5px' 
            }} 
          />
        </div>
        <button 
          type="submit" 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
};

// Test dashboard
const TestDashboard: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard Works!</h1>
      <p>If you see this, routing is working correctly.</p>
    </div>
  );
};

// Minimal App without any external libraries except router
const App: React.FC = () => {
  console.log("App component rendering!");
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<SimpleLogin />} />
        <Route path="/dashboard" element={<TestDashboard />} />
        <Route path="*" element={<SimpleLogin />} />
      </Routes>
    </Router>
  );
};

export default App;