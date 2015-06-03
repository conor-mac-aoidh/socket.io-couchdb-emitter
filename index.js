
/**
 * Module dependencies.
 */

var parser = require('socket.io-parser');
var hasBin = require('has-binary-data');
var msgpack = require('msgpack-js');
var debug = require('debug')('socket.io-emitter');
var request = require('request');

/**
 * Module exports.
 */

module.exports = Emitter;

/**
 * Flags.
 *
 * @api public
 */

var flags = [
  'json',
  'volatile',
  'broadcast'
];

/**
 * Socket.IO redis based emitter.
 *
 * @param {Object} redis client (optional)
 * @param {Object} options
 * @api public
 */

function Emitter(opts){
  if (!(this instanceof Emitter)) return new Emitter(opts);
  opts = opts || {};

  // handle uri string
  if (opts.host && !opts.port) {
    // using basic auth
    if(opts.host.indexOf('@') !== -1){
      opts.host = opts.host.split(':');
      opts.port = opts.host.pop();
      opts.host = opts.host.join(':');
    }
    else{
      opts.host = opts.host.split(':');
      opts.host = opts.host[0];
      opts.port = opts.host[1];
    }
  }

  if(typeof opts.encode === 'undefined'){
    this.encode = false;
  }
  else{
    this.encode = opts.encode;
  }
  this.port = opts.port;
  this.host = opts.host;
  this.db = opts.db;
  this.base = opts.host + ':' + opts.port + '/' + opts.db;

  this.key = (opts.key || 'socket.io') + '#emitter';

  this._rooms = [];
  this._flags = {};
}

/**
 * Apply flags from `Socket`.
 */

flags.forEach(function(flag){
  Emitter.prototype.__defineGetter__(flag, function(){
    debug('flag %s on', flag);
    this._flags[flag] = true;
    return this;
  });
});

/**
 * Limit emission to a certain `room`.
 *
 * @param {String} room
 */

Emitter.prototype.in =
Emitter.prototype.to = function(room){
  if (!~this._rooms.indexOf(room)) {
    debug('room %s', room);
    this._rooms.push(room);
  }
  return this;
};

/**
 * Limit emission to certain `namespace`.
 *
 * @param {String} namespace
 */

Emitter.prototype.of = function(nsp) {
  debug('nsp set to %s', nsp);
  this._flags.nsp = nsp;
  return this;
};

/**
 * Send the packet.
 *
 * @api private
 */

Emitter.prototype.emit = function(){
  // packet
  var args = Array.prototype.slice.call(arguments);
  var packet = {};
  packet.type = hasBin(args) ? parser.BINARY_EVENT : parser.EVENT;
  packet.data = args;
  // set namespace to packet
  if (this._flags.nsp) {
    packet.nsp = this._flags.nsp;
    delete this._flags.nsp;
  } else {
    packet.nsp = '/';
  }

  debug('emitting data: ', [packet, {
    rooms : this._rooms,
    flags : this._flags
  }]);
  debug('namespace: ', packet.nsp);

  // publish
  var msg;
  if(this.encode){
    msg = msgpack.encode([packet, {
      rooms : this._rooms,
      flags : this._flags
    }]).toString('hex');
    debug('raw data: ', msg);
    debug('msg contents: ', msgpack.decode(new Buffer(msg, 'hex')));
  }
  else{
    msg = [packet, {
      rooms : [],
      flags : {}
    }];
    debug('msg contents: ', msg);
  }
  request({
    url     : this.base,
    method  : 'POST',
    body    : {
      channel : this.key,
      msg     : msg
    },
    json    : true
  }, function(err){
    // log errors
    if(err){
      console.error('[socket.io-couchdb-emitter]: error sending message to couch: ', err);
    } 
  });

  // reset state
  this._rooms = [];
  this._flags = {};

  return this;
};

/**
 * Create a redis client from a
 * `host:port` uri string.
 *
 * @param {String} uri
 * @return {Client} node client
 * @api private
 */

function clientUri(uri){
  uri = uri.split(':');
  return client(uri[1], uri[0]);
}
