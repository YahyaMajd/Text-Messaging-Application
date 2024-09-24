// Import necessary modules
const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { MongoClient } = require('mongodb')
const Database = require('./Database.js')


///// AI FEATURE ///////////////
// Assuming you've set up Ollama according to its documentation
const { Ollama } = require("@langchain/community/llms/ollama");

const ollama = new Ollama({
  baseUrl: "http://localhost:11434", // Adjust as necessary
  model: "mistral", // Adjust as necessary
});
/////////////////////////

// A5 
const crypto = require('crypto');
// Import SessionManager from another file (adjust the path as necessary)
const SessionManager = require('./SessionManager.js');

// Declare a variable sessionManager, assigning a SessionManager instance
const sessionManager = new SessionManager();


// Middleware to log requests
function logRequest(req, res, next) {
    console.log(`${new Date()} ${req.ip} : ${req.method} ${req.path}`);
    next();
}

// Server configuration
const host = 'localhost';
const port = 3000;
const clientApp = path.join(__dirname, 'client');

// Create an express application
const app = express();

// Use middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use custom middleware for logging
app.use(logRequest);


let messages = {};
var messageBlockSize = 10

//A5 T8
function sanitizeMessage(message) {
    message = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    message = message.replace(/<\s*button\s+.*?(?=\s+)(?=(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*?\s+onclick\s*=\s*(?:'|").*?(?:'|"))[^>]*>/gi, '<button>');
    message = message.replace(/<\s*([^>]*?\s)?[^>]*?(on\w+)\s*=\s*['"][^'"]*['"][^>]*?>/gi, '<$1>');
    return message
}

//
const broker = new WebSocket.Server({ port: 8000 });
// Event listener for WebSocket server connection
broker.on('connection', function connection(ws, req) {
    console.log('New WebSocket connection established');

    //Read and parse the cookie from the request headers
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        // Close the client socket if the cookie is not present
        ws.close();
        console.log('WebSocket connection closed due to missing cookie');
        return;
    }
    // Parse cookies from the request header
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim()).reduce((acc, cookie) => {
        const [key, value] = cookie.split('=');
        acc[key] = value;
        return acc;
    }, {});
    // Check if the session token exists in the sessions and is valid
    const token = cookies['cpen322-session'];
    if (!token || !sessionManager.getUsername(token)) {
        // Close the client socket if the session token is not found or invalid
        ws.close();
        console.log('WebSocket connection closed due to invalid session token');
        return;
    }


    // Event listener for receiving messages from clients
    ws.on('message', async function incoming(message) {
        console.log('Received message:', message);
        
        // Parse the message to extract roomId
        const parsedMessage = JSON.parse(message);
        parsedMessage.text = sanitizeMessage(parsedMessage.text);
        const roomId = parsedMessage.roomId;
        const username = parsedMessage.username;
        const text = parsedMessage.text;

        const messageObject = {
            roomId: roomId,
            username: sessionManager.getUsername(token),
            text: text,
            //timestamp: new Date().getTime() // UNIX time in milliseconds
        };

        // Store the message in the corresponding array in the messages object
        if (messages[roomId]) {
            messages[roomId].push(messageObject);
        } else {
            messages[roomId] = [messageObject];
        }

        // Check if messages array size equals messageBlockSize
        if (messages[roomId].length === messageBlockSize) {
            // Create new Conversation object
            const conversation = {
                room_id: roomId,
                messages: messages[roomId],
                timestamp: new Date().getTime() // Current UNIX time in milliseconds
            };

            // Add to the database
            try {
                await db.addConversation(conversation);
                // Empty the messages array for new messages
                messages[roomId] = [];  
            } catch (err) {
                console.error('Failed to add conversation to database:', err);
            }
        }

        // Iterate through clients and forward message to each client, except the sender
        broker.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(messageObject));
            }
        });
    });

    // Event listener for WebSocket close
    ws.on('close', function close() {
        console.log('WebSocket connection closed');
    });
});

// A5 T3
function isCorrectPassword(password, saltedHash) {
    // Extract the salt and the original hash from saltedHash
    const salt = saltedHash.substring(0, 20);
    const originalHash = saltedHash.substring(20);

    // Hash the input password with the extracted salt
    const hash = crypto.createHash('sha256').update(password + salt).digest('base64');

    // Compare the computed hash with the original hash
    return hash === originalHash;
}

// Protect the following pages
app.use(['/chat/:room_id/messages', '/chat/:room_id', '/chat', '/profile', '/app.js', '/index.html', '/index'], (req, res, next) => {
    sessionManager.middleware(req, res, (err) => {
        next(err);
    });
});

app.get('/', (req, res, next) => {
    sessionManager.middleware(req, res, (err) => {
        next(err);
    });
});

// Define error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof SessionManager.Error) {
        // Check the Accept header of the request
        if (req.headers.accept == 'application/json') {
            // Client accepts JSON, send a 401 with the error message
            res.status(401).json({ error: err.message });
        } else {
            // Otherwise, redirect to the login page
            res.redirect('/login');
        }
    } else {
        // For other types of errors, return HTTP 500
        res.status(500).send('Internal Server Error');
    }
});

