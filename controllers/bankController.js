// Imports de esquemas necesarios
const Bank = require("../models/bankSchema")
const PublicBoard = require("../models/boards/publicBoardSchema")
const PrivateBoard = require("../models/boards/privateBoardSchema")
const TournamentBoard = require("../models/boards/tournamentBoardSchema")
const User = require('../models/userSchema')

// Maximo número de hands o jugadas por persona
const maxHands = 2
// Número de cartas en la mesa para doblar
const numCardsDouble = 2
// Número de cartas en la mesa para dividir
const numCardsSplit = 2
// Número que marca BlackJack
const numBlackJack = 21
// Número de cartas iniciales dadas a cada jugador
const numInitialCards = 2

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


/*********************** Funciones internas ***********************************/
// Obtener el board dado:
// typeBoardName: tournament, public, private
// boardId
async function boardByIdGeneral(req) {
    try {
        const typeBoardName = req.body.typeBoardName // 'tournament', 'public', 'private'
        const boardId = req.body.boardId
        var board
        if (typeBoardName === "tournament") {
            board = await TournamentBoard.findById(boardId)
            if (!board) {
                return ({
                    status: "error",
                    message: "No existe una mesa de torneo con el ID proporcionado"
                })
            }
        } else if (typeBoardName === "public") {
            board = await PublicBoard.findById(boardId)
            if (!board) {
                return ({
                    status: "error",
                    message: "No existe una mesa pública con el ID proporcionado"
                })
            }
        
        } else if (typeBoardName === "private") {
            board = await PrivateBoard.findById(boardId)
            if (!board) {
                return ({
                    status: "error",
                    message: "No existe una mesa privada con el ID proporcionado"
                })
            }
        }
        // Exito, se ha encontrado el board
        return ({
            status: "success",
            message: "Se ha obtenido la mesa correctamente. Se encuentra en el campo board de esta respuesta",
            board: board
        })

    } catch (error) {
        return ({
            status: "error",
            message: error.message
        })
    }
}

