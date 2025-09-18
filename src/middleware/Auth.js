const jwt = require('jsonwebtoken');


const auth = async (req, res, next) => {

    const token = req.header("Authorization");
    
    if (!token) {
        res.status(401).json({ error: "Token not found" })
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET || "SECRET", (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Invalid or expired token" });
            }
            req.user = decoded;
            next();
        });

    } catch (error) {
        res.status(401).json({ message: error.message })
    }
}

module.exports = auth;