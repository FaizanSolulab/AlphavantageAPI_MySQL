import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Twilio } from "twilio";
import logger from "../config/logger";
import nodemailer from "nodemailer";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import dbConnection from "../config/dbConnection";
dotenv.config();

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const registerUser = async (req: any, res: any) => {
  logger.info("inside controllers/auth.ts /registerUser");

  try {
    const { phoneNumber, password, channel, email } = req.body;

    if (!channel) {
      logger.error("Please enter the channel you wish to receive OTP on");
      return res
        .status(400)
        .send({ error: "Please enter the channel you wish to receive OTP on" });
    }

    if (channel == "sms") {
      if (!phoneNumber) {
        logger.error(
          "Phone number field is mandatory in case the channel is sms"
        );
        return res.status(400).send({
          error: "Phone number field is mandatory in case the channel is sms",
        });
      }
      if (!password) {
        logger.error("Cannot proceed without entering the password");
        return res
          .status(400)
          .send({ error: "Cannot proceed without entering the password" });
      }

      logger.info("Inside sms channel of register user");
      try {
        if (phoneNumber.length !== 10) {
          logger.error("Invalid Phone Number");
          res.status(400).json({ error: "Invalid Phone Number" });
        }

        const [userRows]: any = await dbConnection
          .promise()
          .query("SELECT * FROM users WHERE phoneNumber = ?", [phoneNumber]);
        if (userRows.length > 0) {
          const user = userRows[0];
          if (user) {
            logger.error("Phone number already taken");
            return res
              .status(400)
              .json({ error: "User with this phone number already exists" });
          }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        logger.info(
          `Password hashed successfully for user with phone number: ${phoneNumber}`
        );

        const [userCreate]: any = await dbConnection
          .promise()
          .query("INSERT INTO users SET ?", {
            phoneNumber: phoneNumber,
            email: email,
            password: hashedPassword,
          });

        logger.info(`User successfully created: ${[userCreate]}`);

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await dbConnection.promise().query("INSERT INTO otp SET ?", {
          phone: phoneNumber,
          code: otpCode,
        });
        // console.log("otp", otp)
        const phoneNumberWithPlus = "+91" + phoneNumber;
        await twilioClient.messages.create({
          body: `Your OTP code is ${otpCode}`,
          from: "+15074486411",
          to: phoneNumberWithPlus,
        });
        logger.info("Sending OTP");

        res.status(201).json({
          phoneNumber,
          otpRequested: true,
          verified: false,
        });
      } catch (error) {
        logger.error(`Error in sms channel of user registration: ${error}`);
        res.status(500).json({ error: "Server error" });
      }
    }

    if (channel == "email") {
      if (!email) {
        logger.error("Email field is mandatory in case the channel is email");
        return res.status(400).send({
          error: "Email field is mandatory in case the channel is email",
        });
      }
      if (!password) {
        logger.error("Cannot proceed without entering the password");
        return res
          .status(400)
          .send({ error: "Cannot proceed without entering the password" });
      }

      logger.info("Inside email channel of register user");

      try {
        function isValidEmail(email: string): boolean {
          const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return regex.test(email);
        }
        const isValid = isValidEmail(email);
        console.log("Email Valid: ", isValid);

        if (!isValid) {
          logger.error("Email is not valid one");
          res.status(400).json({ error: "Invalid Email" });
        }
        const emailQuery = `SELECT * FROM users where email= '${email}'`;
        dbConnection.query(emailQuery, async (error, data: any) => {
          try {
            if (data.length > 0) {
              logger.info("User already exists with this email ");
              return res.status(400).json({
                message: "User already exists with this email",
              });
            } else {
              const hashedpassword = await bcrypt.hash(password, 10);
              logger.info(
                `Password hashed successfully for user with email: ${email}`
              );
              console.log("hashedPassword", hashedpassword);

              const [userCreate]: any = await dbConnection
                .promise()
                .query("INSERT INTO users SET ?", {
                  email: email,
                  phoneNumber: phoneNumber,
                  password: hashedpassword,
                });

              logger.info(
                `User successfully created with id ${userCreate.insertId}`
              );

              //sending otp on mail
              const sendEmail = async () => {
                logger.info("inside sendEmail");
                const otpCode = Math.floor(
                  100000 + Math.random() * 900000
                ).toString();
                dbConnection.query("INSERT INTO otp SET ?", {
                  eemail: email,
                  code: otpCode,
                });

                const transporter = nodemailer.createTransport({
                  service: "gmail",
                  auth: {
                    user: "faizanmansuri316@gmail.com",
                    pass: "eejevistvviuzqjn",
                  },
                });

                const mailOptions = {
                  from: "faizanmansuri316@gmailcom",
                  to: email,
                  subject: "Verify OTP",
                  text: `Your OTP code is ${otpCode}`,
                };

                transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    logger.info("Email Sent", +info.response);
                  }
                });
              };
              await sendEmail();
              return res.status(201).json({
                otpRequested: true,
                verified: false,
              });
            }
          } catch (error) {
            res.json({
              message: error,
            });
          }
        });
      } catch (error) {
        logger.error(`Error in email channel of user registration: ${error}`);
        res.status(500).json({ error: "Server error" });
      }
    }
  } catch (error) {
    logger.error(error);
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const verifyOtp = async (req: any, res: any) => {
  logger.info("inside controllers/auth.ts /verifyOtp");
  try {
    const { otp } = req.body;
    const { phoneNumber, email } = req.query;

    if (req.query.phoneNumber) {
      logger.info("Inside sms channel of verifyOTP");
      try {
        if (!otp) {
          logger.error("Please enter OTP first");
          res.status(400).send({ error: "Please enter OTP first" });
        }

        const otpData: any = await dbConnection
          .promise()
          .query(
            "SELECT * FROM otp WHERE phone = ? ORDER BY createdAt DESC LIMIT 1",
            [phoneNumber]
          );

        if (otp != otpData[0][0].code) {
          logger.error("OTP not found");
          return res.status(404).json({ error: "OTP not found" });
        }

        logger.info("Otp successfully verified");

        // Update user's verified status to true
        const [updatedUser] = await dbConnection
          .promise()
          .query("UPDATE users SET verified = ? WHERE phoneNumber = ?", [
            true,
            phoneNumber,
          ]);

        console.log("updatedUser", updatedUser);

        const userRows: any = await dbConnection
          .promise()
          .query("SELECT *FROM users WHERE phoneNumber = ?", [phoneNumber]);
        const user = userRows[0];
        console.log("user", user);

        // Delete the OTP data
        dbConnection.query("DELETE FROM otp WHERE phone = ?", [phoneNumber]);

        const accessToken = jwt.sign(
          {
            id: user[0]?.id,
            phoneNumber: user[0]?.phoneNumber,
            password: user[0]?.password,
            verified: true,
          },
          process.env.ACCESS_TOKEN_SECRET || "",
          {
            expiresIn: "24h",
          }
        );

        return res.status(200).json({ accessToken, user });
      } catch (error) {
        logger.error(`Error in sms channel of verifyOTP: ${error}`);
        res.status(500).json({ error: "Server error" });
      }
    }

    if (req.query.email) {
      logger.info("Inside email channel of verifyOTP");
      try {
        if (!otp) {
          logger.error("Please enter OTP first");
          res.status(400).send({ error: "Please enter OTP first" });
        }

        const otpData: any = await dbConnection
          .promise()
          .query(
            "SELECT * FROM otp WHERE eemail = ? ORDER BY createdAt DESC LIMIT 1",
            [email]
          );

        if (otp != otpData[0][0].code) {
          logger.error("OTP not found");
          return res.status(404).json({ error: "OTP not found" });
        }

        logger.info("Otp has been successfully verified");

        const [updatedUser] = await dbConnection
          .promise()
          .query("UPDATE users SET verified = ? WHERE email = ?", [
            true,
            email,
          ]);

        console.log("updatedUser", updatedUser);

        const userRows: any = await dbConnection
          .promise()
          .query("SELECT *FROM users WHERE email = ?", [email]);
        const user = userRows[0];
        console.log("user", user);

        // Delete the OTP data
        dbConnection.query("DELETE FROM otp WHERE eemail = ?", [email]);

        const accessToken = jwt.sign(
          {
            id: user[0]?.id,
            email: user[0]?.email,
            password: user[0]?.password,
            verified: true,
          },
          process.env.ACCESS_TOKEN_SECRET || "",
          {
            expiresIn: "24h",
          }
        );

        return res.status(200).json({ accessToken, verified: true });
      } catch (error) {
        logger.error(`Error in email channel of verifyOTP: ${error}`);
        res.status(500).json({ error: "Server error" });
      }
    }
  } catch (error) {
    logger.error("Error occured in controllers/auth.ts /verify-otp", error);
    res.status(500).json({ error: "Server error" });
  }
};
