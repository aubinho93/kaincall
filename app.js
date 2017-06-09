/**
 * Module: TER
 * 
 * @project Agent IMS en VoIP
 * 
 * Framework utilisé : Node
 * 
 * Auteurs:
 *      @author CISSE Hamidou Abdoul Jalil
 *      @author TAPSOBA Pazisnéwendé Aubain
 */
 
 /**
  * connectes contient les informations sur
  * tous les utilisateurs en ligne.
  * @type {Objet}
  */
var connectes = {};
var registered = false;
/**
 * Dans le cadre du projet nous avons utilisé les modules:
 * - express
 * - body-parser
 * - cookie-parser
 * - express-session pour la gestion des sessions
 * - uws et http pour l'utilisation du WebSocket
 * - bcrypt pour le hashage du mot de passe
 * - mongoose pour la gestion de notre Base de données NoSQL
 * - twig pour la gestion du template
 */

/**************************** Importation Modules **************************/

var express = require('express');
var bodyP = require('body-parser');
var cookieP = require('cookie-parser');
var session = require('express-session');

/********** WEBSOCKET **********/
var http = require('http');


var ws = require('ws');



/********** BCRYPT ************/
var bcrypt = require('bcrypt');
const saltRounds = 10;


/************ Mongoose ***************/
var mongoose = require('mongoose');

/**********moteur de templating Twig**********/
var twig = require('twig');

/****************************************************************************/

var app = express();
app
    .use(bodyP.urlencoded({
        extended: false
    }))
    .use(cookieP());
app.use('/static', express.static('static'));

// On configure le dossier contenant les templates
// et les options de Twig
app
    .set('views', 'templates')
    .set('twig options', {
        autoescape: true
    });

/*********************** Configuration de la session **********************/

var storageSess = session({
    secret: '1A2b3c4d5e9ZHi',
    name: 'sessionID',
    resave: false,
    saveUninitialized: false
});
app.use(storageSess);
/***********************************************************************/

/*********** Configuration et initialisation de Mongoose **************/

 // Pour la connection
mongoose.connect('mongodb://localhost/kaincall');
var db = mongoose.connection;

// Définition du schémas de la base de données
var kainSchema = mongoose.Schema({
    displayName: String,
    pseudo: String,
    domain: String,
    sip: String,
    pass: String,
    contact: []
});

//Compilation de notre model (correspondant à une table en relationnel)
var User = mongoose.model('User', kainSchema);


//Pour vérifier qu'on est bien connecté à la base de données
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Je suis connecté');
});

/******************* Nos gestionnaires commencent ici ******************/

/** Gestionnaire pour la direction vers l'authentification
 */
app.get('/', (req, res) => {
    if (req.session.pseudo in connectes) {
        res.redirect('/kaincall');
    }else{
        res.sendFile(__dirname + '/static/index.html');
    }
    
});

/**Gestonnaire pour l'authentification
 */
app.all('/', (req, res) => {

    if(req.method=='POST'){
        //Requête preparée permettant de chercher le pseudo saisi dans la BD
        var query = User.find({
            pseudo: req.body.pseudo
        });
    
        //Exécution de la requête
        query.exec((err, result) => {
            if (err) {
                console.log('\n Erreur sur find: ' + err);
                res.status(500).send(err);
            }
            if (result.length >= 1) {
                        //Stockage session du nouveau joueur et redirection vers /kaincall
                        req.session.pseudo = req.body.pseudo;
    
                        //Mise à jour de l'objet connectes
                        connectes[req.body.pseudo] = {
                            time: new Date(),
                            statut: 'nouv',
                            displayName: result[0].displayName,
                            pass: result[0].pass,
                            sip: result[0].sip,
                            contact: []
                        
                        };
                            
                        for(var i=0;i<result[0].contact.length;i++){
                            connectes[req.body.pseudo].contact.push({
                                pseudo: result[0].contact[i].pseudo,
                                sip: result[0].contact[i].sip,
                                siteWeb: result[0].contact[i].siteWeb,
                                email: result[0].contact[i].email,
                                tel: result[0].contact[i].tel,
                                cv : result[0].contact[i].cv,
                                dureCall: result[0].contact[i].dureCall
                            });
                        }
                        res.redirect('/kaincall');
            }
            else {
                // console.log('Pseudo non reconnu');
                // res.render('index.twig', {
                //     'erreurCompt': true
                // });
                //Insertion du nouveau user dans la BD
                    var nouvUser = new User({
                        displayName: req.body.displayName,
                        pseudo: req.body.pseudo,
                        domain: req.body.domaine,
                        pass: req.body.pass,
                        sip: req.body.pseudo + '@' + req.body.domaine,
                        contact: []
                    });
    
                    //Sauvegarde dans la BD
                    nouvUser.save((err) => {
                        if (err) {
                            console.log('\nErreur d\'enregistrement dans la BD ' + err);
                        }
                    });
            
                    //Stockage session du nouveau joueur et redirection vers /espacejeu
                    req.session.pseudo = req.body.pseudo;
    
                    //Mise à jour de l'objet connectée
                    connectes[req.body.pseudo] = {
                        time: new Date(),
                        statut: 'nouv',
                        displayName: req.body.displayName,
                        pass: req.body.pass,
                        sip: req.body.sip,
                        contact: []
                    };
                    res.redirect('/kaincall');
                    console.log('\nEnregistrement du new user');
            }
        });
    }else{
        res.redirect('/');
        console.log('Erreur redirect ou creation de compte');
    }
});

