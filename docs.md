
# Documentation 

## User Manual 
All the user needs to do is type their desired message and click the 'Correct Message' button and wait for the AI suggestion.

### Design and Implementation
A REST API endpoint is create on the server side and is invoked by the event listener for when the user clicks on the 'Correct Message' button. This endpoint makes a call to the Ollama API running the 'Mistral 7B' model with a prompt explaining what we need it to do. The endpoint then returns the text suggestion and the client-side code replaces it with the current message. We chose Ollama as it can be run easily using the LangChain framework in NodeJS. The 'Mistral 7B' model proved to work better than the default 'llama2' model, perhaps as it is a better chat-related model. 
