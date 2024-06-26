const { Router } = require('express')
const router = Router()
const AvatarController = require('../controllers/avatarController')
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')
const { uploadFile } = require('../upload/upload')

router.get("/avatarById/:id", authRequired, AvatarController.avatarById)
router.get("/getAllAvatars", authRequired, AvatarController.getAllAvatars)
router.get("/getAvatarStore", authRequired, AvatarController.getAvatarStore)
router.get("/getAllMyAvatars", authRequired, AvatarController.getAllMyAvatars)
router.get("/currentAvatar", authRequired, AvatarController.currentAvatar)
router.get("/currentAvatarById/:id", authRequired, AvatarController.currentAvatarById)

// Funciones exclusivas del administrador
router.post("/add", authRequired, UserController.isAdmin, uploadFile.single('imageFileName'), AvatarController.add)
router.put("/update/:id", authRequired, UserController.isAdmin, AvatarController.update)
router.delete("/eliminate/:id", authRequired, UserController.isAdmin, AvatarController.eliminate)

module.exports = router