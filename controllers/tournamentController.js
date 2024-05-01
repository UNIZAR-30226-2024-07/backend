// Imports de esquemas necesarios
const Tournament = require("../models/tournamentSchema")
const User = require("../models/userSchema")
const BankController = require("./bankController")
const StatController = require("./statController")

////////////////////////////////////////////////////////////////////////////////
// Funciones de usuario
////////////////////////////////////////////////////////////////////////////////

// Devuelve un usuario dado un id
const tournamentById = async (req, res) => {
    const tId = req.params.id

    try {
        // Buscar el usuario por su ID
        const tournament = await Tournament.findById(tId)

        // Si no se encontró, error
        if (!tournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Si se encontró, se devuelve el usuario
        return res.status(200).json({
            status: "success",
            message: "Torneo encontrado",
            tournament: tournament
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar buscar el torneo"
        })
    }
}

// Devuelve un usuario dado un id
const tournamentByName = async (req, res) => {
    const t = req.body

    try {
        // Nos aseguramos de que se hayan enviado todos los parámetros
        if (!t.name || t.name.trim() === '') {
            return res.status(400).json({
                status: "error",
                message: "Parámetros enviados incorrectamente. Se debe incluir el campo: name"
            })
        }

        // Buscar el usuario por su name
        const tournament = await Tournament.findOne({ name: t.name })

        // Si no se encontró, error
        if (!tournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Si se encontró, se devuelve el usuario
        return res.status(200).json({
            status: "success",
            message: "Torneo encontrado",
            tournament: tournament
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar buscar el torneo"
        })
    }
}

// Añade al usuario solicitante al torneo con identificador ‘id’ si posee las 
// suficientes monedas para entrar.
const enterTournament = async (req, res) => {
    const userId = req.user.id
    const tId = req.params.id

    try {
        // Se verifica que el usuario no estuviese jugando ya el torneo
        var resAux = await isUserInTournamentFunction({ body: { userId: userId, 
                                                             tournamentId: tId }})
        if (resAux.status === "success") {
            return res.status(400).json({
                status: "error",
                message: "El jugador ya se encuentra jugando el torneo"
            })
        }

        // Se verifica que el torneo existe
        const tournament = await Tournament.findById(tId)
        if (!tournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Se verifica que el usuario existe
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se verifica que el usuario posea las monedas suficientes
        if (tournament.price > user.coins) {
            return res.status(400).json({
                status: "error",
                message: "El usuario no posee monedas suficientes para entrar al torneo"
            })
        }

        // Se descuentan las monedas al usuario y se le añade el torneo a su 
        // lista de torneos activos
        user.coins -= tournament.price
        user.tournaments.push({ tournament: tId, round: '8' })

        // Se incrementa en 1 el número de torneos jugados en las estadísticas
        var resStat = await StatController.incrementStatByName({body: { userId: userId, 
            statName: "Torneos jugados", value: 1 }})
        if (resStat.status === "error") return res.status(400).json(resStat)

        await user.save()
        
        return res.status(200).json({
            status: "success",
            message: "El usuario se ha unido al torneo correctamente",
            user: user,
            tournament: tournament
        })
    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Error interno al entrar al torneo. " + e.message
        })
    }
}

// Devuelve 'success' si el usuario con el ID proporcionado ya se encuentra
// dentro del torneo con ID pasado por parámetro. Si el resultado es 'success'
// devuelve en el campo tournament el torneo y en el campo round la ronda 
const isUserInTournament = async (req, res) => {
    const userId = req.user.id
    const tournamentId = req.params.id

    try {
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró el usuario"
            })
        }

        const tournament = await Tournament.findById(tournamentId)
        if (!tournament) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró el torneo"
            })
        }

        const tournamentInfo = user.tournaments.find(tournament =>
            tournament.tournament === tournamentId)
        if (!isUserIn) {
            return res.status(400).json({
                status: "error",
                message: "El usuario no se encuentra jugando el torneo"
            })
        } else {
            return res.status(200).json({
                status: "success",
                message: "El usuario se encuentra jugando el torneo",
                tournament: tournament,
                round: tournamentInfo.round
            })    
        }

    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Error al verificar si el usuario está en el torneo. " + e.message
        })
    }
}

// Devuelve todos los torneos existentes en el sistema
const getAll = async (req, res) => {
    try {
        // Recuperar todos los tipos de mesas públicas
        const tournaments = await Tournament.find()

        return res.status(200).json({
            status: "success",
            message: "Lista de torneos obtenida correctamente",
            tournaments: tournaments
        })

    } catch (e) {
        return res.status(500).json({
            status: "error",
            message: "Error al obtener los torneos. " + e.message
        })
    }
}

