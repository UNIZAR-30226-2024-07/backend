// Imports de esquemas necesarios
const User = require('../models/userSchema')
const Avatar = require('../models/avatarSchema')
const Rug = require('../models/rugSchema')
const Card = require('../models/cardSchema')
const Reward = require('../models/rewardSchema')
const bcrypt = require('bcrypt')
const { createAccessToken } = require('../jwt/jwt')

// Devuelve error si el usuario no es administrador
// Parámetros: req.userId
const isAdmin = async (req, res, next) => {
    const userId = req.userId

    const user = await User.findById(userId)
    if (!user) {
        return res.status(400).json({
            status: "error",
            message: "Usuario sin permisos"
        })
    }

    if (user.rol !== 'admin') {
        return res.status(400).json({
            status: "error",
            message: "Usuario sin permisos"
        })
    }
    next()
}

// Añade un nuevo usuario al sistema si su email y nick aún no existían
const add = async (req, res) => {
    let u = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!u.nick || !u.name || !u.surname || !u.email || !u.password ||
        u.nick.trim() === '' || u.name.trim() === '' || u.surname.trim() === '' || 
        u.email.trim() === '' || u.password.trim() === '') {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: nick, name, surname, email, password"
        })
    }

    try {
        // Se busca si hay algún usuario que ya tenga el nick o el email
        const oldUser = await User.findOne({ $or: [{ nick: u.nick }, 
                                                   { email: u.email }] })
        if (oldUser) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe un usuario con ese nick o email"
            })
        }

        // Si no lo hay, se crea el nuevo usuario
        const hPasswd = await bcrypt.hash(u.password, 10)
        const newUser = await  User.create({ nick: u.nick, 
                                   name: u.name, 
                                   surname: u.surname, 
                                   email: u.email, 
                                   password: hPasswd,
                                   coins: 0 })

        return res.status(200).json({
            status: "success",
            message: "Usuario añadido correctamente",
            user: newUser
        })
    } catch (e) {
        console.log(e)
        return res.status(400).json({
            status: "error",
            message: "Error interno al crear el usuario"
        })

    }
}

// Modifica un usuario ya existente si el nick y el email no estaban ocupados por otro usuario
const update = async (req, res) => {
    const userId = req.user.id
    const u = req.body

    try {
        // Borramos los campos que no queremos actualizar
        delete u.rol;
        delete u.coins;
        delete u.avatars;
        delete u.rugs;
        delete u.cards;

        // Si se quiere cambiar la contraseña, que no sea vacía y esté encriptada
        if ('password' in u) {
            if (u.password === '') {
                return res.status(400).json({
                    status: "error",
                    message: "La contraseña no puede ser una cadena vacía"
                })    
            } else {
                u.password = await bcrypt.hash(u.password, 10)
            }
        }

        // Actualizar el usuario por su ID y los campos especificados
        const updatedUser = await User.findByIdAndUpdate(userId, u, { new: true })

        if (!updatedUser) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Usuario actualizado correctamente",
            user: updatedUser
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar actualizar el usuario"
        })
    }
}

// Devuelve un usuario dado un id
const userById = async (req, res) => {
    const userId = req.params.id

    try {
        // Buscar el usuario por su ID
        const user = await User.findById(userId)

        // Si no se encontró, error
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Si se encontró, se devuelve el usuario
        return res.status(200).json({
            status: "success",
            message: "Usuario encontrado",
            user: user
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar buscar el usuario"
        })
    }
}

// Dado un nick y un password devuelve ‘error’ o ‘success’ dependiendo de si la 
// contraseña se corresponde a la del usuario con nickname ‘nick’.
const login = async (req, res) => {
    const u = req.body

    // Nos aseguramos de que los campos requeridos hayan sido enviados
    if (!u.nick || !u.password || u.nick.trim() === '' || u.password.trim() === '') {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: nick, password"
        })
    }

    try {
        // Se busca al usuario por su nick
        const user = await User.findOne({ nick: u.nick })

        // Si el usuario no existe, error
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado con el nick proporcionado"
            })
        }

        // Si existe un usuario con dicho nick, se verifica la contraseña
        const equal = await bcrypt.compare(u.password, user.password)
        if (!equal) {
            return res.status(400).json({
                status: "error",
                message: "Contraseña no válida"
            })
        }

        // Se crea el token y se responde
        const token = await createAccessToken({ id: user._id })
        res.cookie('token', token)
        return res.status(200).json({
            status: "success",
            message: "Credenciales válidas",
            user: user
        })

    } catch (e) {
        console.error(e)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al hacer login"
        })
    }
}

