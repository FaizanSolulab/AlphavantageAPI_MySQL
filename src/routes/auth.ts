import express from 'express';
import {body} from 'express-validator';
import {registerUser}  from '../controllers/auth';
import {verifyOtp}  from '../controllers/auth';

const router = express.Router();


router.post('/',[
    body('email',"invalid email address")
    .notEmpty()
    .escape()
    .trim().isEmail(),
    body('password',"The password must be of minimum 4 characters length")
    .notEmpty()
    .trim()
    .isLength({min: 4}),
], registerUser);
router.post('/verify-otp', verifyOtp);

export {registerUser, verifyOtp};