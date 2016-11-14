
	var RCVPORT = 44444;
	var SENDPORT = 55555;
	var HOST;
	var broadcastAddr;
	var selfKey;
	var selfDisplay;
	var keymap= {};  // map from [ip] => [keyOfParticipants] **can be subjected to changed to whatever you like

	var dgram = require('dgram');
	var server = dgram.createSocket('udp4');
	var client = dgram.createSocket('udp4');
	//var client;

	var forwardedMsg = {}; // map "fromKey toKey" => "seqKey"
	var forwardedBroadcast = {}; // map for broadcast message "fromKey toKey" => "seqKey"
	var forwardAnnouncement = {}; // map for announcement msg incase we want to broadcast to others

	var os = require('os');
	var ifaces = os.networkInterfaces();
	var keyMapsocketID = {};
	var socketIDstate = {};

	const express = require('express');
	const app = express();
	const http = require('http').createServer(app);
	const bodyParser = require('body-parser')

	var io = require('socket.io')(http);
	var peers=[];
	var me="";
	var wmessage = {
	}
	var peer="";

	app.use( bodyParser.json() );       // to support JSON-encoded bodies
	app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	  extended: true
	}));
	app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css/'));
	app.use('/socket', express.static(__dirname + '/node_modules/socket.io-client/'));
	app.use('/', express.static(__dirname + '/node_modules/jquery/dist/'));

	// PART SERVER CONNECT SERVER---------------------------------------------------------------------------------------------
	server.on('listening', function () {
	    console.log(`UDP Server listening on ${HOST}:${RCVPORT}`);
	});

	server.on('message', function (message, remote) {
	    // split case to do each function
	    // TODO: write this function
	    message = `${message}`;
	    let title = message.split(':')[0];
	    let body = message.split(':').slice(1).join(':');
	    console.log("server= "+ title );
	    switch (title) {
	        case 'announce':
	            receiveAnnouncement(body);
	            break;
	        case 'reply':
	            receiveReply(body);
	            break;
	        case 'message':
	            receiveMsg(body);
	            break;
	        case 'ackmessage':
	            receiveMsgAck(body);
	            break;
	        case 'broadcastmessage':
	            receiveBroadcastMsg(body);
	            break;
	        case 'broadcastack':
	            receiveBroadcastAck(body);
	            break;

	        default:
	            console.error('invalid message');
	    }
	    console.log(`received: ${remote.address + ':' + remote.port + ' - ' + message}`);

	});

	// main program
	initialize();


	// function section
	function initialize() {
	    // require('dns').lookup(require('os').hostname(), (err, add, fam) => {
	    //     HOST = add;
	    //     console.log("HOST = " + HOST);
	    //     server.bind(RCVPORT);
	    //     generateKey();
	    //     setBroadcastAddress();
	    // });
	    var temp = ifaces['en0'];
		if (!temp) {
			temp = ifaces['Wi-Fi'];
		}
	    var address = temp[1].address;
	    HOST = address;
	    console.log("HOST = " + HOST);
        server.bind(RCVPORT);
        generateKey();
        setBroadcastAddress();

	    client.bind(SENDPORT,HOST,(err) => {
	    	if(err){
	    		console.error(`error occurred:\n${err}`);
	            client.close();
	            return;
	    	}
	    })
	}

	function generateKey() {
	    // this function generate key from hostname and random string 'asdfjkl;' or some other random string
	    selfKey = require('os').hostname();
	}

	function announceSelf() {
	    if (!HOST) {
	        console.error('you are not assigned an IP address');
	        return;
	    }

	    let message = Buffer.from(`announce: ${HOST} ${selfKey} ${selfDisplay}`);
	    client.setBroadcast(true);
	    client.send(message, RCVPORT, broadcastAddr, (err) => {
	  		if (err) {
	            console.error(`error occured while announcing:\n${err}`);
	        }
	        forwardAnnouncement[selfKey] = true;
	    });

	}

	function replyViaIP(destIP, msg) {
		console.log("replyAnnoucement");
		client.send(msg, RCVPORT, destIP, (err) => {
	        if (err) {
	            console.error(`error occured while announcing:\n${err}`);
	        }
	    });
	}

	function sendMsgViaIP(destKey,destIP, msg) {
	    // this function is for chat msg
	    // will send via broadcast if not receive ack in 1s
	    console.log("send via ip "+ msg +" " + destKey);
	    var seqnum = Math.floor((Math.random() * 1000000) + 1);
	 
	    let message = Buffer.from(`message: ${destKey} ${selfKey} ${seqnum} ${msg}`);
		client.send(message, RCVPORT, destIP, (err) => {
		    if (err) {
		       	console.error(`error occured while announcing:\n${err}`);
		    }

		});
		var temp = ""+selfKey+destKey;
		forwardedMsg[temp]=seqnum;

	}

	function sendMsgViaBroadcasting(desKey,msg) {
	    // this is also chat message
	    // will return error to UI if not receive ack in 3s
	    console.log("send broadcast "+ msg +" " + desKey);
	    var seqnum = Math.floor((Math.random() * 1000000) + 1);
	    client.setBroadcast(true);

        let message = Buffer.from(`broadcastmessage: ${desKey} ${selfKey} ${seqnum} ${msg}`);
        client.send(message, RCVPORT, broadcastAddr, (err) => {
            if (err) {
                console.error(`error occured while broadcasting:\n${err}`);
            }

        });
        var temp = ""+selfKey+desKey;
		forwardedBroadcast[temp]=seqnum;

	}

	//follow req, not test yet
	function receiveAnnouncement(msg) {
	    // announce message is in the form "announce: {IP} {KEY} {DISPLAYNAME}" but be slice the announce part off already
	    msg = msg.trim();
	    let key, ip, displayname;
	    var temp = msg.split(' ');
	    key = temp[1];
	    ip = temp[0];
	    displayname = temp[2];// map key to ip
	   	if(keymap[temp[1]] == undefined){
	    	peers.push(temp[1]);
	    	keymap[temp[1]] = temp[0];
	    }

	    // may want to broadcast to other known ip in case someone doesn't receive this
	    if(forwardAnnouncement[key] == undefined){
	        forwardAnnouncement[key] = true;
	        console.log('forwardAnnouncement');
            let message = Buffer.from(`announce: ${ip} ${key} ${displayname}`);
            client.setBroadcast(true);
            client.send(message, RCVPORT, broadcastAddr, (err) => {
                if (err) {
                    console.error(`error occured while forwording announcement:\n${err}`);
                }

            });

	    }
	    //this part reply back to the broadcaster about sel
	    let repMsg = `reply: ${HOST} ${selfKey} ${selfDisplay}`;
	    repMsg = Buffer.from(repMsg);
	    replyViaIP(ip, repMsg);

	}

	// to determine wether to forward msg or to dropped
	// 1. we remember 3 things (fromIP, toIP, seqKey)
	// 2. if (x,x,x) already forwarded drop it
	// 3. if msg aimed for us don't forward render to screen
	// 3. otherwise forward to everyone else and remember

	function receiveMsg(msg) {
	    msg = msg.trim().split(' ');
	    let deskey = msg[0];
	    let senderkey = msg[1];
	    let seqnum = msg[2];
	    let content="";
	    for(var i = 3 ;i < msg.length ; i++)
	    {
	    	content = content+msg[i]+" ";
	    }
	    var message={
	    	sender: senderkey,
	    	content: content
	    }

	    if(selfKey == deskey){
	    	//check that chatroom is opened?????
    		if(keyMapsocketID[senderkey] != undefined){
    			var socketID = keyMapsocketID[senderkey];
    			io.to(socketID).emit('msgtoClient',message);
    		}else{
    		 	if(wmessage[senderkey] != undefined){
    		 	var temp = wmessage[senderkey];
    		 	}else{
    		 		var temp = [];
    		 	}
    		 	temp.push(message);
    		 	wmessage[senderkey] = temp;
    		 	io.to(keyMapsocketID['list']).emit('notiOn',senderkey);
    		}
    		sendMsgAck(keymap[senderkey],content,seqnum);
		}else{
			var temp = ""+senderkey+deskey;
			if(forwardedMsg[temp] == undefined || forwardedMsg[temp] != seqnum ){
				forwardedMsg[temp] = seqnum;
	        	let message = Buffer.from(`message: ${deskey} ${senderkey} ${seqnum} ${content}`);
	        	client.send(message, RCVPORT, keymap[deskey], (err) => {
	            if (err) {
	                console.error(`error occured while sending:\n${err}`);
	            }

	        	});
			}
		}

	    // when receive message check if the msg is aim for us or should be forward
	    // and remember to not forward more than once


	}

	function receiveBroadcastMsg(msg) {
	    // when receive message check if the msg is aim for us or should be forward
	    // and remember to not forward more than once
	    msg = msg.trim().split(' ');
	    let deskey = msg[0];
	    let senderkey = msg[1];
	    let seqnum = msg[2];
	    let content="";
	    for(var i = 3 ;i < msg.length ; i++)
	    {
	    	content = content+msg[i]+ " ";
	    }
	    var message={
	    	sender: senderkey,
	    	content: content
	    }
	    var temp = ""+senderkey+deskey;
	    if(deskey != selfKey){
	    	if(forwardedBroadcast[temp] == undefined || forwardedBroadcast[temp] != seqnum){
	        forwardedBroadcast[temp] = seqnum;
	        client.setBroadcast(true);
            let message = Buffer.from(`broadcastmessage: ${deskey} ${senderkey} ${seqnum} ${content}`);
            client.send(message, RCVPORT, broadcastAddr, (err) => {
                if (err) {
                    console.error(`error occured while broadcasting:\n${err}`);
                }

	        });
        }
	    }else{
	        //send to socket.io and show in chatroom
	        if(keyMapsocketID[deskey] != undefined){
    			var socketID = keyMapsocketID[senderkey];
    			io.to(socketID).emit('msgtoClient',message);
    		}else{
    		 	if(wmessage[senderkey] != undefined){
    		 	var temp = wmessage[senderkey];
    		 	}else{
    		 		var temp = [];
    		 	}
    		 	temp.push(message);
    		 	wmessage[senderkey] = temp;
    		 	io.to(keyMapsocketID['list']).emit('notiOn',senderkey);
    		}
	   		sendBroadcastAck(keymap[senderkey],content,seqnum);
	    }

	}

	function receiveReply(body) {
		msg = body.trim().split(' ');
		if(keymap[msg[1]] == undefined){
			peers.push(msg[1]);
			keymap[msg[1]] = msg[0];
		}
	    // when receive reply from other nodes save it in the keymap or something
	    // then store it and show to user in the discover page


	}
	function sendMsgAck(desIP,msg,seqnum){
        let message = Buffer.from(`ackmessage: ${selfKey} ${seqnum} ${msg}`);
        client.send(message, RCVPORT, desIP, (err) => {
            if (err) {
                console.error(`error occured while announcing:\n${err}`);
            }
        });

	}
	function receiveMsgAck(body) {
		var msg = body.split(' ');
		var key = msg[1];
		io.to(keyMapsocketID[key]).emit('successMsg',"");
	    // ack message when send using sendMsgViaIP should flag some global var or
	    // using event to denote that message has arrived
	}
	function sendBroadcastAck(desIP,msg,seqnum){
	        //keep ip or key
        let message = Buffer.from(`broadcastack: ${selfKey} ${seqnum} ${msg}`);
        client.send(message, RCVPORT, desIP, (err) => {
            if (err) {
                console.error(`error occured while announcing:\n${err}`);
            }
        });

	}
	function receiveBroadcastAck(body) {
		var msg = body.split(' ');
		var key = msg[1];
		io.to(keyMapsocketID[key]).emit('successMsg',"");
	    // same as above function but ack for sendMsgViaBroadcasting
	}

	//folow req, not test yet
	function setBroadcastAddress() {
	    // this function sets broadcast address using ip | (inverse(subnetmask))
	    var temp = ifaces['en0'];
		if (!temp) {
			temp = ifaces['Wi-Fi'];
		}
	    var netmask = temp[1].netmask;
	    var netmaskArray = netmask.split('.');
	    var thisHost = HOST;
	    var thisHostArray = thisHost.split('.');
	    var thisHostArray = thisHost.split('.');

	    for(var i = 0 ; i < 4 ;i++){
	        var a = 255-parseInt(netmaskArray[i]);
	        var b = parseInt(thisHostArray[i]);
	        var c = a|b;
	        if(i == 0){
	            broadcastAddr = c.toString();
	        }
	        else{
	            broadcastAddr = broadcastAddr + '.' + c.toString();
	        }
	     }

	    console.log(broadcastAddr);
	}


	// PART SERVER CONNECT CLIENT ---------------------------------------------------------------------------------------------------

	app.get('/', (req, res) => {
	    res.sendFile(__dirname + '/home.html');
	    //after open homepage, connect to friends and keep friendslist in paramenter "peer
	});

	app.post('/getUserlist', (req, res) => {
	    res.sendFile(__dirname + '/friendlist.html');
	    selfDisplay = req.body.username;
	    announceSelf();
	    me = selfKey;
	});

	app.get('/chatroom', (req, res) => {
	    res.sendFile(__dirname + '/chatroom.html');
	    peer = req.param('friend');
	});

	app.get('/discover/:ip', (req, res) => {
	    // send self ip to the system for route discover
	});

	io.on('connection', function(socket){
		console.log("connection");
		console.log(socket.id);
		socket.on('disconnect', function () {
			console.log(socket.id + " disconnect");
			for (var key in keyMapsocketID) {
        		if (keyMapsocketID[key] == socket.id) delete keyMapsocketID[key];
    		}
  		});
		socket.emit('getUsername',me);
		socket.on('sendBroadcast',function(msg){
			sendMsgViaBroadcasting(msg.reciever,msg.content);
		});
		socket.on('msgfromclient',function(msg){
			sendMsgViaIP(msg.reciever,keymap[msg.reciever], msg.content);
		});
		socket.on('reqGetUsername',function(){
			socket.emit('getUsername',me);
		});
		socket.on('reqGetpeer',function(){
			socket.emit('sendChattingpeer',peer);
			keyMapsocketID[peer] = socket.id;
		});
		socket.on('reqFriendslist',function(){
			socket.emit('sendfriendslist',peers);
			keyMapsocketID['list'] = socket.id;
		});
		socket.on('reqWaitingmsg',function(peer){
			var temp = wmessage[peer];
			if(temp != undefined){
				for(var i = 0 ; i < temp.length ; i++){
					io.to(keyMapsocketID[peer]).emit('waitingmsgtoClient',temp[i]);
				}
				delete wmessage[peer];
				io.to(keyMapsocketID['list']).emit('notiOff',peer);
			}
		});
		socket.on('peerdisconnect',function(peer){
			var index = peers.indexOf(peer);
			if (index >= 0) {
  				peers.splice( index, 1 );
			}
    		delete keymap[peer];
    		socket.emit('removepeerlist',peer);
		});


	   	//get "message" from other  server ps.message must have sender name
		//socket.emit('msgtoClient',message);
	});

	http.listen(3000, () => {
	    console.log(`server is listening on port 3000`);
	});