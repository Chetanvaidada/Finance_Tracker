const jwt = require('jsonwebtoken'); 

const authenticateJWT = (req, res, next) => {
    let token = req.cookies.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.render("login",{message : "Please login"});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.render("login",{message : "Please login"});
    }
};

module.exports = authenticateJWT; 