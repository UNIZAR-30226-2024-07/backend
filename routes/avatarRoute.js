const { Router } = require('express')
const router = Router()
const AvatarController = require('../controllers/avatarController')
const { authRequired } = require('../jwt/jwt')

router.put("/update/:id", authRequired, AvatarController.update)
// router.get("/avatarById/:id", authRequired, AvatarController.avatarById)
router.get("/avatarById/:id", AvatarController.avatarById)
// router.get("/allAvatars", authRequired, AvatarController.allAvatars)

// Funciones exclusivas del administrador
router.post("/add", authRequired, AvatarController.add)
router.delete("/eliminate/:id", authRequired, AvatarController.eliminate)

module.exports = router