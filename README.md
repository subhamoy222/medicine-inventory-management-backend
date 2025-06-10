<h1 align="center">🩺 Smart Medicine Inventory Backend</h1>
<p align="center">
  <strong>A secure and scalable backend for managing medicine stock, built with Node.js, Express, and MongoDB.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-brightgreen?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-4.x-black?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-6.x-green?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-blue?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
</p>

---

## 📦 Overview

The backend of **Smart Medicine Inventory System** is designed to:
- 💊 Manage and track medicine stock levels
- ⏰ Notify about low stock or expired items
- 🛂 Provide secure user and admin authentication
- 📋 Maintain patient and prescription records

---

## 🚀 Features

✅ CRUD operations for Medicines  
✅ Role-based authentication (Admin / Staff)  
✅ Expiry alert system  
✅ Inventory threshold alerts  
✅ RESTful API architecture  
✅ MongoDB Atlas support  
✅ Clean MVC structure

---

## 🛠️ Tech Stack

| Technology     | Description                        |
|----------------|------------------------------------|
| ![Node.js](https://img.shields.io/badge/-Node.js-black?logo=node.js) | Backend runtime |
| ![Express.js](https://img.shields.io/badge/-Express.js-grey?logo=express) | Web framework |
| ![MongoDB](https://img.shields.io/badge/-MongoDB-green?logo=mongodb) | Database |
| ![JWT](https://img.shields.io/badge/-JWT-blue?logo=jsonwebtokens) | Authentication |
| ![Postman](https://img.shields.io/badge/-Postman-orange?logo=postman) | API testing |
| ![Mongoose](https://img.shields.io/badge/-Mongoose-red?logo=mongoose) | ODM for MongoDB |

---

## 🧪 API Endpoints

| Method | Route                  | Description              |
|--------|------------------------|--------------------------|
| GET    | `/medicines`           | List all medicines       |
| POST   | `/medicines`           | Add new medicine         |
| PUT    | `/medicines/:id`       | Update medicine info     |
| DELETE | `/medicines/:id`       | Delete a medicine        |
| POST   | `/auth/register`       | Register user/admin      |
| POST   | `/auth/login`          | Login and get JWT token  |

🧪 All routes tested using Postman and validated.

---

## 📂 Project Structure

smart-medicine-backend/
├── controllers/
├── models/
├── routes/
├── middleware/
├── config/
├── .env
├── server.js

yaml
Copy
Edit

---

## 🚀 Getting Started

### 🔧 Install dependencies
```bash
npm install
⚙️ Create a .env file
ini
Copy
Edit
PORT=3000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_jwt_secret
▶️ Run the server
bash
Copy
Edit
npm start
🔐 Authentication
JWT-based token authentication

Role protection middleware (isAdmin, isUser)

Secure password storage with bcrypt

👨‍💻 Author
Made with ❤️ by Subhamoy
If you find this helpful, don’t forget to ⭐ the repo!

📢 Contributions & Issues
Contributions are welcome!
Please open an issue or PR if you find bugs or have suggestions.

🧠 Related Repositories
👉 Check out the Frontend Repository for the complete system.
