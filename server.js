var RCVPORT = 44444;
var SENDPORT = 55555;
var HOST = '192.168.1.105';
var broadcastAddr;
var selfKey;
var selfDisplay;
var keymap; // map from [ip] => [keyOfParticipants]

var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var client = dgram.createSocket('udp4');

var forwardedMsg; // map "fromKey toKey" => "seqKey"
var forwardedBroadcast; // map for broadcast message "fromKey toKey" => "seqKey"
var forwardAnnouncement; // map for announcement msg incase we want to broadcast to others

server.on('listening', function () {
   require('dns').lookup(require('os').hostname(), function (err, add, fam) {
        let address = add;
        HOST = add;
        console.log('UDP Server listening on ' + address.address + ":" + address.port);
    })
});

server.on('message', function (message, remote) {
    // split case to do each function
    // TODO: write this function

    let title = message.split(':')[0];
    let body = message.split(':').slice
    switch(title) {
        case 'announce':
            receiveAnnouncement()
            break;
        case 'reply':
            break;
        case 'message':
            break;
        case 'ackmessage':
            break;
        case 'broadcastmessage':
            break;
        case 'broadcastack':
            break;

        default:
            console.error('invalid message');
    }
    console.log(remote.address + ':' + remote.port + ' - ' + message);

});

server.bind(RCVPORT, HOST);

function announceSelf() {
    if (!HOST) {
        console.error('you are not assigned an IP address');
        return;
    }

    client.bind(SENDPORT, HOST, (err) => {
        if (err) {
            console.error(`error occurred:\n${err}`);
            client.close();
            return;
        }
        let message = Buffer.from(`announce: ${HOST} ${selfKey} ${displayname}`);
        client.send(message, RCVPORT, broadcastAddr, (err) => {
            if (err) {
                console.error(`error occured while announcing:\n${err}`);
            }
            client.close();
        });
    })
}

function replyViaIP(destIP, msg) {
    client.bind(SENDPORT, HOST, (err) => {
        if (err) {
            console.error(`error occurred:\n${err}`);
            client.close();
        }
        client.send(msg, RCVPORT, destIP, (err) => {
            if (err) {
                console.error(`error occured while announcing:\n${err}`);
            }
            client.close();
        });
    })
}

function sendMsgViaIP(destIP, msg) {
    // this function is for chat msg
    // will send via broadcast if not receive ack in 1s
    client.bind(SENDPORT, HOST, (err) => {
        if (err) {
            console.error(`error occurred:\n${err}`);
            client.close();
        }
        let destKey = keymap[destIP];
        let message = Buffer.from(`message: ${destKey} ${selfKey} ${msg}`);
        client.send(message, RCVPORT, destIP, (err) => {
            if (err) {
                console.error(`error occured while announcing:\n${err}`);
            }
            client.close();
        });
    })
}

function sendMsgViaBroadcasting(msg, destKey) {
    // this is also chat message
    // will return error to UI if not receive ack in 3s
    client.bind(SENDPORT, HOST, (err) => {
        if (err) {
            console.error(`error occurred:\n${err}`);
            client.close();
        }
        let message = Buffer.from(`broadcastmessage: ${destKey} ${selfKey} ${msg}`);
        client.send(message, RCVPORT, broadcastAddr, (err) => {
            if (err) {
                console.error(`error occured while announcing:\n${err}`);
            }
            client.close();
        });
    })
}

function receiveAnnouncement(msg) {
    // announce message is in the form "announce: {IP} {KEY} {DISPLAYNAME}" but be slice the announce part off already
    msg = msg.trim();
    let key, ip, displayname;
    [ip, key, ...displayname] = msg.split(' ');
    displayname = displayname.join(' ');
    keymap[ip] = key;

    // this part reply back to the broadcaster about self
    let repMsg = `reply: ${selfKey} ${selfDisplay}`;
    repMsg = Buffer.from(repMsg);
    replyViaIP(ip, repMsg);

    // may want to broadcast to other known ip in case someone doesn't receive this
}

// to determine wether to forward msg or to dropped
// 1. we remember 3 things (fromIP, toIP, seqKey)
// 2. if (x,x,x) already forwarded drop it
// 3. if msg aimed for us don't forward render to screen
// 3. otherwise forward to everyone else and remember

function receiveMsg(msg) {
    // when receive message check if the msg is aim for us or should be forward
    // and remember to not forward more than once


}

function receiveBroadcastMsg(msg) {
    // when receive message check if the msg is aim for us or should be forward
    // and remember to not forward more than once
}