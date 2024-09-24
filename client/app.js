/////// PROVIDED FUNCTIONS /////////////
// Removes the contents of the given DOM element (equivalent to elem.innerHTML = '' but faster)
function emptyDOM (elem){
    while (elem.firstChild) elem.removeChild(elem.firstChild);
}

// Creates a DOM element from the given HTML string
function createDOM (htmlString){
    let template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

////////// OUR CODE ////////////
profile = { username: "Alice_Beforecall" };

// store functions you can call to make different requests to the server.
var Service = {};
// add an origin property to the Service object to store the server's URL
Service.origin = window.location.origin;

// A5
Service.getProfile = function() {
    return fetch(this.origin + '/profile')
        .then(response => {
            if (!response.ok) {
                // Attempt to parse error message from server response
                return response.text().then(text => {
                    return Promise.reject(new Error(text || 'Server-side error during getProfile'))
                });
            }
            return response.json();
        })
        .catch(error => {
            throw error;
        });
    
};

// function within the Service object to make the AJAX request
Service.getAllRooms = function() {
    return fetch(this.origin + "/chat")
        .then(response => {
            if (!response.ok) {
                // Attempt to parse error message from server response
                return response.text().then(text => {
                    return Promise.reject(new Error(text || 'Server-side error during getAllRooms'))
                });
            }
            return response.json();
        })
        .catch(error => {
            throw error;
        });
        
};

// Add the addRoom function to the Service object
Service.addRoom = function(data) {
    return fetch(this.origin + "/chat", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            // Attempt to parse error message from server response
            return response.text().then(text => {
                return Promise.reject(new Error(text || 'Server-side error during addRoom'))
            });
        }
        return response.json();
    })
    .catch(error => {
        throw error;
    });
    
};

// A4 
function* makeConversationLoader(room) {
    var stamp = room.timestamp;
    while (room.canLoadConversation) {
        room.canLoadConversation = false; 
        yield Service.getLastConversation(room.id, stamp)
            .then(conversation => {
                if (!conversation) {
                    room.canLoadConversation = false;
                    return null; // Stop iteration by resolving to null if no conversation is returned.
                } else {
                    room.canLoadConversation = true; // Enable further loading.
                    stamp = conversation.timestamp; // Update the timestamp for the next query.
                    room.addConversation(conversation); // Add the fetched conversation.
                    return conversation; // Continue iteration with the fetched conversation.
                }
            })
            .catch(error => {
                console.error("Failed to load conversation:", error);
                room.canLoadConversation = false; // Ensure no further attempt to load on error.
                return null; // Resolve the promise with null to handle the error.
            });
    }
}


// Add the getLastConversation function to the Service object
Service.getLastConversation = function(roomId, before) {
    return fetch(`${this.origin}/chat/${roomId}/messages?before=${encodeURIComponent(before)}`, {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) {
            // Attempt to parse error message from server response
            return response.text().then(text => {
                return Promise.reject(new Error(text || 'Server-side error during getLastConversation'));
            });
        }
        return response.json();
    })
    .catch(error => {
        throw error;
    });
};

//////// AI FUNCTION ////////////
// Add a new function to the Service object
Service.autocorrectText = function(text) {
    return fetch(this.origin + "/autocorrect", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => Promise.reject(new Error(text || 'Server-side error during autocorrect')));
        }
        return response.json();
    })
    .then(data => data.correctedText) // Assuming the server responds with { correctedText: '...' }
    .catch(error => {
        throw error;
    });
};


class LobbyView {
    constructor(lobby) {
        this.elem = createDOM(`<div class="content">
            <ul class="room-list">
                <!-- Chat rooms will be dynamically added here -->
            </ul>
            <div class="page-control">
                <input type="text" placeholder="Enter new room name">
                <button>Create Room</button>
            </div>
        </div>`);

        this.lobby = lobby;
        this.listElem = this.elem.querySelector('.room-list')
        this.inputElem = this.elem.querySelector('div.page-control input')
        this.buttonElem = this.elem.querySelector('div.page-control button')

        
        this.buttonElem.addEventListener('click', () => {
            const roomName = this.inputElem.value.trim();
            if (roomName) {
                const roomData = { name: roomName, image: 'assets/everyone-icon.png' };
                Service.addRoom(roomData).then(room => {
                    console.log('Room created:', room);
                    // Use room._id here to update the lobby state and UI correctly
                    this.lobby.addRoom(room._id, room.name, room.image, room.messages || []);
                    this.redrawList(); // Refresh the room list in the UI
                }).catch(error => {
                    console.error('Error creating room:', error);
                });
                this.inputElem.value = ''; // Clear the input field
            } else {
                console.log('Room name cannot be empty');
            }
        });
        

        
        // Call this function whenever the lobby object changes
        this.lobby.onNewRoom = (room) => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.setAttribute('href', `/#/chat/${room.id}`);
            link.textContent = room.name;
            listItem.appendChild(link);
            this.roomList.appendChild(listItem);
        }
        
