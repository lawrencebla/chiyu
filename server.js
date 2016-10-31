var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var UUID = require('node-uuid');
var app = express();
var port = process.env.PORT || 5000;

app.use(express.static(__dirname + "/public"));

var server = http.createServer(app);
server.listen(port);

var wss = new WebSocketServer({server: server});

var clientSockets = [];
var hostSocket = null;

function saveSend(sk, message) {
	if(sk && sk.OPEN) {
		sk.send(message);
	} else {
		console.log('current socket is closed');
	}
}

function createClients(clientSockets) {
	clientSockets.forEach(function(csk) {
		console.log('createPeer');
		csk.send(JSON.stringify({
			actionType: 'createPeer',
			data: csk.id
		}));
	});
	hostSocket.send(JSON.stringify({
		actionType: 'createStream',
		data: clientSockets.map( function(client) {
				return client.id;
			} )
	}));
}

function findClientById(socketId) {
	return clientSockets.filter( function(cs) {return cs.id === socketId} )[0];
}

var actions = {
	uploadOffer: function(data) {
		console.log('downloadOffer');
		saveSend(findClientById(data.socketId), JSON.stringify({
			actionType: 'downloadOffer',
			data: data
		}));
	},
	uploadAnswer: function(data) {
		console.log('downloadAnswer');
		saveSend(hostSocket, JSON.stringify({
			actionType: 'downloadAnswer',
			data: data
		}));
	},
	sendIceCandidateToClient: function(data) {
		console.log('sendIceCandidateToClient');
		saveSend(findClientById(data.socketId), JSON.stringify({
			actionType: 'downloadIceCandidate',
			data: data
		}));
	},
	sendIceCandidateToHost: function(data) {
		console.log('sendIceCandidateToHost');
		saveSend(hostSocket, JSON.stringify({
			actionType: 'downloadIceCandidate',
			data: data,
		}));
	}
}
wss.on("connection", function(sk) {
  if( sk.upgradeReq.url !== '/server.html' ) {
  	console.log('client');
  	sk.id = UUID.v4();
  	clientSockets.push(sk);
  	if( hostSocket ) {
  		console.log('addClient');
  		createClients([sk]);
  	}
  	sk.on('close', function() {
  		if(hostSocket) {
  			console.log('removeClient');
  			hostSocket.send(JSON.stringify({
  				actionType: 'removeClient',
  				data: sk.id
  			}));
  			var clientLength = clientSockets.length;
  			if(clientLength > 0) {
  				for(var i = 0; i < clientLength ; i++) {
  					if( clientSockets[i].id === sk.id ) {
  						break;
  					}
  				}
  				if( i < clientLength ) {
  					clientSockets.splice(i, 1);
  				}
  			}				
  		}
  	});
  } else if( !hostSocket && sk.upgradeReq.url === '/server.html' ) {
  	console.log('host');
  	hostSocket = sk;
  	createClients(clientSockets);
  	hostSocket.on('close', function() {
  		console.log('removeHost');
  		clientSockets.forEach(function(csk) {
  			saveSend(csk, JSON.stringify({
  				actionType: 'removeHost',
  			}));
  		});
  		hostSocket = null;
  	});
  } else {
  	console.log('only has one host');
  	sk.close();		
  }

  sk.on('message', function(data) {
  	var json = JSON.parse(data);
  	console.log(json.actionType);
  	actions[json.actionType](json.data);
  });


  ws.on("close", function() {
    // clearInterval(id)
  });
});