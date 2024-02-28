const { Router } = require('express')
const router = Router()
const UserController = require('../controllers/userController')

router.post("/add", UserController.add)

module.exports = router