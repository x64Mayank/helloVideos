// Wraps async Express handlers and forwards rejected promises to next().
// This removes repetitive try/catch blocks in each controller method.
// Use it as: asyncHandler(async (req, res, next) => { ... }).


const asyncHandler = (requestHandler) => (req, res, next) => {
  Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
};
export { asyncHandler };
