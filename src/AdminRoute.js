import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminPanel from './AdminPanel';

const AdminRoute = () => {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
};

export default AdminRoute;