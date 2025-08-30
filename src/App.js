// File: src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./components/HomePage";
import ShopsList from "./components/ShopsList";
import ShopDetail from "./components/ShopDetail";
import About from "./components/About";
import Contact from "./components/Contact";
import SuggestionsPage from "./components/SuggestionsPage";
import AdminPanel from './AdminPanel';

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shops" element={<ShopsList />} />
            <Route path="/shops/:shopId" element={<ShopDetail />} />
            <Route path="/suggestions" element={<SuggestionsPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}