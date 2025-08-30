// src/components/Contact.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiMapPin, FiPhone, FiSend } from 'react-icons/fi';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);

  const showModal = (message, isError = false) => {
    setModalMessage(message);
    setModalError(isError);
    setModalOpen(true);
    setTimeout(() => setModalOpen(false), 3000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    setImageFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrls = [];
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const data = new FormData();
        data.append('file', file);
        data.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET ); // or your own unsigned preset
        try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME }/image/upload`, {
            method: 'POST',
            body: data
          });
          const result = await res.json();
          if (result.secure_url) imageUrls.push(result.secure_url);
        } catch (err) {
          showModal('Image upload failed. Please try again.', true);
          return;
        }
      }
    }

    // Prepare Formspree data
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('subject', formData.subject);
    let messageWithImages = formData.message;
    if (imageUrls.length > 0) {
      messageWithImages += '\n\nImages:\n' + imageUrls.map(url => `- ${url}`).join('\n');
    }
    formDataToSend.append('message', messageWithImages);

    try {
      const response = await fetch(process.env.REACT_APP_FORMSPREE_ENDPOINT , {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: formDataToSend
      });
      if (response.ok) {
        showModal("Thank you! Your message has been sent. We'll get back to you soon.");
        setFormData({ name: '', email: '', subject: '', message: '' });
        setImageFiles([]);
      } else {
        showModal("Sorry, there was a problem sending your message. Please try again.", true);
      }
    } catch (err) {
      showModal("Sorry, there was a problem sending your message. Please try again.", true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have a great food place in mind that we missed? We'd love to hear about it! 
            Share your favorite local spots with us and help us make FoodMaps even better.
          </p>
        </motion.div>

        {/* Add a visible section: 'Contact us at: aneezakiran07@gmail.com' */}
        <div className="text-center mb-12">
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Contact us at: aneezakiran07@gmail.com
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get in Touch</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <FiMail className="w-6 h-6 text-orange-500 mt-1" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Email</h3>
                  <p className="text-gray-600">aneezakiran07@gmail.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <FiMapPin className="w-6 h-6 text-orange-500 mt-1" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Location</h3>
                  <p className="text-gray-600">Your Neighborhood</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <FiPhone className="w-6 h-6 text-orange-500 mt-1" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Phone</h3>
                  <p className="text-gray-600">Coming Soon</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                  Upload images (optional, you can select multiple)
                </label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="mt-1 block w-full"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <FiSend className="mr-2" />
                Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
          <div className={`bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center relative ${modalError ? 'border border-red-400' : 'border border-green-400'}`}> 
            <button onClick={() => setModalOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
            <div className="mb-2">
              {modalError ? (
                <svg className="mx-auto mb-2 w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="mx-auto mb-2 w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              )}
            </div>
            <p className="text-lg font-semibold mb-2">{modalMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;

