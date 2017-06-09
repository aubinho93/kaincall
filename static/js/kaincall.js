/***************************************/

$('.chat[data-chat=person2]').addClass('active-chat');
$('.person[data-chat=person2]').addClass('active');
$('.left .person').mousedown(function() {
    if ($(this).hasClass('.active')) {
        return false;
    }
    else {
        var findChat = $(this).attr('data-chat');
        var personName = $(this).find('.name').text();
        $('.right .top .name').html(personName);
        $('.chat').removeClass('active-chat');
        $('.left .person').removeClass('active');
        $(this).addClass('active');
        $('.chat[data-chat = ' + findChat + ']').addClass('active-chat');
    }
});




var quickFilter = function(srchInput, srchSel) {

    $(srchInput).on('change keyup paste mouseup', function() {
        var s = $(this).val();
        filter(s);
    });
    var filter = function(s) {
        $(srchSel).each(function() {
            var $this = $(this);
            var txt = $this.text();
            if (txt.toLowerCase().indexOf(s.toLowerCase()) < 0) {
                $this.hide();
            }
            else {
                $this.show();
            }
        });
    };
};
quickFilter('.lookingFor', '.person');

$('.search').on('click', function() {
    $('.wrap1, a').toggleClass('active');

    return false;
});






//Tout dom dabord
/*****************************************************************/
var ws = new WebSocket('wss://' + window.location.host);
var configuration;
var clientUA;
var onCall = false;
var maSession;
var sessionCaller;

//Gestion Appel
var sonInvitation = document.querySelector('#sonInvitation');
var sonArrierePlan = document.querySelector("#sonArrierePlan");
// var buttonLogin = document.querySelector("#login");
var buttonCall = document.querySelector('#call');
var remoteRender = document.querySelector("#remoteRender");
var localRender = document.querySelector("#localRender");

//Popoup Affichage
var afichAppel = document.querySelector("#affichAppel");
var sipURI = document.querySelector(".sipURI");
var calling = document.querySelector(".calling");
var hangUp = document.querySelector("#hangUp");
var hangDown = document.querySelector('#hangDown');
var videoContainer = document.querySelector('#renduVideo');
var activeChat = document.querySelector('.active-chat');
var buttRac = document.querySelector('.call-back1');

