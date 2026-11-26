// PM2: автоперезапуск backend при падении и после перезагрузки сервера.
//   npm i -g pm2 && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'warntech-api',
      script: 'src/server.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 1000,
      min_uptime: '10s',
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      max_memory_restart: '400M',
      kill_timeout: 10000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
