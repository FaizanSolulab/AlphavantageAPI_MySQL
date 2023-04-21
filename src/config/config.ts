import dotenv from "dotenv";

dotenv.config();

export const TWILIO = {
  serviceID: process.env.TWILIO_SERVICE_ID,
  accoundSID: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
};

export const dbConnection = {
  db: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },
  listPerPage: 10,
};