// Función para mezclar las cartas (Fisher-Yates shuffle)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Barajea las cartas y pone en el bank tantos mazos como personas haya jugando
async function collectCards(req) {
    // Parámetros body: bankId, numPlayers
    try {
        const bankId = req.body.bankId
        const numPlayers = req.body.numPlayers

        const totalMaze = [...cards, ...cards]

        // Mezclar las cartas
        const shuffledCards = shuffle(totalMaze);

        const cartasPorJugador = Math.floor(shuffledCards.length / numPlayers);
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

        // Actualizar la banca. Poner los mazos
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

// Devuelve el valor de las cartas de un jugador
function valueCards(cardsOnTable) {
    let total = 0
    let aceCount = 0

    cardsOnTable.forEach(card => {
        if (card.value === 'Jack' || card.value === 'Queen' || card.value === 'King') {
            total += 10;
        } else if (card.value === 'Ace') {
            aceCount++;
            total += 11;
        } else {
            total += parseInt(card.value);
        }
    });

    // Ajustar el valor de los Ases si se pasa de 21
    while (total > numBlackJack && aceCount > 0) {
        total -= 10;
        aceCount--;
    }

    return total
}

// Función privada
// Confirmar una mano de un jugador
// En el caso de que haya habido split, no se hará push en el vector 
// de jugadores confirmados (al menos que sea la seguna mano)
async function confirmPriv(req) {

    // Parámetros: userId, typeBoardName, boardId, playerIndex, cardsOnTable, bankId
    try {
        const userId = req.body.userId
        const playerIndex = req.body.playerIndex
        const cardsOnTable = req.body.cardsOnTable // Cartas que quiere confirmar
        const bankId = req.body.bankId

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }

        if (bank.playersHands[playerIndex].split && bank.playersHands[playerIndex].hands.length === numCardsSplit ||
            !bank.playersHands[playerIndex].split && bank.playersHands[playerIndex].hands.length === numCardsSplit - 1) {
            return ({
                status: "error",
                message: "Este jugador ya había confirmado sus jugadas"
            })
        }
        // Obtener las jugadas del jugador y agregar hand
        const playerHands = bank.playersHands[playerIndex]
        playerHands.hands.push(cardsOnTable)
        bank.playersHands[playerIndex] = playerHands
        await bank.save(bank.playerHands)
        
        // Si no ha hecho split, jugador confirmado
        // Si ha hecho split y es la segunda jugada, jugador confirmado
        if (!playerHands.split ||
            playerHands.split && playerHands.hands.length === maxHands) {  
            const reqPush = { body: { typeBoardName: req.body.typeBoardName,
                                      boardId: req.body.boardId,
                                      userId: userId } }
            const resPush = await pushOnPlayersConfirm(reqPush)
            if (resPush.status === "error") return resPush
            return ({
                status: "success",
                message: "Se ha confirmado la/s jugadas del jugador"
            })
        }
        return ({
            status: "success",
            message: "Se ha agregado la jugada. Falta confirmar la segunda jugada"
        })

    } catch (error) {
        return ({
            status: "error",
            message: error.message + ". En confirmPriv"
        })
    }
}

// Mete en el vector hand.players del board el userId
async function pushOnPlayersConfirm(req) {
    // Parámetros: typeBoardName, boardId, userId
    try {
        const typeBoardName = req.body.typeBoardName // 'tournament', 'public', 'private'
        const boardId = req.body.boardId
        const userId = req.body.userId
        var board
        if (typeBoardName === "tournament") {
            board = await TournamentBoard.findById(boardId)
            if (!board) {
                return ({
                    status: "error",
                    message: "No existe una mesa de torneo con el ID proporcionado"
                })
            }
        } else if (typeBoardName === "public") {
            board = await PublicBoard.findById(boardId)
            if (!board) {
                return ({
                    status: "error",
                    message: "No existe una mesa pública con el ID proporcionado"
                })
            }
        
        } else if (typeBoardName === "private") {
            board = await PrivateBoard.findById(boardId)
            if (!board) {
                return ({
                    status: "error",
                    message: "No existe una mesa privada con el ID proporcionado"
                })
            }
        }

        // Agregar usuario el vector hand.players
        if (!board.hand.players.includes(userId)) {
            board.hand.players.push(userId);
            await board.save()
        } else {
            return ({
                status: "error",
                message: "El usuario ya había confirmado su jugada"
            })
        }

        // Exito, se ha agregado el userId a board.hand.players
        return ({
            status: "success",
            message: "Se ha agregado el userId a board.hand.players"
        })
    } catch (error) {
        return ({
            status: "error",
            message: error.message + ". En pushOnPlayersConfirm."
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

// Añadir banca
async function add(req) {
    const level = req.body.level
    const numPlayers = req.body.numPlayers
    
    try {
        if (level !== 'beginner' && level !== 'medium' && level !== 'expert') {
            return ({
                status: "error",
                message: "Level no válido. Debe ser 'beginner', 'medium' o 'expert'"
            })
        }

        // Inicializar vector de "jugadas"
        // Última componente la banca
        // Cada componenete contiene:
        //    split: si el jugador ha hecho split
        //    double: si el jugador ha hecho double
        //    cards: un vector de "jugadas" que ha hecho el jugador
        const playersHands = []
        for (let i = 0; i <= numPlayers; i++) {
            playersHands.push({
                split: false,
                double: false,
                hands: []
            })
        }

        // Crear banca
        const newBank = await Bank.create({ level: level, playersHands: playersHands })
        if (!newBank) {
            return ({
                status: "error",
                message: "Error al crear la banca"
            })
        }

        // Crear mazos. Numero de mazos: numJugadores + 1 (el último para la banca)
        const reqCollectCards = { body: { bankId: newBank._id, numPlayers: numPlayers + 1 } }
        var resCollectCards = await collectCards(reqCollectCards)
        if (resCollectCards.status !== "success") return resCollectCards

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

// Elimina las hands de los jugadores
// usersIndex es un vector de indices
async function eliminatePlayersHands(req) {
    // Parámetros: bankId, usersIndex
    try {
        const bankId = req.body.bankId
        const usersIndex = req.body.usersIndex

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return res.status(404).json({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }
        // Eliminar las manos de los jugadores cuyos indices están en usersIndex
        const newPlayersHands = bank.playersHands.filter((_, indice) => !usersIndex.includes(indice))
        bank.playersHands = newPlayersHands
        await bank.save()

        return {
            status: "success",
            message: "Manos de los jugadores eliminadas correctamente del banco"
        };
    } catch (error) {
        return {
            status: "error",
            message: "Error al eliminar manos de los jugadores del banco. " + error.message 
        };
    }
}

// Resetea los valores de la banca
// Resetea los valores de playersHands
// Hace un collectCards
async function resetBank(req) {
    // Parámetros: bankId, numPlayers
    try {
        const bankId = req.body.bankId
        const numPlayers = req.body.numPlayers

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }
        // Resetear los playersHands
        bank.playersHands.forEach(player => {
            player.split = false;
            player.double = false;
            player.hands = [];
        });
        await bank.save()

        // Collect cards (numplayers + 1 porque el último mazo es de la banca)
        const reqCollectCards = { body: { bankId: bankId, numPlayers: numPlayers + 1 } }
        var resCollectCards = await collectCards(reqCollectCards)
        if (resCollectCards.status !== "success") return resCollectCards

        return({
            status: "success",
            message: "Banca reseteada correctamente",
            bank: resCollectCards.bank
        })
    } catch (error) {
        return {
            status: "error",
            message: "Error al resetear la banca"
        };
    }

}

// Inicializar la partida
async function initBoard(req) {
    // Parámetros: bankId, players
    try {
        const bankId = req.body.bankId
        const players = req.body.players
        const bankIndex = players.length

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }

        const initBoard = [];
        let index = 0
        let drawCard
        let cards
        // Sacar dos cartas por cada jugador del board
        for (const player of players) {
            cards = []
            const playerMaze = bank.maze[index];
            if (playerMaze.length === 0) {
                return ({
                    status: "error",
                    message: "El mazo del jugador está vacío"
                })
            }
            // Obtener dos cartas del jugador
            for (let i = 0; i < numInitialCards; i++) {
                drawCard = playerMaze.shift();
                cards.push(drawCard)
            }
            const totalPlayerCards = valueCards(cards)
            bank.maze[index] = playerMaze;
            const playerObject = {
                userId: player.player,
                cards: cards,
                totalCards: totalPlayerCards
            }
            initBoard.push(playerObject);
            index = index + 1
        }

        // Sacar una carta de la banca
        cards = []
        const bankMaze = bank.maze[bankIndex];
        if (bankMaze.length === 0) {
            return ({
                status: "error",
                message: "El mazo de la banca está vacío"
            })
        }
        // Obtener una carta de la banca
        drawCard = bankMaze.shift();
        cards.push(drawCard)
        bank.maze[bankIndex] = bankMaze;
        const totalBankCards = valueCards(cards)
        const bankObject = {
            userId: "Board",
            cards: cards,
            totalCards: totalBankCards
        }
        initBoard.push(bankObject);

        // Guardarlo en playersHands de la banca
        bank.playersHands[bankIndex].hands.push(cards)
        await bank.save();
        
        return({
            status: "success",
            message: "Cartas iniciales de jugadores y banca obtenidos con éxito",
            initBoard
        })
    } catch (error) {
        return {
            status: "error",
            message: "Error al obtener los resultados. " + error.message
        };
    }
}

// Calcular premio para public y private
function calcularEarnedCoins(totalesJugador, blackJacksJugador, 
                         totalesAll, 
                         totalBanca, blackJackBanca, bet) {
    const premioIgualBanca = bet;
    const premioMejorQueBanca = bet * 1.5;
    const premioMejorQueJugadores = bet * 2;
    const premioBlackjack = bet * 3;

    const coinsGanadasPorJugador = [];
    
    // Para cada jugada del jugador
    for (let i = 0; i < totalesJugador.length; i++) {

        // Puntuacion una mano del jugador
        const totalJugador = totalesJugador[i]
        // Booleano si es blackJack del jugador
        const blackJackJugador = blackJacksJugador[i]

        // Si es mayor que 21 ha perdido
        if (totalJugador > 21) {
            coinsGanadasPorJugador.push(0);
        }
        // Haces blackJack y la banca no
        else if (blackJackJugador && !blackJackBanca) {
            coinsGanadasPorJugador.push(premioBlackjack);
        }
        // Igual que la banca
        else if (totalJugador === totalBanca) {
            coinsGanadasPorJugador.push(premioIgualBanca);
        } 
        // Mayor que la banca
        else if (totalJugador > totalBanca) {
            const totalesAllCopy = totalesAll
            // Encuentra el índice del resultado actual
            const index = totalesAllCopy.indexOf(totalJugador); 
            if (index !== -1) { // Verifica si se encontró
                totalesAllCopy.splice(index, 1); // Elimina el totalJugador actual
            }
            // Además, mayor que todos los jugadores
            if (totalesAllCopy.every(puntuacion => puntuacion < totalJugador)) {
                coinsGanadasPorJugador.push(premioMejorQueJugadores);
            } 
            // Algún jugador igual o mejor que tú
            else {
                coinsGanadasPorJugador.push(premioMejorQueBanca);
            }
        } else {
            coinsGanadasPorJugador.push(0);
        }
    }
    return coinsGanadasPorJugador;
}

// Calcular premio para tournament
function calcularLoseLife(totalesJugador, blackJacksJugador, 
                          totalesAll, 
                          totalBanca, blackJackBanca, bet) {
    const loseLife = 1
    const loseHalfLife = 0.5
    const noLoseLife = 0
    
    // Puntuacion una mano del jugador
    const totalJugador = totalesJugador[0]
    // Booleano si es blackJack del jugador
    const blackJackJugador = blackJacksJugador[0]

    // Encuentra el índice del resultado actual
    const index = totalesAll.indexOf(totalJugador); 
    if (index !== -1) { // Verifica si se encontró
        totalesAll.splice(index, 1); // Elimina el totalJugador actual
    }
    // Puntuacion una mano del jugador oponente
    const totalOponente = totalesAll[0]

    // Si es mayor que 21, pierde vida
    if (totalJugador > 21) {
        return loseLife
    }
    // Haces blackJack y la banca no. Has superado a la banca. No pierdes vida
    else if (blackJackJugador && !blackJackBanca) {
        return noLoseLife
    }
    // Igual que la banca. Pierde vida
    else if (totalJugador === totalBanca) {
        return loseLife
    } 
    // Mayor que la banca. Pierde media vida si el otro jugador tiene más
    else if (totalJugador > totalBanca) {
        // Tiene mejor que banca y mejor que jugador oponente
        if (totalJugador > totalOponente) {
            return noLoseLife
        } 
        // Tiene mejor que banca y peor que jugador oponente
        else if (totalJugador > totalOponente) {
            return loseHalfLife
        } 
        // Tiene mejor que banca e igual que jugador oponente
        else {
            return noLoseLife
        }
    } // Jugador menor que la banca
    else {
        return loseLife
    }
}

// Genera los resultados
// Pre: Tiene que haber una respuesta de todos los jugadores que estén en players
async function results(req) {
    // Parámetros: bankId, players, typeBoardName, bet
    try {
        const bankId = req.body.bankId
        const players = req.body.players
        const bankIndex = players.length
        const typeBoardName = req.body.typeBoardName
        const bet = req.body.bet

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }

        // Generar un vector con el total de las cartas de todos los jugadores y si han sido blackJack
        let totalCardsAllPlayers = []
        for (let i = 0; i < players.length; i++) {
            // Ingresar total cartas por jugador
            for (let j = 0; j < bank.playersHands[i].hands.length; i++) {
                // Ingresar el total por mano jugada
                totalCardsAllPlayers.push(valueCards(bank.playersHands[i].hands[j]))
            }
        }

        // Banca realiza su jugada
        // let cardsBank = bank.playersHands[bankIndex].hands[0]    //////////////////////////////////////////////////////////////////
        let cardsBank = []   ////////////////////////////////////////////////////////////////////////////////////////////////////
        let totalBank = 0
        let bankMaze = bank.maze[bankIndex]
        if (bankMaze.length === 0) {
            return ({
                status: "error",
                message: "El mazo de la banca está vacío"
            })
        }
        switch (bank.level) {
            case 'beginner':
                while (totalBank < 15) {
                    // Tomar la primera carta del mazo de la banca
                    const drawCard = bankMaze.shift()
                    cardsBank.push(drawCard)
                    // Obtener el total de las cartas
                    totalBank = valueCards(cardsBank)
                }
                break;
            case 'medium':
                while (totalBank < 17) {
                    // Tomar la primera carta del mazo de la banca
                    const drawCard = bankMaze.shift()
                    cardsBank.push(drawCard)
                    // Obtener el total de las cartas
                    totalBank = valueCards(cardsBank)
                }
                break;
            case 'expert':
                // Si la banca tiene 17 suave, se planta si alguno de los jugadores muestra un total de 9, 10 u 11
                if (!(totalBank === 17 && (totalCardsAllPlayers.includes(9) || totalCardsAllPlayers.includes(10) || totalCardsAllPlayers.includes(11)))) {
                    // La banca pide carta si su total es menor que 17 o igual a 17 pero no es suave y ningún total del jugador está entre 9 y 11
                    while ((totalBank < 17) || (totalBank === 17 && !totalCardsAllPlayers.some(total => total >= 9 && total <= 11))) {
                        // Tomar la primera carta del mazo de la banca
                        const drawCard = bankMaze.shift()
                        cardsBank.push(drawCard)
                        // Obtener el total de las cartas
                        totalBank = valueCards(cardsBank)
                    }
                }
                break;
            default:
                return {
                    status: "error",
                    message: "Error. El nivel de la banca deber ser: beginner, medium o expert"
                }
        }

        const results = []    // Vector de resultados
        let index = 0         // Indice de resultados
        
        // Crear una respuesta por jugador 
        // Iterar todos los jugadores de la partida
        for (const player of players) {
            const user = await User.findById(player.player);
            if (!user) {
                return {
                    status: "error",
                    message: "No existe un usuario que está en players del board. Error en Bank.results."
                }
            }
            // Manos del jugador que se quiere generar respuesta
            const playerHands = bank.playersHands[index].hands

            // Si ha sido blackJack la banca
            let blackJackBank = (totalBank === 21 && cardsBank.length === 2)
            // Variable para guardar total cartas jugador respuesta
            let totalCardsPlayer = []  
            for (let i = 0; i < playerHands.length; i++) {
                totalCardsPlayer.push(valueCards(playerHands[i]))
            }
            // Guardar booleano si las cartas del jugador respuesta ha sido blackJack
            let blackJacksPlayer = []     
            for (let i = 0; i < totalCardsPlayer.length; i++) {
                blackJacksPlayer.push(totalCardsPlayer[i] === 21 && playerHands[i].length === 2)
            }

            if (typeBoardName === "tournament") {
                // Calcular loseLife
                const loseLife = calcularLoseLife(playerHands, blackJacksPlayer,
                                                        totalCardsAllPlayers, 
                                                        totalBank, blackJackBank, bet)
                const playerObject = {
                    userId: player.player,   // Id del usuario
                    userNick: user.nick,     // Nick del usuario
                    // En torneo solo hay una mano
                    cards: playerHands[0],   // [ cards ]  
                    total: totalCardsPlayer[0], // totalCards
                    loseLife: loseLife       // loseLife
                }
                results.push(playerObject)

            } else if (typeBoardName === "public" || "private") {
                // Calcular coinsEarned
                const coinsEarned = calcularEarnedCoins(playerHands, blackJacksPlayer,
                                                        totalCardsAllPlayers, 
                                                        totalBank, blackJackBank, bet)

                const playerObject = {
                    userId: player.player,   // Id del usuario
                    userNick: user.nick,     // Nick del usuario
                    // En public / private puede haber 1 o 2 manos
                    cards: playerHands,      // [[ cards ]]
                    total: totalCardsPlayer,    // [ totalCards ]
                    coinsEarned: coinsEarned   // [ coinsEarned ]
                }
                results.push(playerObject)
            }  
            index = index + 1
        }

        // Introducir en resultados respuesta banca
        const bankObject = {
            userId: "Bank",   // Id banca
            userNick: "Bank",     // Nick banca
            cards: cardsBank,   // [ cards ]
            total: totalBank,    // totalCards
        }
        results.push(bankObject)
        return({
            status: "success",
            message: "Banca reseteada correctamente",
            results
        })
    } catch (error) {
        return {
            status: "error",
            message: "Error al obtener los resultados. " + error.message
        };
    }
}

const prueba = async(req, res) => {
    let resP
    try {
        resP = await results(req)
        if (resP.status === "error") return res.status(404).json(resP)

        return res.status(200).json(resP)

    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message + resP.message
        })
    }
}

/*************************** Funciones route *****************************/

// Función para pedir una carta
const drawCard = async (req, res) => {
    // Parámetros requeridos: boardId, typeBoardName, cardsOnTable
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
        if (playerIndex === -1) {
            return res.status(404).json({
                status: "error",
                message: "El jugador no está en el vector de jugadores de la partida"
            })
        }
        const playerMaze = bank.maze[playerIndex];
        if (playerMaze.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "El mazo del jugador está vacío"
            })
        }

        // Tomar la primera carta del mazo del jugador
        const drawCard = playerMaze.shift();
        // Actualizar el mazo del jugador en el tablero
        bank.maze[playerIndex] = playerMaze;
        // Guardar el tablero actualizado en la base de datos
        await bank.save();

        // Cartas que tiene de momento
        const cardsOnTable = req.body.cardsOnTable
        cardsOnTable.push(drawCard)
        // Obtener el total de las cartas
        const totalCards = valueCards(cardsOnTable)

        if (totalCards < numBlackJack) {   // Devolver las cartas
            return res.status(200).json({
                status: "success",
                message: "Carta obtenida correctamente. Sigue jugando",
                cardsOnTable,
                totalCards,
                defeat: false,
                blackJack: false
            })
        } else if (totalCards > numBlackJack) {   // Confirmar hand, ha perdido
            const reqConfirm = { body: { userId: userId,
                                         typeBoardName: req.body.typeBoardName,
                                         boardId: board._id,
                                         playerIndex: playerIndex,
                                         cardsOnTable: cardsOnTable,
                                         bankId: bankId } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return res.status(404).json(resConfirm)
            return res.status(200).json({
                status: "success",
                message: "Carta obtenida correctamente. Se ha pasado de " + numBlackJack + ". Para de jugar. Ha perdido",
                cardsOnTable,
                totalCards,
                defeat: true,
                blackJack: false
            })
        } else if (totalCards == numBlackJack) {  // Confirmar hand, ha hecho BlackJack
            const reqConfirm = { body: { userId: userId,
                                         typeBoardName: req.body.typeBoardName,
                                         boardId: board._id,
                                         playerIndex: playerIndex,
                                         cardsOnTable: cardsOnTable,
                                         bankId: bankId } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return res.status(404).json(resConfirm)
            return res.status(200).json({
                status: "success",
                message: "Carta obtenida correctamente. Ha obtenido justo " + numBlackJack + ". Para de jugar",
                cardsOnTable,
                totalCards,
                defeat: false,
                blackJack: true
            })
        }

    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message + ". En drawCards."
        })
    }
}