// Define the GET /profile endpoint
app.get('/profile', (req, res) => {
    try {
        // Retrieve the username from the request object augmented in the session middleware
        const username = req.username;
        // Create an object containing the profile information (in this case, just the username)
        const prof = { username };
        // Send the profile object as JSON response
        res.json(prof);
    } catch (error) {
        console.error('Failed to fetch profile:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/login', (req, res) => {

    db.getUser(req.body.username).then(user => {
        if (user == null) {
            
            // User not found, redirect back to /login
            res.redirect('/login');
        } else {
            // User found, check password
            if (isCorrectPassword(req.body.password, user.password)) {
                //console.log('found user\n');
                // Correct password, create session and redirect to homepage
                sessionManager.createSession(res, req.body.username);
                res.redirect('/#');
            } else {
                //console.log('didnt find user\n');
                // Incorrect password, redirect back to /login
                res.redirect('/login');
            }
        }
    }).catch(err => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });
});

//A4
const mongoUrl = 'mongodb://localhost:27017'; 
const dbName = 'cpen322-messenger';
let db;
// Initialize MongoDB connection
function connectToDatabase() {
    const client = new MongoClient(mongoUrl);
    try {
        client.connect();
        console.log(`[MongoClient] Connected to ${mongoUrl}/${dbName}`);
        db = new Database(mongoUrl, dbName);
    } catch (err) {
        console.error(`Failed to connect to MongoDB: ${err}`);
    }
}

// Call the async function to connect to MongoDB
connectToDatabase();

// populate messages variable
db.getRooms().then((result) => {
    result.forEach(function (chatroom) {
        messages[chatroom._id] = [];
    });
});
// Define GET endpoint for /chat - Updated for A4 task2
app.get('/chat', async (req, res) => {
    try {
        const rooms = await db.getRooms();
        const chatroomsWithMessages = rooms.map(room => ({
            ...room,
            messages: messages[room._id] || []
        }));
        res.json(chatroomsWithMessages);
    } catch (error) {
        console.error('Failed to fetch chatrooms:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Define GET endpoint for /chat/:room_id/messages
app.get('/chat/:room_id/messages', async (req, res) => {
    console.log('Received request for /chat/:room_id/messages', req.params, req.query);
    const roomId = req.params.room_id;
    const before = req.query.before ? parseInt(req.query.before, 10) : Date.now();

    if (isNaN(before)) {
        return res.status(400).send('Invalid or missing "before" query parameter');
    }

    try {
        const conversation = await db.getLastConversation(roomId, before);
        if (conversation) {
            res.json(conversation);
        } else {
            res.status(404).send(`No conversations found for room ${roomId} before ${before}`);
        }
    } catch (err) {
        console.error('Error retrieving conversation:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Define new POST endpoint for /chat 
app.post('/chat', async (req, res) => {
    const { name, image } = req.body;
    if (!name) {
        return res.status(400).send('Name field required');
    }
    try {

        const roomToAdd = { name, image };
        console.log('Adding room:', roomToAdd);
        const addedRoom = await db.addRoom(roomToAdd);
        console.log('Added room successfully:', addedRoom);
        messages[addedRoom._id] = [];
        res.status(200).json(addedRoom);
    } catch (error) {
        console.error('Error adding new room:', error);
        // Log detailed error if available
        if (error instanceof Error) {
            console.error('Detailed error:', error.message);
        }
        res.status(500).send('Internal Server Error');
    }
    
});


////////// AI ENDPOINT /////////////////
// New endpoint for autocorrect
app.post('/autocorrect', async (req, res) => {
    const inputText = req.body.text; // Get the text from the request body

    try {
        const stream = await ollama.stream('Correct any spelling or grammatical errors in the text after the colon, do not add any explanation, simply return the corrected version. If it does not make sense, do not correct it and return it as it is ONLY: ' + inputText);

        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        // Join the chunks to form the full corrected text
        const correctedText = chunks.join("");

        // Send the corrected text back to the client
        res.json({ correctedText });
    } catch (error) {
        console.error('Error processing text with Ollama:', error);
        res.status(500).send('Error processing text');
    }
});
///////////////////////////

// New GET endpoint /chat/:room_id
app.get('/chat/:room_id', async (req, res) => {
    try {
        const room = await db.getRoom(req.params.room_id);
        if (room) {
            res.json(room);
        } else {
            res.status(404).send(`Room ${req.params.room_id} was not found`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Define routes for login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/client/login.html');
});
// Define routes for css page
app.get('/style.css', (req, res) => {
    res.sendFile(__dirname + '/client/style.css');
});
// Define routes for css page
app.get('/index', (req, res) => {
    res.sendFile(__dirname + '/client/index.html');
});
// Serve static files (client-side) after defining API routes
app.use('/', express.static(clientApp));

app.get('/logout', (req, res) => {
    // Call deleteSession to delete the session associated with the request
    sessionManager.deleteSession(req);
    // Redirect to the login page
    res.redirect('/login');
});

// Start the server
app.listen(port, host, () => {
    console.log(`${new Date()} App Started. Listening on ${host}:${port}, serving ${clientApp}`);
});

const cpen322 = require('./cpen322-tester.js');
cpen322.connect('http://3.98.223.41/cpen322/test-a5-server.js');
cpen322.export(__filename, { app, messages, db, messageBlockSize ,sessionManager, isCorrectPassword});
  