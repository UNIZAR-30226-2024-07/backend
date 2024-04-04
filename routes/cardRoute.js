const { Router } = require('express')
const router = Router()
const CardController = require('../controllers/cardController')
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')
const { uploadFile } = require('../upload/upload')

router.get("/cardById/:id", authRequired, CardController.cardById)
router.get("/getAllCards", authRequired, CardController.getAllCards)
router.get("/currentCard", authRequired, CardController.currentCard)
router.get("/currentCardById/:id", authRequired, CardController.currentCardById)

// Funciones exclusivas del administrador
router.post("/add", authRequired, UserController.isAdmin, uploadFile.single('imageFileName'), CardController.add)
router.put("/update/:id", authRequired, UserController.isAdmin, CardController.update)
router.delete("/eliminate/:id", authRequired, UserController.isAdmin, CardController.eliminate)

module.exports = router