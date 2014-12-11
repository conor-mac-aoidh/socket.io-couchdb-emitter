
# socket.io-couchdb-emitter

`socket.io-couchdb-emitter` allows you to communicate with socket.io servers
easily from non-socket.io processes.

## How to use

```js
var io = require('socket.io-couchdb-emitter')({ host: '127.0.0.1', port: 5984, db : 'socket.io' });
setInterval(function(){
  io.emit('time', new Date);
}, 5000);
```
