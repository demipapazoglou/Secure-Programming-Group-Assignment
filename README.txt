Group Repository for COMP SCI 3307 - Secure Programming: Secure Chat Application Project (2025 Semester 2)

The contributors for this project are members of Group 28 UG:
- Amber Yaa Wen Chew
- Caitlin Joyce Martyr
- Demi Papazoglou
- Grace Baek
- Samira Hazara

===============================================================================
TABLE OF CONTENTS
===============================================================================
- Project Description
- Features
- Technologies Used
- Installation and Setup
- Program Usage
- Files Included
- Contributions
- Acknowledgements

===============================================================================
PROJECT DESCRIPTION
===============================================================================

Chat28 is a secure, real-time public chat platform that supports both one-to-one and group (public announcement style) messaging. Designed with a primary focus on security and privacy, Chat28 provides an application where users can communicate with confidence.

===============================================================================
FEATURES
===============================================================================

- One-to-one private messaging
- Group chat support
- End-to-end encryption (RSA-based)
- Authentication and authorisation
- Real-time communication using WebSockets

===============================================================================
TECHNOLOGIES USED
===============================================================================

Backend:
- Runtime: Node.js
- Framework: Express.js
- Real-time Communication: WebSocket
- Encryption: RSA
- Database: MongoDB

Frontend:
- HTML
- CSS stylesheets

Security & Authentication:
- Password Hashing: bcryptjs
- Token Generation: crypto (for secure operations)
- XSS Protection: xss-clean (basic XSS middleware for sanitising requests)
- Authentication: Session-based Authentication (Express Session)

===============================================================================
INSTALLATION AND SETUP
===============================================================================

Recommended Browser: Google Chrome  
Preferred Device: Laptop/Desktop for full UI functionality

1. Clone the Repository 
   git clone https://github.com/demipapazoglou/Secure-Programming-Group-Assignment.git

2. Navigate to the Root Directory 
   cd secure-chat/server

3. Install Dependencies 
   npm install

4. Set up Environment Variables
   Create a .env file in the server directory and add the following configuration:

   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://28_admin:UzSNxWdBjBjtohWi@28test.fphel12.mongodb.net/?retryWrites=true&w=majority&appName=28Test
   MONGO_DB=28test

   # JWT Configuration
   JWT_SECRET=super-secure-jwt-secret-key-at-least-32-characters-long-for-production-use
   JWT_COOKIE_NAME=chat28_token
   JWT_ISSUER=chat28

   # Server Settings 
   PORT=3000
   NODE_ENV=development

5. Start the Server 
   npm start
   (Visit http://localhost:3000)

===============================================================================
PROGRAM USAGE EXAMPLES
===============================================================================

User Registration and Login:
1. Navigate to http://localhost:3000 in a browser
2. Create a new account
3. Login using your credentials

Sending a private message:
1. Select a user from the contacts list
2. Enter a message; it will be encrypted with the recipient's public key

Sending a group message:
1. Select "Public chat" and send your message
- All connected users will receive the broadcast

Run the crypto test: node test-crypto.js

===============================================================================
FILES INCLUDED
===============================================================================

- crypto/CryptoManager.js - Handles encryption, decryption, and key management
- test-crypto.js - Test file for verifying the functionality of CryptoManager.js and MessageSigner.js
- frontend/public/ - Frontend files (eg. HTML, CSS)
- /server.js - Main backend server entry points

===============================================================================
CONTRIBUTIONS
===============================================================================

Pull requests, suggestions, and bug reports are welcome. For significant contributions, please open an issue first to discuss your ideas.

===============================================================================
ACKNOWLEDGEMENTS
===============================================================================

This project was developed solely for academic purposes as part of COMP SCI 3307 and is not intended for production or commercial deployment.
