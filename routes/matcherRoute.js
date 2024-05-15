const { Router } = require('express')
const router = Router()
const MatcherController = require('../controllers/matcherContoller')
const { authRequired } = require('../jwt/jwt')

// Enviar solicitud de amistad a una persona
router.put("/cancelGame", authRequired, MatcherController.cancelGame)

module.exports = router