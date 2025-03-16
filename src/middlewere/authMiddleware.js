const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  console.log(req?.header, "reqreqreqreqreq5555555");
  const token = req.header("Authorization");
  console.log(req, "reqreqreqreqreq");
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  try {
    const verified = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET
    );
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

module.exports = verifyToken;
