const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`Received: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello from test server!',
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  }, null, 2));
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