// Función para doblar
// Pedirá una carta extra
const double = async (req, res) => {
    // Parámetros requeridos: boardId, typeBoardName, cardsOnTable
    try {

        // Id del usuario peticion
        const userId = req.user.id

        // Error. No se puede hacer double en un tournament
        if (req.body.typeBoardName = "tournament") {
            return res.status(404).json({
                status: "error",
                message: "No se puede  doblar en una partida de torneo"
            })
        }

        // Cartas que tiene de momento
        const cardsOnTable = req.body.cardsOnTable
        if (cardsOnTable.length !== numCardsDouble) {
            return res.status(404).json({
                status: "error",
                message: "Para doblar debe haber " + numCardsDouble + " cartas"
            })
        }

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
        if (playerIndex === -1) {
            return res.status(404).json({
                status: "error",
                message: "El jugador no está en el vector de jugadores de la partida"
            })
        }
        const playerMaze = bank.maze[playerIndex];
        if (playerMaze.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "El mazo del jugador está vacío"
            })
        }

        // Tomar la primera carta del mazo del jugador
        const drawCard = playerMaze.shift();
        // Actualizar el mazo del jugador en el tablero
        bank.maze[playerIndex] = playerMaze
        // Indica que ha hecho double
        bank.playersHands[playerIndex].double = true
        // Guardar el tablero actualizado en la base de datos
        await bank.save();

        // Obtener el total de las cartas
        cardsOnTable.push(drawCard)
        const totalCards = valueCards(cardsOnTable)

        // Responder
        const reqConfirm = { body: { userId: userId,
                             typeBoardName: req.body.typeBoardName,
                             boardId: board._id,
                             playerIndex: playerIndex,
                             cardsOnTable: cardsOnTable,
                             bankId: bankId } }
        const resConfirm = await confirmPriv(reqConfirm)
        if (resConfirm.status === "error") return res.status(404).json(resConfirm)
        return res.status(200).json({
            status: "success",
            message: "Carta obtenida correctamente. Ha hecho un double",
            cardsOnTable,
            totalCards,
            defeat: totalCards > numBlackJack,
            blackJack: totalCards == numBlackJack
        })
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message + ". En double."
        })
    }
}

