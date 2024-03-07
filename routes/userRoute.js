const { Router } = require('express')
const router = Router()
const UserController = require('../controllers/userController')

router.post('/add', UserController.add)
router.put('/update/:id', UserController.update)
router.delete('/eliminate/:id', UserController.eliminate)
router.get('/userById/:id', UserController.userById)
router.post('/login', UserController.login)
router.put('/extractCoins/:id', UserController.extractCoins)
router.put('/insertCoins/:id', UserController.insertCoins)
router.put('/buyAvatar/:id', UserController.buyAvatar)
router.put('/changeAvatar/:id', UserController.changeAvatar)
router.put('/buyCard/:id', UserController.buyCard)
router.put('/changeCard/:id', UserController.changeCard)
router.put('/buyRug/:id', UserController.buyRug)
router.put('/changeRug/:id', UserController.changeRug)

module.exports = router