const { Router } = require('express')
const router = Router()
const UserController = require('../controllers/userController')
const { authRequired, verifyToken } = require('../jwt/jwt')

router.post('/add', UserController.add)
router.put('/update', authRequired, UserController.update)
router.get('/userById/:id', authRequired, UserController.userById)
router.get('/getAllUsers', authRequired, UserController.getAllUsers)
router.post('/login', UserController.login)
router.post('/logout', authRequired, UserController.logout)
router.put('/buyAvatar', authRequired, UserController.buyAvatar)
router.put('/changeAvatar', authRequired, UserController.changeAvatar)
router.put('/buyCard', authRequired, UserController.buyCard)
router.put('/changeCard', authRequired, UserController.changeCard)
router.put('/buyRug', authRequired, UserController.buyRug)
router.put('/changeRug', authRequired, UserController.changeRug)
router.put('/getDailyReward', authRequired, UserController.getDailyReward)
router.get('/coinsDailyReward', authRequired, UserController.coinsDailyReward)
router.get('/getPausedBoard', authRequired, UserController.getPausedBoard)

// Funciones exclusivas del administrador
router.put('/extractCoins/:id', authRequired, UserController.isAdmin, UserController.extractCoins)
router.put('/insertCoins/:id', authRequired, UserController.isAdmin, UserController.insertCoins)
router.delete('/eliminate/:id', authRequired, UserController.isAdmin, UserController.eliminate)

// Función verificar token
router.get('/verify', verifyToken)

module.exports = router