const { Router } = require('express')
const router = Router()
const AvatarController = require('../controllers/avatarController')

router.post("/add", AvatarController.addUser)

module.exports = router