// Devuelve la ronda en la que se encuentra un usuario dado el ID del torneo
const roundInTournament = async (req, res) => {
    // Parámetros en URL: id
    const tId = req.params.id
    const userId = req.user.id

    try {
        // Se verifica que el usuario existe
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Se busca el torneo en los torneos del usuario
        const tournamentInfo = user.tournaments.find(tournament => 
            tournament.tournament === tId)
        if (!tournamentInfo) {
            return res.status(404).json({
                status: "error",
                message: "El usuario no está participando en este torneo"
            });
        }

        // Se retorna la posición del usuario en el torneo
        return res.status(200).json({
            status: "success",
            round: tournamentInfo.position
        })
        
    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Error al obtener la ronda en la que se encuentra el jugador. " + e.message
        })
    }
}

////////////////////////////////////////////////////////////////////////////////
// Funciones del administrador
////////////////////////////////////////////////////////////////////////////////

// Añade un nuevo torneo al sistema si su nombre aún no existe
const add = async (req, res) => {
    // Parámetros en req.body: name, price, bankLevel
    const t = req.body

    // Nos aseguramos de que se hayan enviado todos los parámetros
    if (!t.name || t.name.trim() === '' || !t.price || !t.bankLevel) {
        return res.status(400).json({
            status: "error",
            message: "Parámetros enviados incorrectamente. Se deben incluir los campos: name, price"
        })
    }

    var res = await BankController.correctName({ body: { level: t.bankLevel }})
    if (res.status === "error") return res

    const price = parseInt(t.price)
    if (typeof price !== 'number' || price <= 0 || !Number.isInteger(price)) {
        return res.status(500).json({
            status: "error",
            message: "El precio de entrada al torneo no es correcto. Debe ser un entero positivo mayor de 0"
        })
    }

    try {
        // Se busca si hay un torneo que ya exista con el nombre
        const oldTournament = await Tournament.findOne({ name: t.name })
        if (oldTournament) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe un torneo con ese nombre"
            })
        }

        // El campeón y subcampeón del torneo se llevan 3 / 4 y 1 / 4, respectivamente
        // de todo el dinero en juego.
        // Ejemplo: en todo torneo hay 8 jugadores, y pongamos que el precio de entrada
        // al torneo es de 100 monedas. El ganador se llevará 600 monedas mientras que
        // el subcampeón se llevará 200.
        const coins_winner = (8 * price * 3) / 4
        const coins_subwinner = (8 * price) / 4

        // Se crea el torneo
        const newTournament = await Tournament.create({
            name: t.name,
            bankLevel: t.bankLevel,
            price: price,
            coins_winner: coins_winner,
            coins_subwinner: coins_subwinner
        })
        return res.status(200).json({
            status: "success",
            message: "Torneo creado correctamente",
            tournament: newTournament
        })
    } catch (e) {
        console.error(e)
        return res.status(400).json({
            status: "error",
            message: "Error interno al crear el torneo"
        })
    }
}

