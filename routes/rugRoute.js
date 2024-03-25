const { Router } = require('express')
const router = Router()
const RugController = require('../controllers/rugController')
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')
const { uploadFile } = require('../upload/upload')

router.put("/update/:id", authRequired, RugController.update)
router.get("/rugById/:id", authRequired, RugController.rugById)
router.get("/getAllRugs", authRequired, RugController.getAllRugs)

// Funciones exclusivas del administrador
router.post("/add", authRequired, UserController.isAdmin, uploadFile.single('imageFileName'), RugController.add)
router.delete("/eliminate/:id", authRequired, UserController.isAdmin, RugController.eliminate)

module.exports = router