// Deslogueo del usuario actual
const logout = (req, res) => {
    res.cookie("token", "", {
        expires: new Date(0)
    })
    return res.status(200).json({
        status: "success",
        message: "Logout realizado"
    })

}

// Dado un id de Usuario y un nombre de avatar, añade el avatar a la lista de avatares
// del usuario y resta el precio del avatar a las monedas del usuario (si tiene suficientes).
const buyAvatar = async (req, res) => {
    const userId = req.user.id
    const avatarName = req.body.avatarName

    try {
        // Primero miramos que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }

        // Después se mira que el avatar exista
        const avatar = await Avatar.findOne({ image: avatarName })
        if (!avatar) {
            return res.status(404).json({
                status: "error",
                message: "El avatar no ha sido encontrado"
            })
        }

        // Ahora verificamos que el usuario no tuviera ya el avatar
        if (user.avatars.some(avatarItem => avatarItem.avatar.equals(avatar._id))) {
            return res.status(500).json({
                status: "error",
                message: "El usuario ya poseía en su inventario el avatar"
            })
        }

        // Se verifica si el usuario tiene las suficientes monedas para comprar el avatar
        if (user.coins < avatar.price) {
            return res.status(500).json({
                status: "error",
                message: "El usuario no tiene suficientes monedas para comprar el avatar"
            })
        }

        // Una vez hechas todas las comprobaciones, se resta el dinero del precio del avatar,
        // y se añade a su lista de avatares. El avatar comprado no es el actual por defecto
        user.coins -= avatar.price

        user.avatars.push({ avatar: avatar._id, current: false})

        await user.save()
        
        return res.status(200).json({
            status: "success",
            message: "El avatar ha sido añadido al inventario correctamente",
            user: user
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            status: "error",
            message: "Error al intentar comprar el avatar. Revisa que el ID y el nombre del avatar sean correctos"
        })
    }
}

// Dado un id de Usuario y un nombre de avatar, establece como avatar actual (en uso) el 
// pasado por parámetro (si el usuario lo posee).
const changeAvatar = async (req, res) => {
    const userId = req.user.id
    const avatarName = req.body.avatarName

    try {
        // Primero miramos que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }

        // Después se mira que el avatar exista
        const avatar = await Avatar.findOne({ image: avatarName })
        if (!avatar) {
            return res.status(404).json({
                status: "error",
                message: "El avatar no ha sido encontrado"
            })
        }

        // Se verifica que el usuario posea el avatar pasado como parámetro
        const newCurrent = user.avatars.find(avatarItem => avatarItem.avatar.equals(avatar._id))
        if (!newCurrent) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no posee el avatar"
            })
        }

        // Se busca si hay un avatar que tenga el current a true, y se pone a false
        const oldCurrent = user.avatars.find(avatarItem => avatarItem.current)
        if (oldCurrent) {
            oldCurrent.current = false
        }

        // El nuevo avatar seleccionado se pone a true
        newCurrent.current = true

        // Se guardan los resultados y se responde al cliente
        await user.save()

        return res.status(200).json({
            status: "success",
            message: "El avatar ha sido seleccionado correctamente",
            user: user
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            status: "error",
            message: "Error al intentar seleccionar un avatar. Revisa que el ID y el nombre del avatar sean correctos"
        })
    }
}

// Dado un id de Usuario y un nombre de diseño de carta, añade el diseño de carta a la lista de diseños de cartas
// del usuario y resta el precio del diseño a las monedas del usuario (si tiene suficientes).
const buyCard = async (req, res) => {
    const userId = req.user.id
    const cardName = req.body.cardName

    try {
        // Primero miramos que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }

        // Después se mira que el diseño de carta exista
        const card = await Card.findOne({ image: cardName })
        if (!card) {
            return res.status(404).json({
                status: "error",
                message: "El diseño de carta no ha sido encontrado"
            })
        }

        // Ahora verificamos que el usuario no tuviera ya el diseño de carta
        if (user.cards.some(cardItem => cardItem.card.equals(card._id))) {
            return res.status(500).json({
                status: "error",
                message: "El usuario ya poseía en su inventario el diseño de carta"
            })
        }

        // Se verifica si el usuario tiene las suficientes monedas para comprar el diseño de carta
        if (user.coins < card.price) {
            return res.status(500).json({
                status: "error",
                message: "El usuario no tiene suficientes monedas para comprar el diseño de carta"
            })
        }

        // Una vez hechas todas las comprobaciones, se resta el dinero del precio del diseño de carta,
        // y se añade a su lista de diseños de cartas. El diseño comprado no es el actual por defecto
        user.coins -= card.price

        user.cards.push({ card: card._id, current: false})

        await user.save()
        
        return res.status(200).json({
            status: "success",
            message: "El diseño de carta ha sido añadido al inventario correctamente",
            user
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            status: "error",
            message: "Error al intentar comprar el diseño de carta. Revisa que el ID y el nombre del diseño sean correctos"
        })
    }
}

