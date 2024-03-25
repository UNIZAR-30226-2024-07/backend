const { Router } = require('express')
const router = Router()
const PBTController = require('../controllers/publicBoardTypeController')
const { isAdmin } = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')

// Añadir un tipo de mesa pública
router.post("/add", authRequired, isAdmin, PBTController.add)

// Eliminar un tipo de mesa pública
router.delete("/eliminate", authRequired, isAdmin, PBTController.eliminate)

module.exports = router