/**Gestionnaire pour la création de compte du joueur
 */
// app.all('/signin', (req, res) => {

//     if(req.method=='POST'){
//         var query = User.find({
//             pseudo: req.body.pseudo
//         });
//         //Vérification s'il n'y a pas le même Pseudo avant de l'enregistrer
//         query.exec((err, result) => {
//             if (err) {
//                 console.log('\n Erreur sur find: ' + err);
//                 res.status(500).send(err);
//             }
//             /**Si le pseudo existe on réaffiche la page d'authentification avec un
//              *message spécifiant que le Pseudo ou le mot de passe existe déjà
//              */
//             else if (result.length >= 1) {
//                 res.render('index.twig', {
//                     'duplica': true
//                 });
    
//             }
//             //Il n'existe pas, donc on l'ajoute dans la BD avant de le rediriger
//             else {
//                     //Insertion du nouveau user dans la BD
//                     var nouvUser = new User({
//                         displayName: req.body.nom,
//                         pseudo: req.body.pseudo,
//                         pass: req.body.pass,
//                         sip: req.body.sip,
//                         contact: []
//                     });
    
//                     //Sauvegarde dans la BD
//                     nouvUser.save((err) => {
//                         if (err) {
//                             console.log('\nErreur d\'enregistrement dans la BD ' + err);
//                         }
//                     });
            
//                     //Stockage session du nouveau joueur et redirection vers /espacejeu
//                     req.session.pseudo = req.body.pseudo;
    
//                     //Mise à jour de l'objet connectée
//                     connectes[req.body.pseudo] = {
//                         time: new Date(),
//                         statut: 'nouv',
//                         pass: req.body.pass,
//                         sip: req.body.sip,
//                         contact: []
//                     };
//                     res.redirect('/kaincall');
//                     console.log('\nEnregistrement du new user');
//             }
//         });
//     }else{
//         res.redirect('/');
//     }
// });

app.get('/kaincall', (req, res) => {
    //On verifie si le user est connecté avant de charger la page
    if (req.session.pseudo in connectes) {
        var result=[];
        //result=connectes[req.session.pseudo].contact;
        for(var i=0;i<connectes[req.session.pseudo].contact.length;i++){
                result.push({
                pseudo: connectes[req.session.pseudo].contact[i].pseudo,
                sip: connectes[req.session.pseudo].contact[i].sip,
                siteWeb: connectes[req.session.pseudo].contact[i].siteWeb,
                email: connectes[req.session.pseudo].contact[i].email,
                tel: connectes[req.session.pseudo].contact[i].tel,
                cv : connectes[req.session.pseudo].contact[i].cv,
                dureCall: connectes[req.session.pseudo].contact[i].dureCall
            });
        }
        //Pour trier par ordre croissant des noms
        result.sort((a, b) => {
            return a.pseudo.localeCompare(b.pseudo);
        });
        res.render('kaincall.twig', {
            'user': req.session.pseudo,//Nom du user
            'contact': result
        });
    }
    else {
        res.redirect('/');
        console.log('PAS CONNECTE');
    }
});

