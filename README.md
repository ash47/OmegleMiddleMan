OmegleMiddleMan
===============

 - Lets you connect to two or more clients, then middle man the conversation, allowing you to intercept, change and even add new messages.
 - It also lets you connect to cleverbot. You can trick people into talk to cleverbot :)

###Requirements / Setup###
 - You need [Node.js](http://nodejs.org/)
 - Open a command window, navigate to the root directory
  - Type "npm install" without quotes, this will install all the modules required to run the server
 - Run the .batch file (it just runs node app.js), which will start the server
 - By default, it listens on port 3000, you can access the client by going to `localhost:3000` in your webbrower

###Onscreen options###
 - At the top of the screen you will see `New Omegle Window` and `New Cleverbot Window`
 - Clicking these will add a new Omegle window, or a new Cleverbot window respectively
 - Most of the search options will be displayed on both the omegle and cleverbot windows, however most only work with omegle.
 - **Reroll:** This option will reconnect you if the stranger disconnects
 - **Moderated:** If selected, you will be connected to the moderated section of omegle, you need this selected if you wish to talk to no perverts
 - **Spy:** This check box will enable spy mode
 - **Ask:** If spy is selected, it will ask the question that is in the box next to the `send` button
 - **Use Likes:** This option will use the likes listed in the box at the bottom of the screen
 - **College:** This will search for college students, note: You need to setup your college settings, see the Adding prefereces section
 - **Any College:** If selected, it will search for people from any college, not jsut your own
 - **Video:** This will enable video mode
 - **Delayed:** If selected, a random delay will be added to cleverbot's response, this is so people don't think it's a bot

###Auto greeting people###
 - You can enter a message to auto send to people, or leave it blank if you don't want to send the message
 - By default, it will send `hi`

### Broadcasting into other windows
 - At the bottom of the window are two fields `B` and `A`, `B` is short for Broadcast, `A` is short for Add Name.
 - If you tick a B box, it will broadcast into all the windows you tick, if you tick the green box, it will send back what ever the user types, to themselves
 - If you have Add Name ticked as well, it will prepend the name field to all messages
 - The order of the boxes is from left to right, the green boxes simply help you to see which window is which

###Adding preferences###
 - Navigate to `static/js` and copy the `settings_example.js` and call it `settings.js`
 - Here you can fill in the default topics to search for
 - You can add your college settings to search for colleges
 - `bonusParams` will send extra params to the omegle server, kind of pointless since this client supports all of them
 - To find your college auth settings
  - Auth yourself on the omegle website
  - Open your cookies, then find omegles cookies
  - Find the `college` cookie
  - It will be in the following form: `%5B%22<college>%22%2C%20%22<a>%3A<b>%22%5D`
  - `<college>` goes into the college tag
  - `<a>:<b>` goes into the college_auth tag

###Stopping your bot from connecting to itself###
 - Add `noMultiRP` as an interest, If the bot finds someone with this interest, it will auto disconenct and move on

###Fix Searching###
 - It's possible your client may sit on `Creating a connection` forever, if this happens, just hit the `Fix Searching` button

###Recapcha###
 - It's possible your bot will be required to answer capchas due to spam
 - When the capcha image appears, simply enter the answer into the chat box, and hit send / press enter, if you are correct, it will find you a new stranger, if you fail, you will get a new capcha
