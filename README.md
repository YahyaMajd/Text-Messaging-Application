# README 
# Real-Time Chat Application

## Overview
This project is a full-featured web application that allows users to create profiles and participate in live chat rooms. The application utilizes modern web technologies and design patterns to provide a seamless user experience with real-time communication capabilities.

## Features

- **User Profiles:**
  - Users can create and manage their own profiles.
  - Profiles include basic user information and a profile picture.

- **Live Chat Rooms:**
  - Users can create and join chat rooms.
  - Real-time messaging is enabled through AJAX requests and WebSocket communication for instant updates.

- **Dynamic Client-Side Rendering:**
  - Utilizes the Model-View-Controller (MVC) pattern for efficient client-side rendering of chat and profile pages.

- **Database Integration:**
  - A MongoDB database is used to store and manage chat messages, user profiles, and room information.
  - Collections for users, chat rooms, and messages ensure efficient data storage and retrieval.

- **Data Access Object (DAO) Layer:**
  - Implements a robust DAO layer for interacting with the database.
  - Supports reading and writing conversations and user information securely.

- **User Authentication & Authorization:**
  - Comprehensive authentication system with secure login and registration.
  - Authorization mechanisms ensure that users can only access their own profiles and chat rooms.

- **Security:**
  - Protection against Cross-Site Scripting (XSS) attacks by sanitizing user inputs and messages.

- **Advanced Features:**
  - Integrated a locally hosted language AI model to provide advanced autocorrect features for users during chat sessions.

- **Server-Side Implementation:**
  - Node.js server with RESTful API endpoints for profile creation, messaging, and room management.
  - Efficiently handles HTTP requests and WebSocket connections for real-time communication.

## Technologies Used

- **Frontend:**
  - HTML, CSS, JavaScript for the client-side interface.
  - AJAX and WebSocket for asynchronous data transfer and live updates.

- **Backend:**
  - Node.js for server-side logic and handling API requests.
  - Express.js framework for creating RESTful API endpoints.

- **Database:**
  - MongoDB for storing user profiles, chat messages, and room information.

- **Security:**
  - Input sanitization and XSS protection for safe user interactions.

- **AI Integration:**
  - Language AI model for autocorrect functionality hosted locally on the server.

## Getting Started

### Prerequisites
- **Node.js** and **npm** installed on your machine.
- **MongoDB** instance running locally or on a cloud service.
- **Python** environment (if using a language AI model).


##Dependencies required

"@langchain/community": "^0.0.43",
     	"ollama": "^0.5.0"

### Detailed AI AutoCorrecter Setup Tutorial 
To set this up one needs to do the following :
1 - Download the Ollama AI from their website and complete its installation
2- run 'ollama pull mistral' in their CLI for Ollama to pull the manifest used to run 'Mistral 7B'
3-  then to add the dependencies required, one should run:
		- 'npm i ollama' to download the Ollama dependency
		- 'npm install @langchain/community' to download the LangChain dependency

After following these steps, one should be able to use the new feature.
