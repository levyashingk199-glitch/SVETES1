export default (err, req, res, next) => {
  let status = err.status || 500, message = err.message || 'Ошибка сервера';
  if (err.name === 'CastError') { status = 400; message = 'Неверный идентификатор'; }
  if (err.name === 'ValidationError') status = 400;
  if (err.code === 11000) { status = 409; message = 'Запись уже существует'; }
  if (status === 500) console.error(err);
  res.status(status).json({ message });
};
