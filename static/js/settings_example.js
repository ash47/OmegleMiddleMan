// Settings
omegleSettings = {
    // Default topics
    defaultTopics: [
        'noMultiRP ',   // This topic will cause the bots to disconnect if they connect to each other
        'rp',
        'roleplay'
    ].join(),

    // The default message to send to people
    defaultMessage: 'Please make a copy of static/js/settings_example.js, and call it static/js/settings.js',

    // Extra params to add
    bonusParams: {
    },

    // Turn reroll on by default
    reroll: true,

    // Turn moderated on by default
    moderated: true,

    // Turn spy mode on by default
    spy: false,

    // Turn ask question on by default
    ask: false,

    // Turn use likes on by default
    likes: true,

    // Turn use college on by default
    useCollege: false,

    // Turn use any college on by default
    anyCollge: true,

    // Turn video mode on by default
    video: false,

    // Should cleverbot have a delay
    delayed: true,

    // Max number of common interests
    maxCommonInterests: null,

    // The max amount of time we will wait for them to start typing
    maxWaitType: 15,

    // The max amount of time we will wait for them to send the first message
    maxWaitMessage: 45,

    // This will auto disconnect if someone speaks within 3 seconds and didn't send a "typing" command
    // This kind of thing is very common for bots, but, you also get it for some phone apps
    agressiveBotIgnore: false,

    // College stuff
    // college: '',
    // college_auth: '',
}
