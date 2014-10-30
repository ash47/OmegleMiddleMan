OmegleMiddleMan
===============

Lets you connect to two clients, then middle man the conversation, allowing you to intercept, change and even add new messages.

###Requirements / Setup###
 - You need [Node.js](http://nodejs.org/)
 - Open a command window, navigate to the root directory
  - Type "npm install" without quotes, this will install all the modules required to run the server
 - Run the .batch file (it just runs node app.js), which will start the server
 - By default, it listens on port 3000, you can access the client by going to `localhost:3000` in your webbrower

###Fix Searching###
 - It's possible your client may sit on `Creating a connection` forever, if this happens, just hit the `Fix Searching` button
