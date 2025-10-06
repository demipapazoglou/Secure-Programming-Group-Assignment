Group Repository for COMP SCI 3307 Secure Programming Secure Chat Application Project (2025 Semester 2)

Group 28 UG: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | Amber Yaa Wen Chew | Grace Baek 

===============================================================================
TABLE OF CONTENTS
===============================================================================
- Project Description
- Features
- Technologies Used
- Installation and Setup
- Program Usage
- Files Included
- Automated Testing (Semgrep)
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
- End-to-end encryption
- Authentication and authorisation
- Real-time communication

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
- Markup: HTML

Security & Authentication:
- Password Hashing: bcryptjs
- Token Generation: crypto (for secure operations)
- XSS Protection: xss-clean (basic XSS middleware for sanitising requests)
- Authentication: Session-based Authentication (Express Session)

===============================================================================
INSTALLATION AND SETUP
===============================================================================

Recommended Browser: Google Chrome  
Preferred Device: Laptop/Desktop for full screen functionality

1. Clone the Repository 
   git clone https://github.com/demipapazoglou/Secure-Programming-Group-Assignment.git

2. Navigate to the Root Directory 
   cd Chat28

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

   Visit http://localhost:3000

===============================================================================
PROGRAM USAGE
===============================================================================

===============================================================================
FILES INCLUDED
===============================================================================

- crypto/CryptoManager.js - Handles encryption, decryption, and key management

===============================================================================
AUTOMATED TESTING (Semgrep)
===============================================================================
We used Semgrep for automated static analysis to detect potential security vulnerabilities and code quality issues.

1. Installation
   brew install semgrep
   # or
   npm install -g semgrep

2. Run the scan 
   semgrep scan --config auto .

Semgrep automatically analyses all project folders and reports any security or style issues in the console.

===============================================================================
CONTRIBUTIONS
===============================================================================

Pull requests, suggestions, and bug reports are welcome. For significant contributions, please open an issue first to discuss the changes.

===============================================================================
ACKNOWLEDGEMENTS
===============================================================================

This project was developed solely for academic purposes and is not intended for production or commercial deployment.

Some parts of this project were assisted by AI tools for documentation and debugging support. All outputs were reviewed and checked by the team.