// Dado un id de Usuario y un nombre de diseño de carta, establece como diseño de carta
// actual (en uso) el pasado por parámetro (si el usuario lo posee).
const changeCard = async (req, res) => {
    const userId = req.user.id
    const cardName = req.body.cardName

    try {
        // Primero miramos que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }

        // Después se mira que el diseño de carta exista
        const card = await Card.findOne({ image: cardName })
        if (!card) {
            return res.status(404).json({
                status: "error",
                message: "El diseño de carta no ha sido encontrado"
            })
        }

        // Se verifica que el usuario posea el diseño de carta pasado como parámetro
        const newCurrent = user.cards.find(cardItem => cardItem.card.equals(card._id))
        if (!newCurrent) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no posee el diseño de carta"
            })
        }

        // Se busca si hay un diseño de carta que tenga el current a true, y se pone a false
        const oldCurrent = user.cards.find(cardItem => cardItem.current)
        if (oldCurrent) {
            oldCurrent.current = false
        }

        // El nuevo diseño seleccionado se pone a true
        newCurrent.current = true

        // Se guardan los resultados y se responde al cliente
        await user.save()

        return res.status(200).json({
            status: "success",
            message: "El diseño de carta ha sido seleccionado correctamente",
            user
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            status: "error",
            message: "Error al intentar seleccionar un diseño de carta. Revisa que el ID y el nombre del diseño sean correctos"
        })
    }
}

// Dado un id de Usuario y un nombre de avatar, añade el diseño de tapete a la lista de diseños de tapetes
// del usuario y resta el precio del diseño a las monedas del usuario (si tiene suficientes).
const buyRug = async (req, res) => {
    const userId = req.user.id
    const rugName = req.body.rugName

    try {
        // Primero miramos que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }

        // Después se mira que el tapete exista
        const rug = await Rug.findOne({ image: rugName })
        if (!rug) {
            return res.status(404).json({
                status: "error",
                message: "El tapete no ha sido encontrado"
            })
        }

        // Ahora verificamos que el usuario no tuviera ya el tapete
        if (user.rugs.some(rugItem => rugItem.rug.equals(rug._id))) {
            return res.status(500).json({
                status: "error",
                message: "El usuario ya poseía en su inventario el tapete"
            })
        }

        // Se verifica si el usuario tiene las suficientes monedas para comprar el tapete
        if (user.coins < rug.price) {
            return res.status(500).json({
                status: "error",
                message: "El usuario no tiene suficientes monedas para comprar el tapete"
            })
        }

        // Una vez hechas todas las comprobaciones, se resta el dinero del precio del tapete,
        // y se añade a su lista de tapetes. El tapete comprado no es el actual por defecto
        user.coins -= rug.price

        user.rugs.push({ rug: rug._id, current: false})

        await user.save()
        
        return res.status(200).json({
            status: "success",
            message: "El tapete ha sido añadido al inventario correctamente",
            user
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            status: "error",
            message: "Error al intentar comprar el tapete. Revisa que el ID y el nombre del tapete sean correctos"
        })
    }
}

// Dado un id de Usuario y un nombre de diseño de tapete, establece como diseño de tapete
// actual (en uso) el pasado por parámetro (si el usuario lo posee).
const changeRug = async (req, res) => {
    const userId = req.user.id
    const rugName = req.body.rugName

    try {
        // Primero miramos que el usuario exista
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }

        // Después se mira que el tapete exista
        const rug = await Rug.findOne({ image: rugName })
        if (!rug) {
            return res.status(404).json({
                status: "error",
                message: "El tapete no ha sido encontrado"
            })
        }

        // Se verifica que el usuario posea el tapete pasado como parámetro
        const newCurrent = user.rugs.find(rugItem => rugItem.rug.equals(rug._id))
        if (!newCurrent) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no posee el tapete"
            })
        }

        // Se busca si hay un tapete que tenga el current a true, y se pone a false
        const oldCurrent = user.rugs.find(rugItem => rugItem.current)
        if (oldCurrent) {
            oldCurrent.current = false
        }

        // El nuevo tapete seleccionado se pone a true
        newCurrent.current = true

        // Se guardan los resultados y se responde al cliente
        await user.save()

        return res.status(200).json({
            status: "success",
            message: "El tapete ha sido seleccionado correctamente",
            user
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            status: "error",
            message: "Error al intentar seleccionar un tapete. Revisa que el ID y el nombre del taoete sean correctos"
        })
    }
}

