import jwt from "jsonwebtoken";
import { FORBIDDEN, UNAUTHORIZED } from "../constant/HttpStatus.js";
import { createError } from "../utils/error.js";

export const verifyTokenAdmin = (req, res, next) => {
    const token_admin = req.cookies.access_token_admin;
    if (!token_admin) return next(createError(UNAUTHORIZED, "You are not authenticated"));

    jwt.verify(token_admin, process.env.JWT_ADMIN, (err, admin) => {
        if (err) {
            return next(createError(FORBIDDEN, "Token is not valid"));
        } else {
            req.admin = admin;
            next();
        }
    });
};