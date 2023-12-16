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

export const verifyUserAdmin = (req, res, next) => {
    verifyTokenAdmin(req, res, next, () => { 
        if (req.user.role == "Admin") {
            next();
        } else {
            return next(createError(UNAUTHORIZED, "You are not admin"));
        }
    });
};

export const verifyUserInhaber = (req, res, next) => {
    verifyTokenAdmin(req, res, next, () => { 
        if (req.user.role == "Inhaber") {
            next();
        } else {
            return next(createError(UNAUTHORIZED, "You are not inhaber"));
        }
    });
};

export const verifyUserManager = (req, res, next) => {
    verifyTokenAdmin(req, res, next, () => { 
        if (req.user.role == "Manager") {
            next();
        } else {
            return next(createError(UNAUTHORIZED, "You are not manager"));
        }
    });
};

export const verifyTokenEmployee = (req, res, next) => {
    const token_employee = req.cookies.access_token_employee;
    if (!token_employee) return next(createError(UNAUTHORIZED, "You are not employee"));

    jwt.verify(token_employee, process.env.JWT_EMPLOYEE, (err, employee) => {
        if (err) {
            return next(createError(FORBIDDEN, "Token is not valid"));
        } else {
            req.employee = employee;
            next();
        }
    });
};