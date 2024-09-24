
const { MongoClient, ObjectId } = require('mongodb');	// require the mongodb driver

/**
 * Uses mongodb v4.2+ - [API Documentation](http://mongodb.github.io/node-mongodb-native/4.2/)
 * Database wraps a mongoDB connection to provide a higher-level abstraction layer
 * for manipulating the objects in our cpen322 app.
 */
function sanitizeMessage(message) {
    // Example: Removing <script> tags entirely
    return message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function Database(mongoUrl, dbName){
	if (!(this instanceof Database)) return new Database(mongoUrl, dbName);
 	this.connected = new Promise((resolve, reject) => {
  		const client = new MongoClient(mongoUrl);

  		client.connect()
			.then(() => {
   				// Ping the dbName to ensure it exists
   				return client.db(dbName).command({ ping: 1 });
  			})
			.then(() => {
  	 			console.log('[MongoClient] Connected to ' + mongoUrl + '/' + dbName);
   				resolve(client.db(dbName));
  			})
  			.catch((err) => {
  	 			reject(err);
 		 	});
	});
 	this.status = () => this.connected.then(
  		db => ({ error: null, url: mongoUrl, db: dbName }),
  		err => ({ error: err })
 	);
}


Database.prototype.getRooms = function(){
    // Use the connected Promise to ensure a connection to the database is established
    return this.connected.then(db => 
        // Once connected, use the db instance to interact with the database
        db.collection('chatrooms').find().toArray()
    ).then(rooms => {
        // If the operation is successful, return the rooms array
        return rooms;
    }).catch(err => {
        // If an error occurs, throw the error
        throw err;
    });
}



Database.prototype.getRoom = function(room_id) {
    return this.connected.then(db => {
        // Try to convert room_id to an ObjectId, if it fails, use the original room_id
        let queryId;
        try {
            queryId = new ObjectId(room_id);
        } catch {
            queryId = room_id;
        }

        return db.collection('chatrooms').findOne({ _id: queryId })
            .then(room => {
                // If room is found, resolve the Promise with the room
                if (room) {
                    return room;
                } else {
                    // If no room is found, resolve the Promise with null
                    return null;
                }
            })
            .catch(err => {
                // If an error occurs, reject the Promise
                throw err;
            });
    });
};

Database.prototype.addRoom = function(room) {
    return this.connected.then(db => {
        if (!room.name) {
            return Promise.reject(new Error("Room name is required."));
        }

        return db.collection('chatrooms').insertOne(room)
            .then(result => {
                return db.collection('chatrooms').findOne({ _id: result.insertedId });
            })
            .catch(err => {
                throw err;
            });
    });
};
	


Database.prototype.getLastConversation = function(room_id, before = Date.now()) {
    return this.connected.then(db => {
        // Find the latest conversation for the given room_id before the specified timestamp
        return db.collection('conversations')
            .find({ room_id: room_id, timestamp: { $lt: before } })
            .sort({ timestamp: -1 }) // Ensure the results are sorted by timestamp in descending order
            .limit(1) // Only fetch the most recent conversation
            .toArray() // Convert the result to an array to easily handle the data
            .then(conversations => conversations[0] || null) // Return the first conversation or null if none found
            .catch(err => Promise.reject(err));
    });
};


Database.prototype.addConversation = function(conversation) {
    return this.connected.then(db => {
        // Validate conversation object
        if (!conversation.room_id || !conversation.timestamp || !conversation.messages) {
            return Promise.reject(new Error("All fields (room_id, timestamp, messages) must be provided."));
        }
        
        // Insert conversation document into the MongoDB conversations collection
        return db.collection('conversations').insertOne(conversation)
            .then(result => db.collection('conversations').findOne({ _id: result.insertedId }))
            .catch(err => Promise.reject(err));
    });
};


// A5 task 2
Database.prototype.getUser = function(username) {
    return this.connected.then(db => {
        // Use the db instance to query the 'users' collection for a document with the matching username
        return db.collection('users').findOne({ username: username })
            .then(user => {
                // If a user is found, resolve the Promise with the user document
                if (user) {
                    return user;
                } else {
                    // If no user is found, resolve the Promise with null
                    return null;
                }
            })
            .catch(err => {
                // If an error occurs, reject the Promise
                throw err;
            });
    });
};

module.exports = Database;