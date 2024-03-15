const config = {
    appConfig: {
        port: process.env.APP_PORT
    },
    db: {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        passwd: process.env.DB_PASSWD,
    },
    secretToken: {
        key: process.env.TOKEN_SECRET
    },
    dirUploads: process.env.DIR_UPLOAD
}

module.exports = config