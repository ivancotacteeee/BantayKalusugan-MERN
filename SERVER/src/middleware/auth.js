import dotenv from "dotenv";
dotenv.config();

export const authorize = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Missing Authorization header.",
    });
  }
  const token = authHeader.split(" ")[1];
  if (!token || token !== process.env.API_KEY) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Invalid token." });
  }
  next();
};