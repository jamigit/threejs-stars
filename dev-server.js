// Simple development server with live reload
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Live reload script to inject into HTML
const liveReloadScript = `
<script>
(function() {
    const ws = new WebSocket('ws://localhost:${PORT + 1}');
    ws.onmessage = function(event) {
        if (event.data === 'reload') {
            window.location.reload();
        }
    };
})();
</script>`;

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeType });
            
            // Inject live reload script into HTML files
            if (mimeType === 'text/html') {
                content = content.toString().replace('</body>', liveReloadScript + '</body>');
            }
            
            res.end(content, 'utf-8');
        }
    });
});

// WebSocket server for live reload
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: PORT + 1 });

// Watch for file changes
const chokidar = require('chokidar');
const watcher = chokidar.watch('.', {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
});

watcher.on('change', (path) => {
    console.log(`File changed: ${path}`);
    // Notify all connected clients to reload
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send('reload');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Development server running at http://localhost:${PORT}`);
    console.log(`📡 Live reload enabled - files will auto-refresh on save`);
    console.log(`🛑 Press Ctrl+C to stop the server`);
});
