// backend/middleware/errorMiddleware.js

const notFound = (req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
};


export default (err, req, res, next) => {
  // This should handle the error and send the appropriate response
  if (res.statusCode < 400) {
      res.status(500);
  }
  errorHandler(err, req, res, next);
};

export { notFound };
