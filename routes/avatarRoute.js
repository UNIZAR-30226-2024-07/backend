const { Router } = require('express')
const router = Router()
const AvatarController = require('../controllers/avatarController')

router.post("/add", AvatarController.add)
router.delete("/eliminate/:id", AvatarController.eliminate)
router.put("/update/:id", AvatarController.update)
router.put("/avatarById/:id", AvatarController.avatarById)

module.exports = router