const { Router } = require('express')
const router = Router()
const AvatarController = require('../controllers/avatarController')
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')

router.put("/update/:id", authRequired, AvatarController.update)
router.get("/avatarById/:id", authRequired, AvatarController.avatarById)
router.get("/getAllAvatars", authRequired, AvatarController.getAllAvatars)

// Funciones exclusivas del administrador
router.post("/add", authRequired, UserController.isAdmin, AvatarController.add)
router.delete("/eliminate/:id", authRequired, UserController.isAdmin, AvatarController.eliminate)

module.exports = router