// Modifica un torneo ya existente si el name no estaba ocupado por otro torneo 
// y si el precio de entrada es correcto
const update = async (req, res) => {
    const tId = req.params.id
    const t = req.body

    // Borramos los campos que no queremos actualizar
    delete t.coins_winner;
    delete t.coins_subwinner;

    try {
        // Si se quiere modificar el nombre, asegurarse de que no está en uso
        // por otro torneo
        if (t.name) {
            const tournament = await Tournament.findOne({ name: t.name })
            if (tournament) {
                return res.status(500).json({
                    status: "error",
                    message: "Ya existe un torneo con el nombre pasado como parámetro"
                })
            }
        }

        // Si se quiere modificar el precio, asegurarse de que sea correcto
        if (t.price) {
            const price = parseInt(t.price)
            if (typeof price !== 'number' || price <= 0 || !Number.isInteger(price)) {
                return res.status(500).json({
                    status: "error",
                    message: "El precio de entrada al torneo no es correcto. Debe ser un entero positivo mayor de 0"
                })
            }
            t.coins_winner = (8 * price * 3) / 4
            t.coins_subwinner = (8 * price) / 4
        }

        // Actualizar el torneo por su ID y los campos especificados
        const updatedTournament = await Tournament.findByIdAndUpdate(tId, t, { new: true })

        if (!updatedTournament) {
            return res.status(404).json({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        return res.status(200).json({
            status: "success",
            message: "Torneo actualizado correctamente",
            tournament: updatedTournament
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: "error",
            message: "Error interno del servidor al intentar actualizar el torneo"
        })
    }
}

// Elimina un torneo ya existente del sistema
const eliminate = async (req, res) => {

    const tId = req.params.id

    const deletedTournament = await Tournament.findOneAndRemove({ _id: tId })

    if (!deletedTournament) {
        return res.status(404).json({
            status: "error",
            message: "Torneo no encontrado"
        })
    }

    return res.status(200).json({
        status: "success",
        message: "Torneo eliminado correctamente"
    })
}

////////////////////////////////////////////////////////////////////////////////
// Funciones internas
////////////////////////////////////////////////////////////////////////////////

// Devuelve 'success' si el usuario con el ID proporcionado ya se encuentra
// dentro del torneo con ID pasado por parámetro. Si el resultado es 'success'
// devuelve en el campo tournament el torneo y en el campo round la ronda 
async function isUserInTournamentFunction(req) {
    // Parámetros en body: userId, tournamentId
    const userId = req.body.userId
    const tournamentId = req.body.tournamentId

    try {
        const user = await User.findById(userId)
        if (!user) {
            return ({
                status: "error",
                message: "No se encontró el usuario"
            })
        }

        const tournament = await Tournament.findById(tournamentId)
        if (!tournament) {
            return ({
                status: "error",
                message: "No se encontró el torneo"
            })
        }

        const tournamentInfo = user.tournaments.find(tournament =>
            tournament.tournament === tournamentId)
        if (!isUserIn) {
            return ({
                status: "error",
                message: "El usuario no se encuentra jugando el torneo. Debe entrar primero (enterTournament) para poder jugar en él"
            })
        } else {
            return ({
                status: "success",
                message: "El usuario se encuentra jugando el torneo",
                tournament: tournament,
                round: tournamentInfo.round
            })    
        }

    } catch (e) {
        return ({
            status: "error",
            message: "Error al verificar si el usuario está en el torneo. " + e.message
        })
    }
}

// Dado un id de usuario y un id de torneo, avanza una ronda al usuario en dicho torneo
async function advanceRound(req) {
    // Parámetros en req.body: userId, tournamentId
    const userId = req.body.userId
    const tId = req.body.tournamentId

    try {
        const user = await User.findById(userId)
        if (!user) {
            return ({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        const tournament = await Tournament.findById(tId)
        if (!tournament) {
            return ({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Se busca la participación del usuario en el torneo
        const userTournament = user.tournaments.find(t => t.tournament.equals(tournament._id));
        if (!userTournament) {
            return ({
                status: "error",
                message: "El usuario no está inscrito en este torneo"
            })
        }

        // Avanzar al usuario a la siguiente ronda
        switch (userTournament.round) {
            case 8:
                userTournament.round = 4;
                break;
            case 4:
                userTournament.round = 2;
                break;
            case 2:
                userTournament.round = 1;
                break;
            default:
                return ({
                    status: "error",
                    message: "El usuario ya está en la última ronda"
                })
        }

        // Guardar los cambios en el usuario
        await user.save()

        return ({
            status: "success",
            message: "El usuario ha avanzado de ronda correctamente"
        })
        
    } catch (e) {
        return ({
            status: "error",
            message: "Error al avanzar de ronda al usuario. " + e.message 
        })
    }
}

// Dado un id de usuario y un id de torneo, elimina el torneo de la lista de torneos
// que se encuentra jugando el usuario
async function tournamentLost(req) {
    // Parámetros en req.body: userId, tournamentId
    const userId = req.body.userId
    const tournamentId = req.body.tournamentId

    try {
        // Buscar el usuario por su ID
        const user = await User.findById(userId);
        if (!user) {
            return ({
                status: "error",
                message: "Usuario no encontrado"
            })
        }

        // Verificar si el usuario está jugando en el torneo especificado
        const tournamentIndex = user.tournaments.findIndex(t => t.tournament.equals(tournamentId));
        if (tournamentIndex === -1) {
            return ({
                status: "error",
                message: "El usuario no está jugando en este torneo"
            })
        }

        // Si llegó a la final, se incrementa en 1 el número de finales de torneo jugadas
        if (user.tournaments[tournamentIndex].position === 1) {
            var resStat = await StatController.incrementStatByName({body: { userId: userId, 
                statName: "Finales de torneos jugadas", value: 1 }})
            if (resStat.status === "error") return resStat    
        }

        // Eliminar el torneo de la lista de torneos del usuario
        user.tournaments.splice(tournamentIndex, 1);

        // Guardar los cambios en el usuario
        await user.save();

        return ({
            status: "success",
            message: "El usuario ha sido eliminado del torneo correctamente"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al eliminar el torneo del usuario. " + e.message
        })
    }
}

// Devuelve un usuario dado un id
async function tournamentByIdFunction(req) {
    // Parámetros en req.body: tournamentId
    const tId = req.body.tournamentId

    try {
        // Buscar el usuario por su ID
        const tournament = await Tournament.findById(tId)

        // Si no se encontró, error
        if (!tournament) {
            return ({
                status: "error",
                message: "Torneo no encontrado"
            })
        }

        // Si se encontró, se devuelve el usuario
        return ({
            status: "success",
            message: "Torneo encontrado",
            tournament: tournament
        })
    } catch (e) {
        return ({
            status: "error",
            message: "Error interno del servidor al intentar buscar el torneo" + e.message
        })
    }
}

// Funciones que se exportan
module.exports = {
    tournamentById,
    tournamentByIdFunction,
    tournamentByName,
    enterTournament,
    isUserInTournament,
    isUserInTournamentFunction,
    getAll,
    roundInTournament,

    add,
    update,
    eliminate,
    advanceRound,
    tournamentLost
}