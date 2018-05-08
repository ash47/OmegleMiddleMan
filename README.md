OmegleMiddleMan
===============

 - Lets you connect to two or more clients, then middle man the conversation, allowing you to intercept, change and even add new messages.

### Requirements / Setup
 - You need [Node.js](http://nodejs.org/)
 - Open the `install.bat` file, this file will install the required files to run the server
 - Run the `Run.bat` file, which will start the server
 - By default, it listens on port 3000, you can access the client by going to `localhost:3000` in your webbrower

### Onscreen options
 - At the top of the screen you will see `New Omegle Window`
 - Clicking these will add a new Omegle window, or a new Chat Helper window respectively
 - **Reroll:** This option will reconnect you if the stranger disconnects
 - **Moderated:** If selected, you will be connected to the moderated section of omegle, you need this selected if you wish to talk to no perverts
 - **Spy:** This check box will enable spy mode
 - **Ask:** If spy is selected, it will ask the question that is in the box next to the `send` button
 - **Use Likes:** This option will use the likes listed in the box at the bottom of the screen
 - **College:** This will search for college students, note: You need to setup your college settings, see the Adding prefereces section
 - **Any College:** If selected, it will search for people from any college, not jsut your own
 - **Video:** This will enable video mode
  - Use the console command `setCameraSize(width, height, fps, quality)` to change the settings. The default is `setCameraSize(320, 240, 24, 91)`

### How do I know if my message was delivered?
 - The icon to the left of a message will highlight green when you send a message
 - The highlight will be removed if it is successful
 - The highlight will turn red if the message fails to be delivered
 - You will likely also get an error message if something went wrong
 - The client tends to continue trying to deliver, unless something goes horribly wrong

### Auto greeting people
 - You can enter a message to auto send to people, or leave it blank if you don't want to send the message
 - By default, it will send `hi`

### Broadcasting into other windows
 - To enable this, you need to set `Auto Broadcast` to on.
 - At the bottom of the window are two fields `B` and `A`, `B` is short for Broadcast, `A` is short for Add Name.
 - If you tick a B box, it will broadcast into all the windows you tick, if you tick the green box, it will send back what ever the user types, to themselves
 - If you have Add Name ticked as well, it will prepend the name field to all messages
 - The order of the boxes is from left to right, the green boxes simply help you to see which window is which

### Dealing with spam bots
 - Introducing the blackhole
 - The blackhole will allow you to move onto a new chat, while keeping the old window active, so the bot will think you're still chatting to them
 - You can click the "blackhole" button, or use the "auto blackhole" feature at the top to cause certain messages to trigger an auto blackhole, most bots use the same language, pick a key word, or a whole line of their chat, and watch them get blackholed
 - You can add tags to the start of blackhole lines to change the behavior
   - The following modifiers can be added to all blackhole messages:
    - [first] Will only apply blackhole rule to the first message
    - [nospaces] Will remove all the spaces from the message before trying to perform the matching
   - You can pick one of the following moddifiers:
    - By default, with none of these modifiers, if the given line is contained in a string (ignoring case), it will cause the person to be blackholed
    - [exact] Will blackhole only if the exact phrase is matched (ignoring case)
    - [regex] Will apply the given regex, and block if the regex matches (ignoring case)
 - Remember to click "prevent auto disconnect" when using the auto blackhole functionality, otherwise you might lose someone you are talking to

### Ignoring Bots
 - The ignore bots options will attempt to ignore bots and phone users.
 - It will auto disconnect if they haven't started typing within 10 seconds
 - It will also disconnect if they send a message without typing first (aka, common bot behavior)

### Adding preferences
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

### Stopping your bot from connecting to itself
 - Add `noMultiRP` as an interest, If the bot finds someone with this interest, it will auto disconenct and move on

### Limited Search
 - By default, it will only try to build one omegle connection at a time. If you want to build as many connections as possible at a time, turn `limited searching` off at the top.

### Fix Searching
 - It's possible your client may sit on `Creating a connection` forever, if this happens, just hit the `Fix Searching` button

### Recapcha
 - This is currently broken, and not easy to fix -- You will see the recaptcha and it will tell you that localhost is not supported.
 - Simply go onto the real `omegle.com` website, click the recaptcha, and then you can continue to use this omegle client.

### Language Options?
 - Simply edit the langauge in the `settings.json` file to update the language options.

### Chat Helper
 - A chat helper lets you define a bunch of common messages that you plan to use over and over, and then broadcast them into a chat.

### What if I close the server by mistake?
- If you close the server while you are chatting with someone, simply open the server and the client will reconnect, none of their messages will be lost, it's possible messages you have sent while the server was down did not go through.

### Missing Features?
 - Currently there are no known missing features

### Credits
 - Original omegle client was taken from [here](https://github.com/CRogers/omegle), it no longer works as the protocol has mostly changed, and it has many bugs, I would do a pull request, except their code is written in coffee script, and I used javascript