        this.roomList = this.elem.querySelector('.room-list');

        this.redrawList(); // Call this to initially populate the list
    }

    redrawList() {
        // Clear the existing list
        emptyDOM(this.roomList);

        // Dynamically add rooms to the list
        for (const roomId in this.lobby.rooms) {
            const room = this.lobby.rooms[roomId];
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.setAttribute('href', `/#/chat/${roomId}`);
            link.textContent = room.name;
            listItem.appendChild(link);
            this.roomList.appendChild(listItem);
        }
    }
}
class ChatView {
    constructor(socket) {
    //     this.elem = createDOM(`<div class="content">
    //     <h4 class="room-name">Chat Room Name</h4>
    //     <div class="message-list">
            
    //     </div>
    //     <div class="page-control">
    //         <textarea placeholder="Type your message here..."></textarea>
    //         <button>Send Message</button>
    //     </div>
    // </div>`);
            this.elem = createDOM(`<div class="content">
            <h4 class="room-name">Chat Room Name</h4>
            <div class="message-list">
                <!-- Messages will appear here -->
            </div>
            <div class="page-control">
                <textarea placeholder="Type your message here..."></textarea>
                <button class="send-btn">Send Message</button>
                <button class="correct-btn">Correct Message</button>
            </div>
        </div>`);

        this.titleElem = this.elem.querySelector('h4.room-name');
        this.chatElem = this.elem.querySelector('.message-list');
        this.inputElem = this.elem.querySelector('.page-control textarea');
        this.buttonElem = this.elem.querySelector('.page-control button');
        // Add Correct Button
        this.correctButtonElem = this.elem.querySelector('.correct-btn'); 
        this.room = null;
        this.socket = socket;
        
         // A4 TASK5
        // Attach a wheel event listener to trigger loading of more conversations
        this.chatElem.addEventListener('wheel', (event) => {
            if (this.chatElem.scrollTop === 0 && event.deltaY < 0 && this.room.canLoadConversation) {
                this.room.getLastConversation.next();
            }
        });
        
       
        // Add a click event handler to the button element
        this.buttonElem.addEventListener('click', () => {
            this.sendMessage();
        });

        // Add a keyup event handler to the input element
        this.inputElem.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                this.sendMessage();
            }
        });
        

        // Correct Button Event Listener
        this.correctButtonElem.addEventListener('click', async () => { // Add 'async' here
            const messageText = this.inputElem.value.trim();
            if (messageText) {
                // Provide visual feedback that correction is in progress
                this.correctButtonElem.textContent = 'Correcting...';
                this.correctButtonElem.disabled = true; // Disable the button while processing

                await this.autocorrectMessage(); // Use 'await' to wait for the correction to finish

                // Restore button state after processing is complete
                this.correctButtonElem.textContent = 'Correct Message';
                this.correctButtonElem.disabled = false;
            }
        });

    }
    //// AI FEATURE
    autocorrectMessage() {
        const text = this.inputElem.value.trim();
        if (text) {
            return Service.autocorrectText(text) // Return the promise here
                .then(correctedText => {
                    this.inputElem.value = correctedText; // Update input field with corrected text
                }).catch(error => {
                    console.error('Error autocorrecting message:', error);
                });
        }
    }
   
    sendMessage() {
        // Read text value
        const text = this.inputElem.value.trim();
        // Call the addMessage method
        if (text) {
            this.room.addMessage(profile.username, text);
        }

        // Send the message to the server using the this.socket object
        if (text) {
            // Prepare the message object
            const messageObject = {
                roomId: this.room.id,
                username: profile.username,
                text: text
            };
            this.socket.send(JSON.stringify(messageObject));
        }

        // Clear the text value
        this.inputElem.value = '';
    }


    setRoom(room) {
        this.room = room;
        // Update room name
        this.titleElem.textContent = room.name;

        // Clear existing messages
        emptyDOM (this.chatElem);

        // Populate with new messages
        room.messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            if (message.username === profile.username) {
                messageDiv.classList.add('my-message');
            }

            const usernameSpan = document.createElement('span');
            usernameSpan.classList.add('message-user');
            usernameSpan.textContent = `${message.username}`;
            
            const textSpan = document.createElement('span');
            textSpan.classList.add('message-text');
            textSpan.textContent = message.text;

            messageDiv.appendChild(usernameSpan);
            messageDiv.appendChild(textSpan);
            this.chatElem.appendChild(messageDiv);
        });

        // Add a new message box on chatElem element
        // This methed is called by sendMessage()
        this.room.onNewMessage = (message) => {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            if (message.username === profile.username) {
                messageDiv.classList.add('my-message');
            }
    
            const usernameSpan = document.createElement('span');
            usernameSpan.classList.add('message-user');
            usernameSpan.textContent = `${message.username}: `;
    
            const textSpan = document.createElement('span');
            textSpan.classList.add('message-text');
            textSpan.textContent = message.text;
    
            messageDiv.appendChild(usernameSpan);
            messageDiv.appendChild(textSpan);
            this.chatElem.appendChild(messageDiv);
        };
        
        //A4 TASK5
        // Define onFetchConversation callback
        this.room.onFetchConversation = (conversation) => {
            const beforeHeight = this.chatElem.scrollHeight;
            // Iterate over the messages array in reverse order
            for (let i = conversation.messages.length - 1; i >= 0; i--) {
                const message = conversation.messages[i];
                const messageDiv = this.createMessageDiv(message);
                this.chatElem.insertBefore(messageDiv, this.chatElem.firstChild); // Insert at the beginning
            }
        
            const afterHeight = this.chatElem.scrollHeight;
            this.chatElem.scrollTop = (afterHeight - beforeHeight); // Adjust scroll position to maintain the viewing area
        };
        
        
    }

    // A4 TASK5
    createMessageDiv(message) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        if (message.username === profile.username) {
            messageDiv.classList.add('my-message');
        }

        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('message-user');
        usernameSpan.textContent = `${message.username}: `;

        const textSpan = document.createElement('span');
        textSpan.classList.add('message-text');
        textSpan.textContent = message.text;

        messageDiv.appendChild(usernameSpan);
        messageDiv.appendChild(textSpan);
        return messageDiv;
    }

}


