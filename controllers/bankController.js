// Imports de esquemas necesarios
const Bank = require("../models/bankSchema")
const TournamentBoardController = require("./boards/tournamentBoardController")
const PublicBoardController = require("./boards/publicBoardController")
const PrivateBoardController = require("./boards/privateBoardController")

// Hearts: corazones
// Diamonds: diamantes
// Clubs: tréboles
// Spades: picas
const cards = [{ value: '2', suit: 'Hearts' }, { value: '3', suit: 'Hearts' }, { value: '4', suit: 'Hearts' }, { value: '5', suit: 'Hearts' },
               { value: '6', suit: 'Hearts' }, { value: '7', suit: 'Hearts' }, { value: '8', suit: 'Hearts' }, { value: '9', suit: 'Hearts' },
               { value: '10', suit: 'Hearts' }, { value: 'Jack', suit: 'Hearts' }, { value: 'Queen', suit: 'Hearts' }, { value: 'King', suit: 'Hearts' },
               { value: 'Ace', suit: 'Hearts' },
               { value: '2', suit: 'Diamonds' }, { value: '3', suit: 'Diamonds' }, { value: '4', suit: 'Diamonds' }, { value: '5', suit: 'Diamonds' },
               { value: '6', suit: 'Diamonds' }, { value: '7', suit: 'Diamonds' }, { value: '8', suit: 'Diamonds' }, { value: '9', suit: 'Diamonds' },
               { value: '10', suit: 'Diamonds' }, { value: 'Jack', suit: 'Diamonds' }, { value: 'Queen', suit: 'Diamonds' }, { value: 'King', suit: 'Diamonds' },
               { value: 'Ace', suit: 'Diamonds' },
               { value: '2', suit: 'Clubs' }, { value: '3', suit: 'Clubs' }, { value: '4', suit: 'Clubs' }, { value: '5', suit: 'Clubs' },
               { value: '6', suit: 'Clubs' }, { value: '7', suit: 'Clubs' }, { value: '8', suit: 'Clubs' }, { value: '9', suit: 'Clubs' },
               { value: '10', suit: 'Clubs' }, { value: 'Jack', suit: 'Clubs' }, { value: 'Queen', suit: 'Clubs' }, { value: 'King', suit: 'Clubs' },
               { value: 'Ace', suit: 'Clubs' },
               { value: '2', suit: 'Spades' }, { value: '3', suit: 'Spades' }, { value: '4', suit: 'Spades' }, { value: '5', suit: 'Spades' },
               { value: '6', suit: 'Spades' }, { value: '7', suit: 'Spades' }, { value: '8', suit: 'Spades' }, { value: '9', suit: 'Spades' },
               { value: '10', suit: 'Spades' }, { value: 'Jack', suit: 'Spades' }, { value: 'Queen', suit: 'Spades' }, { value: 'King', suit: 'Spades' },
               { value: 'Ace', suit: 'Spades' }]

// Función para mezclar las cartas (Fisher-Yates shuffle)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


/*********************** Funciones logica juego ******************************/

const boardByIdGeneral = async(req) => {

    const typeBoardName = req.body.typeBoardName // 'tournament', 'public', 'private'
    var res
    if (typeBoardName === "tournament") {
        res = await TournamentBoardController.boardByIdFunction(req)
        if (res.status === "error") return res

    } else if (typeBoardName === "public") {
        res = await PublicBoardController.boardByIdFunction(req)
        if (res.status === "error") return res
    
    } else if (typeBoardName === "private") {
        res = await PrivateBoardController.boardByIdFunction(req)
        if (res.status === "error") return res
    }
    // Exito, se ha encontrado el board
    return res
}

const collectCards = async(req) => {
    // Parámetros body: bankId, numPlayers

    try {

        // Id banca
        const bankId = req.body.bankId

        // Cantidad jugadores
        const numPlayers = req.body.numPlayers

        // Mezclar las cartas
        const shuffledCards = shuffle(cards);

        // Calcular cuántas cartas recibirá cada jugador
        const cartasPorJugador = Math.floor(shuffledCards.length / numPlayers);

        // Crear una matriz para almacenar los mazos de cartas
        const maze = [];

        // Dividir las cartas en mazos según el número de jugadores
        for (let i = 0; i < numPlayers; i++) {
            // Obtener las cartas para el mazo actual
            const inicio = i * cartasPorJugador;
            const fin = (i + 1) * cartasPorJugador;
            const mazo = shuffledCards.slice(inicio, fin);
            
            // Agregar el mazo al arreglo de mazos
            maze.push(mazo);
        }

        // Si hay cartas restantes, distribúyelas entre los mazos existentes
        if (shuffledCards.length % numPlayers !== 0) {
            let cartaRestanteIndex = cartasPorJugador * numPlayers;
            for (let i = 0; i < shuffledCards.length % numPlayers; i++) {
                maze[i].push(shuffledCards[cartaRestanteIndex]);
                cartaRestanteIndex++;
            }
        }

        // Poner el mazo
        const newBank = await Bank.findByIdAndUpdate(bankId, { maze: maze }, { new: true });
        if (!newBank) {
            return {
                status: "error",
                message: "No se han podido hacer un collect de las cartas"
            }
        }
        return {
            status: "success",
            message: "Collect de las cartas realizado correctamente",
            bank: newBank
        }
    } catch (error) {
        return {
            status: "error",
            message: error.message
        }
    }
}