// Función para dividir
const split = async(req, res) => {
    // Parámetros requeridos: boardId, typeBoardName, cardsOnTable
    try {

        // Id del usuario peticion
        const userId = req.user.id

        // Error. No se puede hacer split en un tournament
        if (req.body.typeBoardName = "tournament") {
            return res.status(404).json({
                status: "error",
                message: "No se puede dividir en una partida de torneo"
            })
        }

        // Cartas del jugador
        const cardsOnTable = req.body.cardsOnTable
        if (cardsOnTable.length !== numCardsSplit) {
            return res.status(404).json({
                status: "error",
                message: "Para dividir debe haber " + numCardsSplit + " cartas"
            })
        }
        if (cardsOnTable[0].value !== cardsOnTable[1].value) {
            return res.status(404).json({
                status: "error",
                message: "Para dividir las dos cartas deben de ser iguales"
            })
        }

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
        if (playerIndex === -1) {
            return res.status(404).json({
                status: "error",
                message: "El jugador no está en el vector de jugadores de la partida"
            })
        }
        const playerMaze = bank.maze[playerIndex];
        if (playerMaze.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "El mazo del jugador está vacío"
            })
        }

        // Tomar las dos primeras cartas del mazo del jugador
        const drawCardFirst = playerMaze.shift();
        const drawCardSecond = playerMaze.shift();
        // Actualizar el mazo del jugador en el tablero
        bank.maze[playerIndex] = playerMaze;
        // Indica que ha hecho split
        bank.playersHands[playerIndex].split = true
        // Guardar el tablero actualizado en la base de datos
        await bank.save();

        // Cartas que tiene de momento
        const cardsOnTableFirst = [cardsOnTable[0], drawCardFirst]
        const cardsOnTableSecond = [cardsOnTable[1], drawCardSecond]
        // Obtener el total de las cartas
        const totalCardsFirst = valueCards(cardsOnTableFirst)
        const totalCardsSecond = valueCards(cardsOnTableSecond)

        if (totalCardsFirst >= numBlackJack) {  // Mirar cartas primer mazo
            const reqConfirm = { body: { userId: userId,
                                         typeBoardName: req.body.typeBoardName,
                                         boardId: board._id,
                                         playerIndex: playerIndex,
                                         cardsOnTable: cardsOnTableFirst,
                                         bankId: bankId } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return res.status(404).json(resConfirm)
        }
        if (totalCardsSecond >= numBlackJack) {  // Mirar cartas primer mazo
            const reqConfirm = { body: { userId: userId,
                                         typeBoardName: req.body.typeBoardName,
                                         boardId: board._id,
                                         playerIndex: playerIndex,
                                         cardsOnTable: cardsOnTableSecond,
                                         bankId: bankId } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return res.status(404).json(resConfirm)
        }
        
        return res.status(200).json({
            status: "success",
            message: "Split hecho correctamente",
            cardsOnTableFirst,
            totalCardsFirst,
            defeatFirst: totalCardsFirst > numBlackJack,
            blackJackFirst: totalCardsFirst == numBlackJack,
            cardsOnTableSecond,
            totalCardsSecond,
            defeatSecond: totalCardsSecond > numBlackJack,
            blackJackSecond: totalCardsSecond == numBlackJack
        })
    
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message + ". En split."
        })
    }
}

// Función para plantarse
const stick = async(req, res) => {
    // Parámetros requeridos: boardId, typeBoardName, cardsOnTable
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

        // Obtener el indice del jugador
        const playerIndex = board.players.findIndex(player => player.player == userId);
        if (playerIndex === -1) {
            return res.status(404).json({
                status: "error",
                message: "El jugador no está en el vector de jugadores de la partida"
            })
        }

        // Realizar confirmación de las cartas
        const reqConfirm = { body: { userId: userId,
                             typeBoardName: req.body.typeBoardName,
                             boardId: board._id,
                             playerIndex: playerIndex,
                             cardsOnTable: req.body.cardsOnTable,
                             bankId: bankId } }
        const resConfirm = await confirmPriv(reqConfirm)
        if (resConfirm.status === "error") return res.status(404).json(resConfirm)
    
        return res.status(200).json({
            status: "success",
            message: "Confirmación de las cartas realizado con éxito",
            cardsOnTable: req.body.cardsOnTable
        })
    
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: error.message + ". En stick"
        })
    }
}

// Funciones que se exportan
module.exports = {
    eliminateAll,
    add,
    correctName,
    eliminate,
    eliminatePlayersHands,
    drawCard,
    double,
    split,
    stick,



    prueba
}