# Group Repository for COMP SCI 3307 Secure Programming Secure Chat Application Project (2025 Semester 2)

**Group 28 UG:** Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 

## Table of Contents 
- [Project Description](#project-description)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation and Setup](#installation-and-setup)
- [Program Usage](#program-usage)
- [Files Included](#files-included)
- [Contributions](#contributions)
- [Acknowledgements](#acknowledgements)

## Project Description

Chat28 is a secure, real-time public chat platform that supports both one-to-one and group (public announcement style) messaging. Designed with a primary focus on security and privacy, Chat28 provides an application where users can communicate with confidence.

## Features

- One-to-one private messaging
- Group chat support
- End-to-end encryption
- Authentication and authorisation
- Real-time communication

## Technologies Used 

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-time Communication:** WebSocket
- **Encryption:** RSA
- **Database:** MongoDB

### Frontend
- **Markup:** HTML

### Security & Authentication
- **Password Hashing:** bcryptjs
- **Token Generation:** crypto (for secure operations)
- **XSS Protection:** xss-clean (basic XSS middleware for sanitising requests)
- **Authentication:** Session-based Authentication (Express Session)

## Installation and Setup

> **Recommended Browser:** Google Chrome  
> **Preferred Device:** Laptop/Desktop for full screen functionality

### 1. Clone the Repository 
```bash
git clone https://github.com/demipapazoglou/Secure-Programming-Group-Assignment.git
```

### 2. Navigate to the Root Directory 
```bash
cd secure-chat/server
```

### 3. Install Dependencies 
```bash
npm install
```

### 4. Set up the Database 
```bash
# Database installation instructions to be added
```

### 5. Start the Server 
```bash
npm start
```

➤ Visit http://localhost:3000

## Program Usage

Run the crypto test:
```bash
node test-crypto.js
```

## Files Included

- `crypto/CryptoManager.js` – Handles encryption, decryption, and key management
- `crypto/MessageSigner.js` – Signs and verifies message envelopes
- `test-crypto.js` – Test file for verifying the functionality of `CryptoManager.js` and `MessageSigner.js`

## Contributions

Pull requests, suggestions, and bug reports are welcome. For significant contributions, please open an issue first to discuss the changes.

## Acknowledgements

This project was developed solely for academic purposes and is not intended for production or commercial deployment.
