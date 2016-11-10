const net = require('net');
const express = require('express');
const dgram = require('dgram');
const app = express();
const http = require('http').createServer(app);
const bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
var io = require('socket.io')(http);
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css/'));
app.use('/socket', express.static(__dirname + '/node_modules/socket.io-client/'));
app.use('/', express.static(__dirname + '/node_modules/jquery/dist/'));

var peers=['mimi1','mimi2','mimi3'];
var me="";
var wmessage = {
	sender : "mimi1",
	content : "Hello Inging"
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/home.html');
    //after open homepage, connect to friends and keep friendslist in paramenter "peer"
});

app.post('/getUserlist', (req, res) => {
    res.sendFile(__dirname + '/friendlist.html');
    console.log("mimi = "+req.body.username);
    me = req.body.username;
});

app.post(/chatroom/, (req, res) => {
    res.sendFile(__dirname + '/chatroom.html');
    io.on('connection', function(socket){
    	console.log("inging = "+req.body.friend);
    	socket.emit('sendChattingpeer',req.body.friend);
    	socket.emit('waitingmsgtoClient',wmessage);
  });
});

app.get('/discover/:ip', (req, res) => {
    // send self ip to the system for route discover
});

io.on('connection', function(socket){
	console.log("connection");
	socket.emit('getUsername',me);
	socket.emit('sendfriendslist',peers);
	socket.on('msgfromclient',function(msg){
		console.log(msg);
	});
	//get "message" from other  server ps.message must have sender name
	// socket.emit('msgtoClient',message);
});
http.listen(3000, () => {
    console.log(`server is listening on port 3000`);
});