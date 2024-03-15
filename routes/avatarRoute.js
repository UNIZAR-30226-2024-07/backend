const { Router } = require('express')
const router = Router()
const AvatarController = require('../controllers/avatarController')
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')
const { uploadFile } = require('../upload/upload')

router.put("/update/:id", authRequired, AvatarController.update)
// router.get("/avatarById/:id", authRequired, AvatarController.avatarById)
router.get("/avatarById/:id", AvatarController.avatarById)
// router.get("/getAllAvatars", authRequired, AvatarController.getAllAvatars)
router.get("/getAllAvatars", AvatarController.getAllAvatars)

// Funciones exclusivas del administrador
// router.post("/add", authRequired, UserController.isAdmin, upload.single('imageFileName'), AvatarController.add)
router.post("/add", uploadFile.single('imageFileName'), AvatarController.add)

// router.delete("/eliminate/:id", authRequired, UserController.isAdmin, AvatarController.eliminate)
router.delete("/eliminate/:id", AvatarController.eliminate)

module.exports = router