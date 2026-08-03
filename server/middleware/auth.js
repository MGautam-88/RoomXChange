import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({ message: "Not authorized, token missing." });
		}

		const token = authHeader.split(" ")[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		req.user = {
			id: decoded.id,
			role: decoded.role,
		};

		next();
	} catch (error) {
		return res.status(401).json({ message: "Not authorized, token invalid." });
	}
};

export const authorize = (...roles) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ message: "Not authorized." });
		}

		if (!roles.includes(req.user.role)) {
			return res.status(403).json({ message: "Forbidden: insufficient role." });
		}

		next();
	};
};
