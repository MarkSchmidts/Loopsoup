## loopsoup ~ Webrecording for me and you
### Preamble
We wanna make the web rock. Therefor I started writing a Looper running on web technologies such as Web Audio API, AngularJS, Bootstrap & PaperJS.

The aim is to have a looper application ready to run on all plattforms. May it be with your cell on the stage or your Mac jamming away with your friends in the studio. Loopsoup gives you an easy interface to build loops and create sounds on the fly.

Plug your guitar or get your mic ready and try it: [loopsoup.org/try](https://loopsoup.org/try)

This is an open source initiate. Let's work together and make this work real tight.

### Geting started
Download dependencies with
```
npm i
```

And start the https server with
```
node server
```

### Details on the file structure
* The root directory formost contains the https server and a certificate. Serving the application via https is necessary to provide the right security level for the Web Audio API.
* The `app` folder contains all necessary static (not vendor) resources which will be served with the web server.
* `app/js/ls.recorder` is a rework of [Matt Diamond's recorder.js](https://github.com/mattdiamond/Recorderjs) aiming to get more sample precise recording.