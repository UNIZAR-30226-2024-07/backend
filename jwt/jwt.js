const { secretToken } = require('../config')
const jwt = require("jsonwebtoken")

function createAccessToken(payload) {
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,
            secretToken.key,
            { expiresIn: "1d" },
        
            // Callback
            (err, token) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(token)
                }
            }
        )        
    })
}

const authRequired = (req, res, next) => {
    const cookies = req.cookies
    const token = cookies.token

    if (!token) {
        return res.status(400).json({
            status: "error",
            message: "Autorización denegada por falta de token"
        })
    }

    jwt.verify(token, secretToken.key, (err, user) => {
        if (err) {
            return res.status(400).json({
                status: "error",
                message: "Token inválido"
            })    
        }
        req.user = user
        next()
    })
}

module.exports = {
    createAccessToken,
    authRequired
}