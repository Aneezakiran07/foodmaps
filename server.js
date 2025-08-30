const express = require('express');
const cors = require('cors');
const multer = require('multer');
const formData = multer();
const mailgun = require('mailgun-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mailgun config (set these in your .env file)
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

app.post('/api/contact', formData.single('image'), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    let imageAttachment = null;
    if (req.file) {
      imageAttachment = new mg.Attachment({
        data: req.file.buffer,
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
    }
    const mailData = {
      from: `${name} <${email}>`,
      to: 'aneezakiran07@gmail.com',
      subject: 'New Contact Us Message',
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      attachment: imageAttachment ? [imageAttachment] : undefined
    };
    mg.messages().send(mailData, function (error, body) {
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      res.json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 