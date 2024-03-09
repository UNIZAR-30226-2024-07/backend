const { Router } = require('express')
const router = Router()
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')

router.put('/prueba', UserController.extractCoins)

module.exports = router