// Dado un id de Usuario y un día de la semana ‘day’, suma al usuario con dicho id el 
// número de monedas correspondiente a la recompensa del día de la semana ‘day’.
// ‘day’ es un día de la semana en español, con la primera letra en mayúscula y con tildes
const getReward = async (req, res) => {
    const userId = req.user.id
    const rewardDay = req.body.rewardDay

    try {
        // Buscamos la recompensa
        const reward = await Reward.findOne({ day: rewardDay })
        if (!reward) {
            return res.status(404).json({
                status: "error",
                message: "La recompensa no ha sido encontrada"
            })
        }

        // Se busca el usuario por su ID
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }    
        
        // Se suman las monedas al saldo del usuario
        user.coins += reward.value

        // Se guarda y se responde al cliente
        await user.save()
        return res.status(200).json({
            status: "success",
            message: "Recompensa obtenida correctamnete",
            coinsReward: reward.value,
            user: user
        })

    } catch (e) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error al obtener la recompensa. Asegúrate de que el día de la recompensa posee la primera letra en mayúscula, está en español y lleva tildes además de que el ID del usuario sea correcto"
        })
    }
}

// ------------------------ Funciones del administrador ------------------------

// Elimina un usuario ya existente del sistema
const eliminate = async (req, res) => {
    const userId = req.params.id

    const deletedUser = await User.findOneAndRemove({ _id: userId })

    if (!deletedUser) {
        return res.status(404).json({
            status: "error",
            message: "Usuario no encontrado"
        })
    }

    return res.status(200).json({
        status: "success",
        message: "Usuario eliminado correctamente"
    })
}

// Dado un id de usuario y una cantidad de monedas, quita esa cantidad (si puede) al usuario.
const extractCoins = async (req, res) => {
    const userId = req.params.id
    const exCoinsStr = req.body.coins

    try {
        // Nos aseguramos de que exCoins sea un entero > 0
        const exCoins = parseInt(exCoinsStr)
        if (typeof exCoins !== 'number' || exCoins <= 0 || !Number.isInteger(exCoins)) {
            return res.status(500).json({
                status: "error",
                message: "El número de monedas a extraer no es correcto. Debe ser un entero positivo mayor de 0"
            })
        }

        // Se busca el usuario por su ID
        const user = await User.findById(userId)

        if (!user) {
            return res.status(500).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }    
        
        // Las monedas no pueden ser negativas
        user.coins -= exCoins
        if (user.coins < 0) {
            return res.status(500).json({
                status: "error",
                message: "El usuario no posee tal cantidad de monedas"
            })
        }

        await user.save()
        return res.status(200).json({
            status: "success",
            message: "Dinero extraido correctamente",
            coinsExtracted: exCoins,
            user: user
        })

    } catch (e) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error al extraer las monedas. Asegúrate de que la cadena de texto que representa el número de monedas a extraer es un entero mayor de 0 y que el ID del usuario es el correcto"
        })
    }
}

// Dado un id de usuario y una cantidad de monedas, añade esa cantidad al usuario.
const insertCoins = async (req, res) => {
    const userId = req.params.id
    const inCoinsStr = req.body.coins

    try {
        // Nos aseguramos de que exCoins sea un entero > 0
        const inCoins = parseInt(inCoinsStr)
        if (typeof inCoins !== 'number' || inCoins <= 0 || !Number.isInteger(inCoins)) {
            return res.status(500).json({
                status: "error",
                message: "El número de monedas a insertar no es correcto. Debe ser un entero positivo mayor de 0"
            })
        }

        // Se busca el usuario por su ID
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no ha sido encontrado"
            })
        }    
        
        // Se suman las monedas al saldo del usuario
        user.coins += inCoins

        // Se guarda y se responde al cliente
        await user.save()
        return res.status(200).json({
            status: "success",
            message: "Dinero insertado correctamente",
            coinsInserted: inCoins,
            user: user
        })

    } catch (e) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error al extraer las monedas. Asegúrate de que la cadena de texto que representa el número de monedas a insertar es un entero mayor de 0 y que el ID del usuario es el correcto"
        })
    }
}

// Funciones que se exportan
module.exports = {
    isAdmin,
    add,
    update,
    eliminate,
    userById,
    login,
    logout,
    extractCoins,
    insertCoins,
    buyAvatar,
    changeAvatar,
    buyCard,
    changeCard,
    buyRug,
    changeRug,
    getReward
}