// Función para pedir una carta
const drawCard = async (req, res) => {
    // Parámetros requeridos: boardId, typeBoardName
    try {

        // Id del usuario peticion
        const userId = req.user.id

        // Obtener el board dado el id del board
        const resBoard = await boardByIdGeneral(req)
        if (resBoard.status === "error") {
            return res.status(404).json(resBoard)
        }
        // Obtener board
        const board = resBoard.board

        // Obtener id de la banca
        const bankId = board.bank

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return res.status(404).json({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }
        if (bank.maze.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "El mazo de la banca está vacío"
            })
        }

        // Obtener el mazo correspondiente al jugador
        const playerIndex = board.players.findIndex(player => player.player == userId);
        const playerMaze = bank.maze[playerIndex];

        return res.status(404).json({
            status: "error",
            message: "El mazo de la banca está vacío",
            players: board.players,
            numPlayers: board.numPlayers,
            playerIndex,
            userId,
            cards,
            suffle: shuffle(cards)
        })

        const randomIndex = Math.floor(Math.random() * bank.maze.length)
        const card = bank.maze[randomIndex]
        bank.maze.splice(randomIndex, 1)

        const updatedBank = await Bank.findByIdAndUpdate(bankId, { maze: bank.maze }, { new: true }).session(session);

        if (updatedBank) {
            return res.status(200).json({
                status: "success",
                message: "Carta obtenida con exito",
                card: card
            })
        }

    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message
        })
    }
}


/*************** Eliminar esta función **************/
const eliminateAll = async (req, res) => {
    try {
        // Se eliminan todas las instancias de matcher
        await Bank.deleteMany({})
        return res.status(200).json({
            status: "success",
            message: "Todo correcto",
        })
    } catch (e) {
        return res.status(400).json({
            status: "error",
            message: "Todo incorrecto",
        })
    
    }
}
/****************************************************/

// Devuelve "success" si y solo si 'level' es igual a 'beginner', 'medium' o 
// 'expert'. Devuelve "error" en caso contrario
async function correctName(req) {
    // Parámetros en req.body: level
    const level = req.body.level

    if (level !== 'beginner' && level !== 'medium' && level !== 'expert') {
        return ({
            status: "error",
            message: "Nivel de banca no válido"
        })
    } else {
        return ({
            status: "success",
            message: "Nivel de banca válido"
        })
    }
}

async function add(req) {
    const level = req.body.level
    
    try {
        if (level !== 'beginner' && level !== 'medium' && level !== 'expert') {
            return ({
                status: "error",
                message: "Level no válido. Debe ser 'beginner', 'medium' o 'expert'"
            })
        }

        const newBank = await Bank.create({ level: level })
        if (!newBank) {
            return ({
                status: "error",
                message: "Error al crear la banca"
            })
        }

        const reqCollectCards = { body: { bankId: newBank._id, numPlayers: 2 } }
        var resCollectCards = await collectCards(reqCollectCards)
        if (resCollectCards.status !== "success") return res

        return ({
            status: "success",
            message: "Banca creada correctamente",
            bank: resCollectCards.bank
        })
    
    } catch (e) {
        return ({
            status: "error",
            message: "Error al crear la banca"
        })
    }
}

// Dado un id de banca, se elimina dicha banca
async function eliminate(req) {
    // Parámetros en req.body: bankId
    const bankId = req.body.bankId

    try {
        // Buscar la banca por su ID
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "Banca no encontrada"
            })
        }

        // Eliminar la banca
        await bank.remove()

        return ({
            status: "success",
            message: "La banca ha sido eliminada correctamente"
        })

    } catch (e) {
        return ({
            status: "error",
            message: "Error al eliminar la banca. " + e.message
        })
    }
}

// Funciones que se exportan
module.exports = {
    eliminateAll,
    add,
    correctName,
    eliminate,
    drawCard
}