const http = require('http');
const net = require('net');
const express = require('express');
const dgram = require('dgram');
const app = express();


var serverlist;

app.get('/', (req, res) => {
    res.render();
});

app.get('/discover/:ip', (req, res) => {
    // send self ip to the system for route discover
});

app.listen(3000, () => {
    console.log(`server is listening on port 3000`);
});