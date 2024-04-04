const { Router } = require('express')
const router = Router()
const PBTController = require('../controllers/publicBoardTypeController')
const { isAdmin } = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')

// Añadir un tipo de mesa pública
router.post("/add", PBTController.add)

// Eliminar un tipo de mesa pública
router.delete("/eliminate", authRequired, isAdmin, PBTController.eliminate)

// Obtener todos los tipos de partidas públicas existentes
router.get("/getAll", authRequired, PBTController.getAll)

module.exports = router