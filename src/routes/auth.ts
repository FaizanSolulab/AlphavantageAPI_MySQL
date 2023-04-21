import express from "express";
import { registerUser } from "../controllers/auth";
import { verifyOtp } from "../controllers/auth";

const router = express.Router();

router.post("/", registerUser);
router.post("/verify-otp", verifyOtp);

export { registerUser, verifyOtp };