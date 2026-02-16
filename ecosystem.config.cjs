module.exports = {
  apps: [
    {
      name: "ai-test-ui",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 2053",
      cwd: "/var/www/html/projects/ai-test-ui",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      // Memory & restart
      max_memory_restart: "512M",
      max_restarts: 10,
      min_uptime: "10s",
      // Graceful shutdown
      kill_timeout: 15000,
      listen_timeout: 10000,
      // Logging
      output: "/var/www/html/projects/ai-test-ui/logs/out.log",
      error: "/var/www/html/projects/ai-test-ui/logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_size: "10M",
      max_file: 5,
    },
  ],
};