class ProfileView {
    constructor() {
        this.elem = (`<div class="content">
            <div class="profile-form">
                <!-- Form Fields will be dynamically added here -->
            </div>
            <div class="page-control">
                <button>Save Changes</button>
            </div>
        </div>`);

        this.profileForm = this.elem.querySelector('.profile-form');
        this.pageControl = this.elem.querySelector('.page-control');

        // Dynamically create and add form fields
        this.addFormField('Username', 'username', 'text');
        this.addFormField('Email', 'email', 'email');
        // Add more form fields as needed
    }

    addFormField(labelText, inputId, inputType) {
        const formField = document.createElement('div');
        formField.classList.add('form-field');

        const label = document.createElement('label');
        label.setAttribute('for', inputId);
        label.textContent = labelText;

        const input = document.createElement('input');
        input.setAttribute('type', inputType);
        input.setAttribute('id', inputId);
        input.setAttribute('name', inputId);

        formField.appendChild(label);
        formField.appendChild(input);
        this.profileForm.appendChild(formField);
    }
}




class Room {
    constructor(id, name, image = 'assets/everyone-icon.png', messages = []) {
        this.id = id;
        this.name = name;
        this.image = image;
        this.messages = messages;
        this.timestamp = Date.now();
        this.canLoadConversation = true; // Initialize canLoadConversation flag
        this.getLastConversation = makeConversationLoader(this); // Create a Generator instance
    }
    // A4 TASK5
    addConversation(conversation) {
        // Insert the given messages at the beginning of the Room.messages array in chronological order
        this.messages = [...conversation.messages, ...this.messages];

        // Call the onFetchConversation callback, if defined
        if (this.onFetchConversation) {
            this.onFetchConversation(conversation);
        }
    }
    addMessage(username, text) {
        if (!text.trim()) return; // If text is empty or contains only whitespace, return
        const message = { username, text };
        this.messages.push(message);

        //8B
        if (this.onNewMessage) {
            this.onNewMessage(message);
        }
    }
}

