import { createLogger, format, transports } from "winston";
//creating new instance of logger using createLogger() method
const logger = createLogger({
    level: 'info',
    format: format.json(),
    transports:[
        new transports.Console(), //logs messages to the console
        new transports.File({filename: 'error.log', level:'error'}),//logs error messages to a file named error.log
        new transports.File({filename: 'combined.log'}),//logs all messages to a file named combined.log

    ],
});

export default logger;