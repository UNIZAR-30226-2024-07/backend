const { secretToken } = require('../config')
const jwt = require("jsonwebtoken")
const User = require('../models/userSchema')

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

// const authRequired = (req, res, next) => {
//     const cookies = req.cookies
//     const token = cookies.token

//     if (!token) {
//         return res.status(400).json({
//             status: "error",
//             message: "Autorización denegada por falta de token"
//         })
//     }

//     jwt.verify(token, secretToken.key, (err, user) => {
//         if (err) {
//             return res.status(400).json({
//                 status: "error",
//                 message: "Token inválido"
//             })    
//         }
//         req.user = user
//         next()
//     })
// }

const authRequired = (req, res, next) => {
    if(!req.headers.authorization){
        return res.status(400).json({
            status: "error",
            message: "La peticion no tiene la cabecera de autenticación"
        })
    }
    const token = req.headers.authorization.replace(/['"]+/g, '')
    try{
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
    }catch(error){
        return res.status(400).json({
            status: "error",
            message: "Token invalida",
            error
        })
    }
}

// Verifica que el token del usuario sea correcto
const verifyToken = async (req, res) => {
    if(!req.headers.authorization){
        return res.status(400).json({
            status: "error",
            message: "La peticion no tiene la cabecera de autenticación"
        })
    }
    const token = req.headers.authorization.replace(/['"]+/g, '')
  
    jwt.verify(token, secretToken.key, async (err, user) => {
        if (err) {
            return res.status(400).json({
                status: "error",
                message: "Token inválido"
            })   
        }
  
        const userFound = await User.findById(user.id);
        if (!userFound) {
            return res.status(400).json({
                status: "error",
                message: "El token no equivale a ningún usuario del sistema"
            })
        }
  
        return res.status(200).json({
            status: "success",
            message: "Validado correctamente",
            user: userFound
        })
    });
}

module.exports = {
    createAccessToken,
    authRequired,
    verifyToken
}