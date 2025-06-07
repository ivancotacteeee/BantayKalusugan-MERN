export const successHandler = (req, res, next) => {
  res.success = (data = null, message = "Operation successful", statusCode = 200) => {
    const response = {
      success: true,
      message,
      data
    };
    return res.status(statusCode).json(response);
  };
  next();
};