class Lobby {
    constructor() {
        this.rooms = {};
    }

    getRoom(roomId) {
        return this.rooms[roomId];
    }

    addRoom(id, name, image, messages) {
        this.rooms[id] = new Room(id, name, image, messages);

        if (this.onNewRoom) {
            // Call the function, passing the newly created Room object as the argument
            this.onNewRoom(this.rooms[id]);
        }
    }
}
//A5 T8
function sanitizeMessage(message) {
    message = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    message = message.replace(/<\s*button\s+.*?(?=\s+)(?=(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*?\s+onclick\s*=\s*(?:'|").*?(?:'|"))[^>]*>/gi, '<button>');
    message = message.replace(/<\s*([^>]*?\s)?[^>]*?(on\w+)\s*=\s*['"][^'"]*['"][^>]*?>/gi, '<$1>');
    return message
}

function main() {
    //A3-4 Websocket
    const socket = new WebSocket('ws://localhost:8000'); 
    socket.addEventListener('message', function (message) {
        const parsedMessage = JSON.parse(message.data);
        const room = lobby.getRoom(parsedMessage.roomId);
        const sanitizedText = sanitizeMessage(parsedMessage.text);
        // Check if the room exists
        if (room) {
            // Add the message to the Room object using Room.addMessage method
            room.addMessage(parsedMessage.username, sanitizedText);
            console.log('Message added to room:', parsedMessage);
        } else {
            console.warn('Room not found:', parsedMessage.roomId);
        }
    });



    //6A.create a Lobby object and assign it to the variable lobby
    const lobby = new Lobby();

    //Instantiate the view objects
    const lobbyView = new LobbyView(lobby);
    const chatView = new ChatView(socket);
    const profileView = new ProfileView();
    Service.getProfile().then(prof => {profile.username = prof.username})

    function refreshLobby() {
        Service.getAllRooms().then(roomsArray => {
            roomsArray.forEach(room => {
                if (!lobby.rooms[room._id]) { // Use room._id instead of room.id
                    // Add new room
                    lobby.addRoom(room._id, room.name, room.image, room.messages);
                }
            });
            lobbyView.redrawList(); // Update the UI with new room list
        }).catch(error => {
            console.error('Error fetching rooms:', error);
        });
    }

    

    function renderRoute() {
        console.log('Rendering route...');
        const hash = window.location.hash.substring(2); // Remove '#' from hash
        const parts = hash.split('/');
        const route = parts[0]; // Get the first part of the route
    
        const pageView = document.getElementById('page-view');
        if (!pageView) {
            console.log('page-view element not found');
            return;
        }
        

        // Debug log for route
        console.log('Route:', route);
    
        switch(route) {
            case '':
                console.log('Rendering Lobby Page');
                emptyDOM(pageView);
                pageView.appendChild(lobbyView.elem);
                break;
            case 'chat':
                console.log('Rendering Chat Page');
                emptyDOM(pageView);
                pageView.appendChild(chatView.elem);
                const roomId=parts[1];
                let room = lobby.getRoom(roomId);
                if (room !== null && room !== undefined) {
                    chatView.setRoom(room);
                } else {
                    throw {
                    message: 'Room ID invalid'
                    }
                }
                break;
            case 'profile':
                console.log('Rendering Profile Page');
                emptyDOM(pageView)
                pageView.appendChild(profileView.elem)
                break;
            default:
                console.log('Rendering 404 Page');
                pageView.innerHTML = '<div class="content">Page Not Found</div>';
        }
    }
    

    
    window.addEventListener('hashchange', renderRoute);
    window.addEventListener('popstate', renderRoute);
    window.addEventListener('load', () => {
        main();
        refreshLobby(); // Refresh the lobby once on load
    });
    
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        const originalHref = link.getAttribute('href');
        if (originalHref && !originalHref.startsWith('#')) {
            link.setAttribute('href', `#${originalHref}`);
        }
    });

    setInterval(refreshLobby, 30000); // Refresh every 30 seconds

    renderRoute();
    cpen322.export(arguments.callee, { renderRoute,lobbyView,chatView,profileView,lobby,refreshLobby,socket});
}

window.addEventListener('load', main);