--------------------------------------------------------------------------------
CHAT28 README
--------------------------------------------------------------------------------
Group 28 UG: Samira Hazara | Demi Papazoglou | Caitlin Joyce Martyr | 
             Amber Yaa Wen Chew | Grace Baek
Course: COMP SCI 3307 - Secure Programming
Repository: https://github.com/demipapazoglou/Secure-Programming-Group-Assignment.git
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
TABLE OF CONTENTS
--------------------------------------------------------------------------------
1. System Requirements
2. Quick Start Guide
3. Dependencies
4. Usage Examples
5. Troubleshooting
6. Contact Information

--------------------------------------------------------------------------------
1. SYSTEM REQUIREMENTS
--------------------------------------------------------------------------------
Required:
- Node.js v18.0.0 or higher
- npm (Node Package Manager)
- Modern web browser (Chrome, Firefox, or Edge)
- MongoDB (credentials provided below)

--------------------------------------------------------------------------------
2. QUICK START GUIDE
--------------------------------------------------------------------------------

Step 1: Clone and Navigate to Project Directory
------------------------------------------------
git clone https://github.com/demipapazoglou/Secure-Programming-Group-Assignment.git
cd Chat28
npm install

Step 2: Create .env File Inside Chat28 Directory
-------------------------------------------------
IMPORTANT: Create the .env file inside the Chat28 folder (not the root folder).

Create a file named ".env" inside the Chat28 directory with this content:

MONGODB_URI=mongodb+srv://28_admin:UzSNxWdBjBjtohWi@28test.fphel12.mongodb.net/?retryWrites=true&w=majority&appName=28Test
MONGO_DB=28test
JWT_SECRET=super-secure-jwt-secret-key-at-least-32-characters-long-just-for-this-project
PORT=3000
NODE_ENV=development

Step 3: Run the Server
----------------------
Make sure you are in the Chat28 directory, then run:

npm start

Expected console output:
  MongoDB connected
  WebSocket server initialized with SOCP v1.3 support
  Server running at http://localhost:3000

Step 4: Access the Application
-------------------------------
Open your browser and navigate to: http://localhost:3000

For development mode with auto-restart:
  npm run dev

--------------------------------------------------------------------------------
3. DEPENDENCIES
--------------------------------------------------------------------------------

Core Packages:
- express (4.18.2) - Web framework
- ws (8.18.3) - WebSocket implementation
- mongoose (8.0.3) - MongoDB ODM

Security Packages:
- bcrypt (5.1.1) - Password hashing
- jsonwebtoken (9.0.2) - JWT authentication
- crypto (built-in Node.js) - RSA-4096 encryption/signing

Additional Packages:
- dotenv (16.3.1) - Environment configuration
- cors (2.8.5) - CORS handling
- helmet (7.1.0) - Security headers
- morgan (1.10.0) - HTTP request logging

Install all dependencies with:
  npm install

--------------------------------------------------------------------------------
4. USAGE EXAMPLES
--------------------------------------------------------------------------------

Example 1: Register Two Users
------------------------------
1. Open http://localhost:3000 in your browser
2. Click "Create an account"
3. Register first user:
   Username: alice
   Password: Alice123!
4. Wait 5-10 seconds for RSA-4096 key generation
5. Open a new incognito/private browser window
6. Register second user:
   Username: bob
   Password: Bob123!

Example 2: Send Public Message
-------------------------------
1. As alice, ensure "Public" button is selected (default)
2. Type in the message box: Hello everyone!
3. Press Enter or click the send button
4. Bob will see the message appear in real-time

Example 3: Send Encrypted Private Message
------------------------------------------
1. As alice, click the "Private" button
2. Select "bob" from the recipient dropdown
3. Type: This is a secret message
4. Press Enter or click send
5. The message is encrypted with RSA-4096 using bob's public key
6. Only bob can decrypt it with his private key
7. Open browser console (F12) to see [E2EE] encryption logs

Example 4: Use Chat Commands
-----------------------------
Type these commands in the chat input:

/list                       Lists all online users (alphabetically sorted)
/tell bob Hello there       Sends encrypted direct message to bob
/all Broadcast message      Sends message to public channel
/file bob                   Opens file upload dialog to send encrypted file

Example 5: Test File Transfer
------------------------------
1. Click "Private" mode
2. Select a recipient from the dropdown
3. Click the paperclip icon
4. Choose a file (recommended: under 5MB for testing)
5. File is encrypted in chunks using RSA-4096
6. Recipient receives and automatically decrypts the file

--------------------------------------------------------------------------------
5. TROUBLESHOOTING
--------------------------------------------------------------------------------

Problem: "Cannot find module 'xyz'"
Solution: Run npm install in the Chat28 directory

Problem: "MONGODB_URI is not set"
Solution: Ensure .env file exists inside Chat28 directory (not root)
          Check that all variables are correctly copied

Problem: "Port 3000 already in use"
Solution: Change PORT in .env to 3001
          Or kill the process using the port:
          Mac/Linux: lsof -ti:3000 | xargs kill -9
          Windows: netstat -ano | findstr :3000
                   Then: taskkill /PID <pid> /F

Problem: "WebSocket connection fails"
Solution: Verify server is running (npm start)
          Check that no firewall is blocking port 3000
          Look at browser console for connection errors

Problem: Messages not appearing
Solution: Check browser console for WebSocket errors
          Verify user is authenticated (token in localStorage)
          Ensure recipient is online for private messages

--------------------------------------------------------------------------------
6. CONTACT INFORMATION
--------------------------------------------------------------------------------

If you have any trouble running the Chat28 application or questions about our
implementation, please feel free to contact us through our university emails!

Samira Hazara: samira.hazara@student.adelaide.edu.au
Demi Papazoglou: demi.papazoglou@student.adelaide.edu.au
Caitlin Joyce Martyr: caitlinjoyce.martyr@student.adelaide.edu.au
Amber Yaa Wen Chew: amberyaawen.chew@student.adelaide.edu.au
Grace Baek: grace.baek@student.adelaide.edu.au

We're happy to help with any issues such as: 

- Installation and configuration issues
- Protocol compatibility questions
- Interoperability testing
- General usage guidance

GitHub: https://github.com/demipapazoglou/Secure-Programming-Group-Assignment.git

Thank you for testing our implementation! We look forward to your feedback!

Kind regards,

UG Group 28 
