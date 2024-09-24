const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
	// default session length
	const DefaultMaxAgeMs = 1_000_000;

	// keeping the session data inside a closure to keep them protected
	const sessions = {};

	// might be worth thinking about why we create these functions
	// as anonymous functions (per each instance) and not as prototype methods
	this.createSession = (response, username, maxAge = DefaultMaxAgeMs) => {
        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex'); 

        // Calculate the current time and expiration time
        const now = Date.now();
        const expiresAt = now + maxAge;

        // Create session object with user metadata
        const sessionData = {
            username: username,
            createdAt: now,
            expiresAt: expiresAt
        };

        // Store the session data using the token as key
        sessions[token] = sessionData;

        // Set the cookie in the response with the session token
        response.cookie('cpen322-session', token, {maxAge: maxAge, encode: String});

        // Schedule the deletion of the session data after maxAge milliseconds
        setTimeout(() => delete sessions[token], maxAge);
    };
	

	this.deleteSession = (request) => {
		delete sessions[request.session];
		delete request.username;
		delete request.session;
	};
	

	this.middleware = (request, response, next) => {
		// Try to read the cookie information from the request
		const cookieHeader = request.headers.cookie;
	
		if (!cookieHeader) {
			// Short-circuit the middleware and return immediately
			return next(new SessionError("No cookie header found"));
		}else {
			// Parse cookies from the request header
			const cookies = request.headers.cookie.split(';').map(cookie => cookie.trim()).reduce((acc, cookie) => {
				const [key, value] = cookie.split('=');
				acc[key] = value;
				return acc;
			}, {});
		
			// Check if the session token exists in the sessions and is valid
			const sessionToken = cookies['cpen322-session'];
			if (sessionToken && sessions[sessionToken]) {
				// Assign the username and session token to the request object
				request.username = sessions[sessionToken].username;
				request.session = sessionToken;
				next();
			} else {
				// If the session token is not found or invalid, pass a SessionError to the next middleware
				next(new SessionError());
			}
		}
		
	};
	

	// this function is used by the test script.
	// you can use it if you want.
	this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;