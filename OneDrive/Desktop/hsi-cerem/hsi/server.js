const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let clickCount = 0;
const maxClicks = 50;

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.emit('updateProgress', calculateProgress());

  socket.on('incrementClick', () => {
    if (clickCount < maxClicks) {
      clickCount++;
      io.emit('updateProgress', calculateProgress());
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

function calculateProgress() {
  return Math.min((clickCount / maxClicks) * 100, 100);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});