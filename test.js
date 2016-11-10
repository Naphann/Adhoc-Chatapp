const dgram = require('dgram');
const server = dgram.createSocket('udp4');
server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});
server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});
server.on('listening', () => {
  var address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});
server.bind(41234);
// var Discovery = require('udp-discovery').Discovery;
// var discover = new Discovery();
// discover.on('available', function(name, data, reason) {
//   console.log(data);
// });
// discover.on('unavailable', function(name, data, reason) {
//   console.log(data);
// });
// server listening 0.0.0.0:41234