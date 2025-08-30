<<<<<<< HEAD
# 🍽️ FoodMaps - Lightweight Restaurant Directory

A simple, fast, and lightweight restaurant directory app built with React and Tailwind CSS.

## ✨ Features

- **Restaurant Listings**: Browse all restaurants with images and details
- **Search Functionality**: Search restaurants by name only (super simple!)
- **Cloudinary Integration**: Menu images hosted on Cloudinary
- **Responsive Design**: Works great on mobile and desktop
- **No Database**: Everything stored locally - super fast! 🚀

## 🏪 Restaurants Included

- **Papa G** - Authentic Pakistani Cuisine (with Cloudinary menu image)

## 🔍 Search

Simply search by restaurant name:
- "Papa G" ✅

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Open your browser**:
   ```
   http://localhost:3000
   ```

## 📱 Pages

- **Home** (`/`) - Hero section + top restaurants
- **Shops** (`/shops`) - All restaurants list
- **Search** (`/search`) - Search restaurants by name

## 🖼️ Cloudinary Integration

- Papa G's menu image: `https://res.cloudinary.com/dtzhhvlaw/image/upload/v1751798922/papag_voyprb.jpg`
- No API keys needed for viewing images
- Images are publicly accessible

## 🎯 Why This Approach?

- **No Firebase DB** - No pricing limits or complexity
- **Super Fast** - Everything loads instantly
- **Simple** - Just search by restaurant name
- **Lightweight** - No heavy database queries
- **Easy to Maintain** - All data in one file

## 🛠️ Tech Stack

- React 18
- Tailwind CSS
- Framer Motion
- React Router
- Cloudinary (for images)

## 📝 Adding New Restaurants

Since we use local data storage, to add a new restaurant:

1. **Upload images to Cloudinary first**:
   - Go to [Cloudinary Dashboard](https://cloudinary.com/console)
   - Upload your restaurant/menu images
   - Copy the image URLs

2. **Edit `src/data/restaurants.js`**:
   ```javascript
   {
     id: 2,
     name: "New Restaurant",
     rating: 4.5,
     tagline: "Amazing Food",
     image: "https://res.cloudinary.com/your-cloud/image.jpg",
     cuisine: "International",
     deliveryTime: "20-25 min",
     description: "Delicious food description",
     location: "Block D",
     menuImages: [
       "https://res.cloudinary.com/your-cloud/menu-image.jpg"
     ]
   }
   ```

3. **Restart the app** to see changes

**Note**: No "Add Restaurant" form - everything is managed through code for simplicity! 🎯
=======
### Food Menu Website

Website Link: https://food-manual-app.web.app/

## Problem Statement
Living in a society with over 2,500 houses and 40+ food chains, residents face a major hassle — there’s no centralized platform to browse updated menus. People waste time calling multiple restaurants just to check menus and availability. This app solves that problem!

## About the App
A user-friendly platform designed to provide easy access to restaurant menus, contact info, and locations in one place — making ordering decisions fast and hassle-free.

## Current Features
Restaurant Listings: Browse local restaurants with detailed menus and contact information.

User Reviews & Ratings: Users can share their dining experiences by leaving reviews and ratings for restaurants.

Search Restaurants: Quickly find restaurants by name or cuisine.

Suggestion & Complaint Page: Users can suggest new restaurants, report missing menus, or file complaints.

Photo Uploads: Users can upload pictures (e.g., missing menus or issues) to help keep data accurate.

## Upcoming Features
Filter Restaurants: Filter by cuisine, price range, or ratings to find the perfect meal.

## Technologies Used
Frontend: [React / Tailwind Css]

Backend: [Node.js / Firebase / github gists / cloudinary]

Hosting: [Firebase]

## How to Use
Browse or search restaurants from the main page.

View menus, contact details, and locations.

Rate and review restaurants based on your experience.

Use the suggestion page to contribute or report issues.

## Contribution
Contributions, issues, and suggestions are welcome! Feel free to fork and improve the app.
>>>>>>> 8e58344029f920a0bba4f8a5db4202f137355cd6
