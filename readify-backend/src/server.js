require('dotenv').config();
const os = require('os');
const app = require('./app');
const initDb = require('./db/init');
const { startQuoteLikeCleanupJob } = require('./jobs/cleanupQuoteLikes');

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

function logServerUrls(port) {
  const interfaces = os.networkInterfaces();

  console.log('🚀 Server running:');
  console.log(`Local:   http://localhost:${port}`);

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`Network: http://${iface.address}:${port}`);
      }
    }
  }
}

function startServer(port, host) {
  const server = app.listen(port, host, () => {
    logServerUrls(port);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Backend will not start.`);
      process.exit(1);
    }

    console.error('Server failed to start:', err);
    process.exit(1);
  });
}

(async () => {
  try {
    await initDb(); // ensure tables exists + resets temp_users
    startQuoteLikeCleanupJob(); //ensure cleanup job is started after db is initialized
    app.locals.dbReady = true;
    startServer(PORT, HOST);
  } catch (err) {
    console.error('Database initialization failed:', err);
    app.locals.dbReady = false;
    startServer(PORT, HOST);
    console.log('⚠️ Server started in degraded mode. Database requests will return 503 until the DB is reachable.');
  }
})();