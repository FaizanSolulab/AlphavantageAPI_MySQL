import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import logger from "../config/logger";


interface AuthenticatedRequest extends Request {
  // userId: string;
  user?: any;
  token?: string;
  userId?: any;
}

const validateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  logger.info("Inside validateToken");

  try {
    let token: string | undefined;
    let authHeader = req.headers.Authorization || req.headers.authorization;

    if (Array.isArray(authHeader)) {
      authHeader = authHeader.join(",");
    }

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      logger.error("User is not authorized or token is missing in the header");
      return res
        .status(401)
        .send({
          error: "User is not authorized or token is missing in the header",
        });
    }
    token = authHeader.split(" ")[1];
    const decoded =  jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || ""
    );

    req.user = decoded;
    console.log("req.user", req.user)
    next();
  } catch (error) {
    logger.error(`Error in validateToken: ${(error as any).message}`);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token has expired" });
    }
    return res.status(401).json({
      error: "User is not authorized or token is invalid",
    });
  }
};

const verifyTokenAndAuthorization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  logger.info("Inside verifyTokenAndAuthorizationQuery");

  try {
    validateToken(req, res, () => {
      const userIdFromToken = req.user.id;
      const userIdFromQuery = req.query.id;
      console.log('here')
      console.log('userIdFromToken', userIdFromToken)
      console.log('userIdFromQuery', userIdFromQuery)
      if (!userIdFromQuery) {
        logger.error("Invalid request");
        res.status(400).json({ error: "Invalid request" });
      }
      if (userIdFromToken === userIdFromQuery || req.user.isAdmin) {
        next();
      } else {
        res.status(403).json("You are not allowed to do that!");
      }
    });
  } catch (error) {
    logger.error(
      `Error in verifyTokenAndAuthorization: ${(error as any).message}`
    );
    res.status(500).json({
      message: "Server error",
    });
  }
};

export { validateToken, verifyTokenAndAuthorization };