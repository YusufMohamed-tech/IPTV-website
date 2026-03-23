export const validate = (schema) => (req, _res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    req.body = result.body;
    req.query = result.query;
    req.params = result.params;
    next();
  } catch (error) {
    error.status = 400;
    next(error);
  }
};
