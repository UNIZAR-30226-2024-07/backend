const { Router } = require('express')
const router = Router()
const UserController = require('../controllers/userController')

router.post("/add", addUser)

module.exports = router