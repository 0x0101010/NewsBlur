// Generated by CoffeeScript 2.5.1
(function() {
  var ENV_DEV, ENV_DOCKER, ENV_PROD, REDIS_PORT, REDIS_SERVER, SECURE, app, certificate, fs, io, log, options, privateKey, redis;

  fs = require('fs');

  redis = require('redis');

  log = require('./log.js');

  ENV_DEV = process.env.NODE_ENV === 'development';

  ENV_PROD = process.env.NODE_ENV === 'production';

  ENV_DOCKER = process.env.NODE_ENV === 'docker';

  REDIS_SERVER = "redis";

  if (ENV_DEV) {
    REDIS_SERVER = 'localhost';
  } else if (ENV_PROD) {
    REDIS_SERVER = 'db-redis-user.service.nyc1.consul';
  }

  SECURE = !!process.env.NODE_SSL;

  REDIS_PORT = ENV_DOCKER ? 6579 : 6379;

  // client = redis.createClient 6379, REDIS_SERVER

  // RedisStore  = require 'socket.io/lib/stores/redis'
  // rpub        = redis.createClient 6379, REDIS_SERVER
  // rsub        = redis.createClient 6379, REDIS_SERVER
  // rclient     = redis.createClient 6379, REDIS_SERVER
  log.debug("Starting NewsBlur unread count server...");

  if (!ENV_DEV && !process.env.NODE_ENV) {
    log.debug("Specify NODE_ENV=<development,production>");
    return;
  } else if (ENV_DEV) {
    log.debug("Running as development server");
  } else {
    log.debug("Running as production server");
  }

  if (SECURE) {
    privateKey = fs.readFileSync('/srv/newsblur/config/certificates/newsblur.com.key').toString();
    certificate = fs.readFileSync('/srv/newsblur/config/certificates/newsblur.com.crt').toString();
    // ca = fs.readFileSync('./config/certificates/intermediate.crt').toString()
    options = {
      port: 8889,
      key: privateKey,
      cert: certificate
    };
    app = require('https').createServer(options);
    io = require('socket.io')(app, {
      path: "/v3/socket.io"
    });
    app.listen(options.port);
    log.debug(`Listening securely on port ${options.port}`);
  } else {
    options = {
      port: 8888
    };
    app = require('http').createServer();
    io = require('socket.io')(app, {
      path: "/v3/socket.io"
    });
    app.listen(options.port);
    log.debug(`Listening on port ${options.port}`);
  }

  // io.set('transports', ['websocket'])

  // io.set 'store', new RedisStore
  //     redisPub    : rpub
  //     redisSub    : rsub
  //     redisClient : rclient
  io.on('connection', function(socket) {
    var ip;
    ip = socket.handshake.headers['X-Forwarded-For'] || socket.handshake.address;
    socket.on('subscribe:feeds', (feeds, username) => {
      var ref;
      this.feeds = feeds;
      this.username = username;
      log.info(this.username, `Connecting (${this.feeds.length} feeds, ${ip}),` + ` (${io.engine.clientsCount} connected) ` + ` ${SECURE ? "(SSL)" : "(non-SSL)"}`);
      if (!this.username) {
        return;
      }
      socket.on("error", function(err) {
        return log.debug(`Error (socket): ${err}`);
      });
      if ((ref = socket.subscribe) != null) {
        ref.quit();
      }
      socket.subscribe = redis.createClient(REDIS_PORT, REDIS_SERVER);
      socket.subscribe.on("error", (err) => {
        var ref1;
        log.info(this.username, `Error: ${err} (${this.feeds.length} feeds)`);
        return (ref1 = socket.subscribe) != null ? ref1.quit() : void 0;
      });
      socket.subscribe.on("connect", () => {
        var feeds_story;
        log.info(this.username, `Connected (${this.feeds.length} feeds, ${ip}),` + ` (${io.engine.clientsCount} connected) ` + ` ${SECURE ? "(SSL)" : "(non-SSL)"}`);
        socket.subscribe.subscribe(this.feeds);
        feeds_story = this.feeds.map(function(f) {
          return `${f}:story`;
        });
        socket.subscribe.subscribe(feeds_story);
        return socket.subscribe.subscribe(this.username);
      });
      return socket.subscribe.on('message', (channel, message) => {
        var event_name;
        event_name = 'feed:update';
        if (channel === this.username) {
          event_name = 'user:update';
        } else if (channel.indexOf(':story') >= 0) {
          event_name = 'feed:story:new';
        }
        log.info(this.username, `Update on ${channel}: ${event_name} - ${message}`);
        return socket.emit(event_name, channel, message);
      });
    });
    return socket.on('disconnect', () => {
      var ref, ref1;
      if ((ref = socket.subscribe) != null) {
        ref.quit();
      }
      return log.info(this.username, `Disconnect (${(ref1 = this.feeds) != null ? ref1.length : void 0} feeds, ${ip}),` + ` there are now ${io.engine.clientsCount} users. ` + ` ${SECURE ? "(SSL)" : "(non-SSL)"}`);
    });
  });

  io.sockets.on('error', function(err) {
    return log.debug(`Error (sockets): ${err}`);
  });

}).call(this);