ws.addEventListener('open', function(e) {

    ws.addEventListener('message', function(e) {
        /**
         * @param data {Object} message reçu du serveur
         */
        var data = JSON.parse(e.data);

        //console.log(data);
        switch (data.statut) {

            case 'ENLIGNE':
                configuration = {
                    traceSip: true,
                    uri: data.sip,
                    wsServers: ['wss://edge.sip.onsip.com'],
                    displayName: data.displayName
                };

                /**enregistrement du client auprès de son serveur SIP****/
                clientUA = new SIP.UA(configuration);
                clientUA.register();

                //alert(clientUA);


                /*   maSession = makeCall(clientUA, 'lil@kaincall.onsip.com', true, true, remoteRender, localRender);
                               maSession.on('accepted', function() {
                                   alert('accepted');
                                   sonInvitation.pause();
                                   remoteRender.style.visibility = 'visible';
                                   localRender.style.visibility = 'visible';
                               });
                   
                  */


                /*****en mode test ici*****/
                clientUA.on('registered', function() {
                    buttonCall.addEventListener('click', () => {
                        if (onCall) {

                            onCall = false;
                            // buttonCall.firstChild.nodeValue = 'Appeler';
                            videoContainer.style.display = "block";
                            buttRac.addEventListener('click', () => {
                                videoContainer.style.display = "none";
                            });

                            sessionCaller.bye();
                            sessionCaller = null;

                        }
                        else {
                            onCall = true;
                            var noeudPseudo = document.querySelector('.active-chat');

                            var uriToCall = noeudPseudo.querySelector('.location').textContent;
                            alert(uriToCall);
                            maSession = makeCall(clientUA, uriToCall, true, true, remoteRender, localRender);
                            //  maSession = makeCall(clientUA, 'aubinho@sip.linphone.org', true, true, remoteRender, localRender);
                            maSession.on('accepted', function() {
                                sonInvitation.pause();
                                videoContainer.style.display = "block";
                                videoContainer.style.backgroundColor = "white";
                                buttRac.addEventListener('click', () => {
                                    maSession.bye();
                                    videoContainer.style.display = "none";
                                });

                                /*var aSupp = document.querySelector('.portfoliocard');
                                aSupp.style.visibility = 'hidden';
                            */
                            });


                            maSession.on('rejected', function(incomingSession, cause) {
                                maSession = null;
                                alert(cause);
                                sonInvitation.pause();
                                videoContainer.style.display = "none";
                                onCall = false;
                                incomingSession = null;
                            });

                            maSession.on('failled', function(incomingSession, cause) {
                                alert(cause);
                                sonInvitation.pause();
                                // buttonCall.firstChild.nodeValue = 'Appeler';
                                onCall = false;
                                maSession.cancel();
                                videoContainer.style.display = "none";
                                incomingSession = null;
                            });

                            maSession.on('terminated', (incomingSession, cause) => {

                                incomingSession = null;
                                videoContainer.style.display = "none";
                                onCall = false;
                            });

                            // buttonCall.firstChild.nodeValue = 'Racrocher';
                            videoContainer.style.display = 'block';
                            videoContainer.style.backgroundColor = "white";
                            maSession.on('bye', function() {
                                onCall = false;
                                videoContainer.style.display = 'none';
                                maSession = null;
                                //  maSession = null;
                            });
                        }
                    });


                    clientUA.on('invite', function(incommingSession) {
                        sonArrierePlan.play();
                        sessionCaller = incommingSession;
                        //jouer un son a l'invation
                        //if(affich==1){
                        afichAppel.style.display = 'table';
                        sipURI.appendChild(document.createTextNode(incommingSession.remoteIdentity.displayName));
                        calling.appendChild(document.createTextNode('calling...'));
                        // //}
                        // var options1 = mediaOptions(true, true, remoteRender, localRender);
                        // incommingSession.accept(options1);
                        //receptionAppel(incommingSession, remoteRender, localRender);

                        buttRac.addEventListener('click', () => {
                            incommingSession.bye();
                            onCall = false;
                        });


                        hangUp.addEventListener('click', () => {
                            //affich=1;
                            var options1 = mediaOptions(true, true, remoteRender, localRender);
                            incommingSession.accept(options1);
                            //receptionAppel(incommingSession, remoteRender, localRender);
                            sonArrierePlan.pause();
                            afichAppel.style.display = 'none';
                            sipURI.innerHTML = '';
                            calling.innerHTML = '';
                            // buttonCall.firstChild.nodeValue = 'Racrocher';
                            videoContainer.style.display = 'block';
                            videoContainer.style.backgroundColor = "white";
                            // buttRac.addEventListener('click', ()=>{
                            //   incommingSession.bye();
                            // });

                        });

                        hangDown.addEventListener('click', () => {
                            //affich=1;
                            sonArrierePlan.pause();
                            afichAppel.style.display = 'none';
                            sipURI.innerHTML = '';
                            calling.innerHTML = '';
                            incommingSession.reject();
                            incommingSession = null;
                        });
                        incommingSession.on('bye', function() {
                            onCall = false;
                            // buttonCall.firstChild.nodeValue = 'Appeler';

                            incommingSession = null;
                            videoContainer.style.display = "none";
                        });

                    });
                });



                /***fin mode test****/






                break;

            case 'CONFADD':
                alert('CONTACT AJOUTER AVEC SUCCES');
                break;

            case 'CONFDEL':
                window.location.reload();
                break;

            default:
                alert('Erreur lors de l\'interpretation du message');
        }
    });
});

//creation des options pour l'appel
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
/**fin creation options***/

//alert('test');

/****fonction pour les appels****/
function makeCall(userAgent, target, audio, video, remoteRender, localRender) {
    var options = mediaOptions(audio, video, remoteRender, localRender);
    var session = userAgent.invite('sip:' + target, options);
    sonInvitation.play();
    videoContainer.style.display = 'block';
    videoContainer.style.backgroundColor = "white";
    return session;

}
/**fin fonction creation session appel***/


/**fonction reception Appel***/
function receptionAppel(incomingSession, remoteRender, localRender) {
    clientUA.on('invite', function(incomingSession) {
        var options = mediaOptions(true, true, remoteRender, localRender);
        incomingSession.accept(options);
    });
}
/*******************************************************/

/***** Gestion de l'envoi du contact ******/
document.querySelector('#submitContact').addEventListener('click', function() {
    ws.send(JSON.stringify({
        action: 'ajoutContact',
        pseudo: document.querySelector('#nom').value,
        sip: document.querySelector('#sip').value,
        siteWeb: document.querySelector('#web').value,
        email: document.querySelector('#email').value,
        tel: document.querySelector('#telephone').value,
        cv: document.querySelector('#entreprise').value
    }));
    // var disp = document.querySelector("#popup1.overlay");
    //disp.style.display="none";
});

/***************************************/

/***** Gestion de suppression du contact ******/
document.querySelector('.remove').addEventListener('click', function() {
    ws.send(JSON.stringify({
        action: 'supprContact',
        pseudo: document.querySelector('.active-chat').getAttribute('data-chat')
    }));
    // var disp = document.querySelector("#popup1.overlay");
    //disp.style.display="none";
});
