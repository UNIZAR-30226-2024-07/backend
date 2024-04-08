const { Router } = require('express')
const router = Router()
const RugController = require('../controllers/rugController')
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')
const { uploadFile } = require('../upload/upload')

router.get("/rugById/:id", authRequired, RugController.rugById)
router.get("/getAllRugs", authRequired, RugController.getAllRugs)
router.get("/getAllMyRugs", authRequired, RugController.getAllMyRugs)
router.get("/currentRug", authRequired, RugController.currentRug)
router.get("/currentRugById/:id", authRequired, RugController.currentRugById)

// Funciones exclusivas del administrador
router.post("/add", authRequired, UserController.isAdmin, uploadFile.single('imageFileName'), RugController.add)
router.put("/update/:id", authRequired, UserController.isAdmin, RugController.update)
router.delete("/eliminate/:id", authRequired, UserController.isAdmin, RugController.eliminate)

module.exports = router