/**Gestionnaire pour la deconnexion du joueur
 */
app.get('/logout', (req, res) => {
    res.redirect('/');
});
/***********************************************************************/

/***************************** WEBSOCKET ******************************/

// On attache le serveur Web Socket au même serveur qu'Express
var server = http.createServer(app);
var wsserver = new ws.Server({
    server: server,
    // Ceci permet d'importer la session dans le serveur WS, qui
    // la mettra à disposition dans wsconn.upgradeReq.session, voir
    // https://github.com/websockets/ws/blob/master/examples/express-session-parse/index.js
    
    verifyClient: (info, callback) => {
        storageSess(info.req, {}, () => {
            callback(info.req.session.pseudo !== undefined, 403, "Unauthorized");
        });
    },
});

/**Broadcast à tous les users
*/
// Broadcast à tous les users
wsserver.broadcast = (data) => {
    wsserver.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

//Broadcast à tous les users sauf à celui initiateur du broadcast
wsserver.broadcastEve = (wsConn, data) => {
    wsserver.clients.forEach((client) => {
        if (client !== wsConn && client.readyState === ws.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

// On définit la logique de la partie Web Socket
wsserver.on('connection', (wsconn) => {
    
    //Contenant les informations sur la session
    var session = wsconn.upgradeReq.session;
   
   function listContact(){
       var result=[];
        for(var i=0;i<connectes[session.pseudo].contact.length;i++){
                result.push({
                pseudo: connectes[session.pseudo].contact[i].pseudo,
                sip: connectes[session.pseudo].contact[i].sip,
                siteWeb: connectes[session.pseudo].contact[i].siteWeb,
                email: connectes[session.pseudo].contact[i].email,
                tel: connectes[session.pseudo].contact[i].tel,
                cv : connectes[session.pseudo].contact[i].cv,
                dureCall: connectes[session.pseudo].contact[i].dureCall
            });
        }
        return result;
   }
    if (session.pseudo in connectes && connectes[session.pseudo].statut == 'nouv') {
        
        var enligne = {
            statut: 'ENLIGNE',
            displayName: connectes[session.pseudo].displayName,
            sip: connectes[session.pseudo].sip,
            pass: connectes[session.pseudo].pass
        };
        
        wsconn.send(JSON.stringify(enligne));
        console.log('MSG ENLIGNE SEND');
    }
    
    wsconn.on('message', (data) => {
        console.log('\nDATA: ' + data);
        var DATA = JSON.parse(data);
        switch (DATA.action) {
            //  case 'registered':
            //      registered = true;
            //     app.use(function(req, res){
            //       registered = true;
            //     });
                
            //     console.log('REGISTERED');
            //  break;
             
            //  case 'unregistered':
            //     console.log('UNREGISTERED');
            // break;
             case 'ajoutContact':
                var query = User.find({
                    pseudo: session.pseudo
                });
                
                query.exec((err, result) => {
                    if (err) console.log('Requête pour deconnexion: ' + err);
        
                    if (result.length == 1) {
                        //for(var i=0;i<connectes[session.pseudo].contact.length;i++){
                            result[0].contact.push({
                                pseudo: DATA.pseudo,
                                sip: DATA.sip,
                                siteWeb: DATA.siteWeb,
                                email: DATA.email,
                                tel: DATA.tel,
                                cv : DATA.cv,
                                dureCall: null
                            });
                        //}
                        result[0].save((err) => {
                            if (err) {
                                console.log('\n Deconnexion-Erreur d\'enregistrement dans la BD ' + err);
                            }
                        });
                    }
                });
                
                connectes[session.pseudo].contact.push({
                    pseudo: DATA.pseudo,
                    sip: DATA.sip,
                    siteWeb: DATA.siteWeb,
                    email: DATA.email,
                    tel: DATA.tel,
                    cv : DATA.cv,
                    dureCall: null
                });
                var listcontact=listContact();
                wsconn.send(JSON.stringify({
                    statut: 'CONFADD',
                    contacts: listcontact
                }));
                console.log('CONTACT ADD: '+connectes[session.pseudo].contact);
             break;
             
             case 'listContact':
                for(var i=0;i<connectes[session.pseudo].contact.length;i++){
                    var listcontact=listContact();
                    wsconn.send(JSON.stringify(listcontact));
                }
                
             break;
             
            //  case 'searchContact':
            //     for(var i=0;i<connectes[session.pseudo].contact.length;i++) {
            //         if(connectes[session.pseudo].contact[i]==DATA.pseudo)
            //         wsconn.send(JSON.stringify({
            //             statut: 'CONFSEARCH',
            //             pseudo: connectes[session.pseudo].contact[i].pseudo,
            //             sip: connectes[session.pseudo].contact[i].sip,
            //             siteWeb: connectes[session.pseudo].contact[i].siteWeb,
            //             email: connectes[session.pseudo].contact[i].email,
            //             tel: connectes[session.pseudo].contact[i].tel,
            //             cv : connectes[session.pseudo].contact[i].cv,
            //             dureCall: connectes[session.pseudo].contact[i].dureCall
            //         }));
            //     }
            //  break;
             
             case 'supprContact':
                 var del=false;
                for(var i=0;i<connectes[session.pseudo].contact.length;i++) {
                    if(connectes[session.pseudo].contact[i].pseudo==DATA.pseudo){
                        wsconn.send(JSON.stringify({
                            statut: 'CONFDEL'
                        }));
                        connectes[session.pseudo].contact.splice(i,1);
                        del=true;
                        console.log('CONFDEL DE CONNECTES');
                    }
                }
                if(del){
                    var query = User.find({
                        pseudo: session.pseudo
                    });
            
                    query.exec((err, result) => {
                        if (err) console.log('Requête pour supp contact: ' + err);
            
                        if (result.length == 1) {
                            result[0].contact=[];
                            for(var i=0;i<connectes[session.pseudo].contact.length;i++) {
                                result[0].contact.push({
                                    pseudo: connectes[session.pseudo].contact[i].pseudo,
                                    sip: connectes[session.pseudo].contact[i].sip,
                                    siteWeb: connectes[session.pseudo].contact[i].siteWeb,
                                    email: connectes[session.pseudo].contact[i].email,
                                    tel: connectes[session.pseudo].contact[i].tel,
                                    cv : connectes[session.pseudo].contact[i].cv,
                                    dureCall: connectes[session.pseudo].contact[i].dureCall
                                });
                            }
                            console.log('CONFDEL DU BD');
                            result[0].save((err) => {
                                if (err) {
                                    console.log('\n Deconnexion-Erreur d\'enregistrement dans la BD ' + err);
                                }
                            });
                        }
                    });
                }
             break;
             default:
                 // code
                 console.log("Erreur d'interprétation sur le message reçu");
         }
    });
    
        /************** Fermeture de la connexion ************/
    wsconn.on('close', () => {
        connectes[session.pseudo].statut='nouv';
        // Lorsqu'on détecte une fermeture de la connexion on sauvegarde
        // Les données du user dans la BD
        
        // var query = User.find({
        //     pseudo: session.pseudo
        // });
    
        // query.exec((err, result) => {
        //     if (err) console.log('Requête pour deconnexion: ' + err);

        //     if (result.length == 1 && connectes[session.pseudo]) {
        //         for(var i=0;i<connectes[session.pseudo].contact.length;i++){
        //             result[0].contact.push({
        //                 pseudo: connectes[session.pseudo].contact[i].pseudo,
        //                 sip: connectes[session.pseudo].contact[i].sip,
        //                 siteWeb: connectes[session.pseudo].contact[i].siteWeb,
        //                 email: connectes[session.pseudo].contact[i].email,
        //                 tel: connectes[session.pseudo].contact[i].tel,
        //                 cv : connectes[session.pseudo].contact[i].cv,
        //                 dureCall: connectes[session.pseudo].contact[i].dureCall
        //             });
        //         }
        //         result[0].save((err) => {
        //             if (err) {
        //                 console.log('\n Deconnexion-Erreur d\'enregistrement dans la BD ' + err);
        //             }
        //         });
        //     }
        // });
    });
});

// On lance le serveur HTTP/Web Socket
server.listen(process.env.PORT);