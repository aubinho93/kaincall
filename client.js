var URL = window.URL || window.webkitURL;

//Pour l'initialisation de cookie
function getCookie(key) {
    var re = new RegExp("(?:(?:^|.*;\s*) ?" + key + "\s*\=\s*([^;]*).*$)|^.*$");
    return document.cookie.replace(re, "$1");

}

//Pour la génération d'un jeton afin d'avoir une unique session
//à enregistrer dans le cookie
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i)
        result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

//On génère un nouveau jeton avec la clé "kaincallToken" s'il n'existe pas
//et on le stock dans le cookie 
var token = getCookie('kaincallToken');
if (token === '') {
    token = randomString(32, ['0123456789',
                              'abcdefghijklmnopqrstuvwxyz',
                              'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].join(''));
    var d = new Date();
    d.setTime(d.getTime() + 1000*60*60*24); // expire en 1 jour
    document.cookie = ('kaincallToken=' + token + ';'
                       + 'expires=' + d.toUTCString() + ';');
}

//Définition du domaine et d'un exemple d'user
var domain = 'kaincall.onsip.com';
var user1URI      = 'jalil.' + window.token + '@' + domain;
var user1Name     = 'Jalil';

var user2URI      = ''
var user2Name       = 'aubain';

// Fonction: mediaOptions
//La fonction permet de retourner les media utilisé (audio-video) et un tag video
//correspondant à l'un ou l'autre des users
function mediaOptions(audio, video, remoteRender, localRender) {
    return {
        media: {
            constraints: {
                audio: audio,
                video: video
            },
            render: {
                remote: remoteRender,
                local: localRender
            }
        }
    };
}

// Fonction: createUA
//   Crée un user agent en passant en paramètre les informations sur 
//   configuration. Ceci est un standard user agent pour les appels WebRTC
function createUA(callerURI, displayName) {
    var configuration = {
        traceSip: true,
        uri: callerURI,
        wsServers: ['wss://edge.sip.onsip.com'],
        displayName: displayName
    };
    var userAgent = new SIP.UA(configuration);
    return userAgent;
}

// Fonction: makeCall
//   Fait un appel du user agent a un URI cible
//
// Arguments:
//   userAgent: le user agent qui fait l'appel vers
//   target: l'URI cible
//   audio: utilisation ou non de l'audio dans une session SIP WebRTC
//   audio: utilisation ou non de la vidéo dans une session SIP WebRTC
//   remoteRender: Le tag vidéo pour y afficher la vidéo distante de l'appelé. Peut être nul
//   localRender: le tag vidéo pour y afficher la vidéo locale de l'appelant. Peut être nul
function makeCall(userAgent, target, audio, video, remoteRender, localRender) {
    var options = mediaOptions(audio, video, remoteRender, localRender);
    // makes the call
    var session = userAgent.invite('sip:' + target, options);
    return session;
}

// Fonction: setUpVideoInterface
//   Paramétrage d'un bouton pour lancer ou racrocher un appel
//
// Arguments:
//   userAgent: le user agent qui fait l'appel vers
//   target: l'URI cible avec le boutton appel et racroche
//   remoteRender: Le tag vidéo pour y afficher la vidéo distante de l'appelé
//                   Peut être nul
//   button: paramétrage du bouton
function setUpVideoInterface(userAgent, target, remoteRender, button) {
    // true si le bouton est initialisé sur appel,
    // false si le bouton est initialisé sur fin d'appel
    var onCall = false;
    var session;
    var remoteRend = document.getElementById(remoteRender);
    var boutton = document.getElementById(button);

    // Gestionnaire d'invitation d'appel.
    // Accept d'invitation en switchant sur le mode hang Up si l'on desire racrocher
    //En fonction de l'un ou l'autre on ouvre une session ou on la ferme
    userAgent.on('invite', function (incomingSession) {
        onCall = true;
        session = incomingSession;
        var options = mediaOptions(true, true, remoteRend, null);
        boutton.firstChild.nodeValue = 'hang up';
        remoteRend.style.visibility = 'visible';
        session.accept(options);
        session.on('bye', function () {
            onCall = false;
            boutton.firstChild.nodeValue = 'video';
            remoteRend.style.visibility = 'hidden';
            session = null;
        });
    });
    // Gestionnaire d'éènements avec le bouton
    // Pour une requête "bye" ou lorsqu'on click sur le boutton hangUp.
    boutton.addEventListener('click', function () {
        // Au depart on emet un appel, donc en appuyant sur hangUp on ferme la session 
        if (onCall) {
            onCall = false;
            boutton.firstChild.nodeValue = 'video';
            remoteRend.style.visibility = 'hidden';
            session.bye();
            session = null;
        }
        // Ou on vien d'appuyer sur video pour émettre un appel
        else {
            onCall = true;
            boutton.firstChild.nodeValue = 'hang up';
            remoteRend.style.visibility = 'visible';
            session = makeCall(userAgent, target,
                               true, true,
                               remoteRend, null);
            session.on('bye', function () {
                onCall = false;
                boutton.firstChild.nodeValue = 'video';
                remoteRend.style.visibility = 'hidden';
                session = null;
            });
        }
    });
}

// Fonction: createDataUA
//   Crée un user agent avec les données paramétré. Ce user agent est seulement
//pour l'envoi des données, ainsi on utilise un gestionnaire special à savoir
//   RTCDataChannel.
//
// Arguments:
//   callerURI: L'URI de l'appelant, alias, l'URI qui appartient à cet utilisateur.
//   displayName: nom que nous voulons afficher
function createDataUA(callerURI, displayName) {
    var dataURI = 'data.' + callerURI;
    var configuration = {
        traceSip: true,
        uri: dataURI,
        wsServers: ['wss://edge.sip.onsip.com'],
        displayName: displayName,
        /*
         * Custom media handler factories don't have great compatibility with
         * our WebRTC function caching (like SIP.WebRTC.RTCPeerConnection)
         */
        mediaHandlerFactory: function mediaHandlerFactory(session, options) {
            // Appel avec ces carac
            // - WebRTC.MediaStream
            // - WebRTC.getUserMedia
            // - WebRTC.RTCPeerConnection
            // - WebRTC.RTCSessionDescription.
            SIP.WebRTC.isSupported();
            /* Comme par defaut avec mediaHandler, mais pas de stream à gérer */
            var self = new SIP.WebRTC.MediaHandler(session, {
                mediaStreamManager: {
                    acquire: function (mediaHint) {
                        return SIP.Utils.Promise.resolve([]);
                    },
                    release: function (stream) {
                        // no-op
                    }
                }
            });

            return self;
        }
    };

    return new SIP.UA(configuration);
}

(function () {
if (SIP.WebRTC.isSupported()) {
    // Maintenant on fait SIP.js
    window.userUA = createUA(userURI, userName);
    window.bobUA   = createUA(bobURI, bobName);
    window.userDataUA = createDataUA(userURI, userName);
    window.bobDataUA = createDataUA(bobURI, bobName);

    // On lance la vidéo que si tous les users peuvent s'enregister
    var numToRegister = 4;
    var numRegistered = 0;
    var registrationFailed = false;
    var markAsRegistered = function () {
        numRegistered += 1;
        if (numRegistered >= numToRegister && !registrationFailed) {
            setupInterfaces();
        }
    };
    var failRegistration = function () {
        registrationFailed = true;
        failInterfaceSetup();
    };
    
    window.userUA.on('registered', markAsRegistered);
    window.bobUA.on('registered', markAsRegistered);
    window.userDataUA.on('registered', markAsRegistered);
    window.bobDataUA.on('registered', markAsRegistered);
    // Si l'enregistrement echoue, alors on n'abandonne l'appel et donne les
    // user qu'on ne peut pas enregistrer.
    window.userUA.on('registrationFailed', failRegistration);
    window.bobUA.on('registrationFailed', failRegistration);
    window.userDataUA.on('registrationFailed', failRegistration);
    window.bobDataUA.on('registrationFailed', failRegistration);

    // Désenregistre tout user agents et termine toutes session active lorsque
    // la fenêtre est fermée ou lorsque nous navigons hors de la page
    window.onunload = function () {
        userUA.stop();
        bobUA.stop();
        userDataUA.stop();
        bobDataUA.stop();
    };

    // On lance la vidéo si seulement on peut enregistrer l'user
    function setupInterfaces() {
        setUpVideoInterface(userUA, bobURI, 'video-of-bob', 'user-video-button');
        setUpVideoInterface(bobUA, userURI, 'video-of-user', 'bob-video-button');
        
    }
    function failInterfaceSetup() {
        alert('Max registration limit hit. Could not register all user agents, so they cannot communicate. The app is disabled.');
    }
}
})();



/*(function () {
    var button = document.querySelector('button.file-choose-button');
    var fileInputs = document.querySelectorAll('input.file-choose-button');
    var width = button.style.width;
    var height = button.style.height;
    var paddingLeft = button.style.paddingLeft;
    var paddingRight = button.style.paddingRight;
    var paddingTop = button.style.paddingTop;
    var paddingBottom = button.style.paddingBottom;

    for (var i=0; i < fileInputs.length; i++) {
        var input = fileInputs[i];
        input.style.width = width;
        input.style.height = height;
        input.style.paddingLeft = paddingLeft;
        input.style.paddingRight = paddingRight;
        input.style.paddingTop = paddingTop;
        input.style.paddingBottom = paddingBottom;
    }
})();*/