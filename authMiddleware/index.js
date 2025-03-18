const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No token provided", status: false });
  }

  try {
    const verified = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = verified; // Attach user data to the request
    next(); // Continue to the next middleware
  } catch (err) {
    return res.status(403).json({ message: "Invalid Token", status: false });
  }
};

module.exports = verifyToken;
