const { Router } = require('express')
const router = Router()
const UserController = require('../controllers/userController')
const { authRequired } = require('../jwt/jwt')

router.post('/add', UserController.add)
router.put('/update', authRequired, UserController.update)
router.delete('/eliminate', authRequired, UserController.eliminate)
router.get('/userById/:id', authRequired, UserController.userById)
router.post('/login', UserController.login)
router.post('/logout', authRequired, UserController.logout)
router.put('/buyAvatar', authRequired, UserController.buyAvatar)
router.put('/changeAvatar', authRequired, UserController.changeAvatar)
router.put('/buyCard', authRequired, UserController.buyCard)
router.put('/changeCard', authRequired, UserController.changeCard)
router.put('/buyRug', authRequired, UserController.buyRug)
router.put('/changeRug', authRequired, UserController.changeRug)
router.put('/getReward', authRequired, UserController.getReward)

// Funciones exclusivas del administrador
router.put('/extractCoins/:id', authRequired, UserController.extractCoins)
router.put('/insertCoins/:id', authRequired, UserController.insertCoins)

module.exports = router