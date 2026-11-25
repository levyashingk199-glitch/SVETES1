export const initSocket = io => {
  io.on('connection', s => {
    io.emit('online', io.engine.clientsCount);
    s.on('disconnect', () => io.emit('online', io.engine.clientsCount));
  });
};
