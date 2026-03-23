export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (error, _req, res, _next) => {
  const status = error.status || 500;
  const payload = {
    message: error.message || "Internal server error"
  };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = error.stack;
  }

  res.status(status).json(payload);
};
