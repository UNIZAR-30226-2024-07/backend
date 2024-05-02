// Imports de esquemas necesarios
const Bank = require("../models/bankSchema")
const PublicBoard = require("../models/boards/publicBoardSchema")
const PrivateBoard = require("../models/boards/privateBoardSchema")
const TournamentBoard = require("../models/boards/tournamentBoardSchema")
const SingleBoard = require("../models/boards/singleBoardSchema")
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
const allCards = [{ value: '2', suit: 'Hearts' }, { value: '3', suit: 'Hearts' }, { value: '4', suit: 'Hearts' }, { value: '5', suit: 'Hearts' },
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
    // Parámetros body: bankId, players
    try {
        const bankId = req.body.bankId
        const players = req.body.players
        const numPlayers = players.length + 1

        const totalMaze = [...cards, ...cards]

        // Mezclar las cartas
        const shuffledCards = shuffle(totalMaze);

        const cartasPorJugador = Math.floor(shuffledCards.length / numPlayers);
        const maze = []
        let bankMaze
        // Dividir las cartas en mazos según el número de jugadores (numJugadores + banca)
        for (let i = 0; i < numPlayers; i++) {
            // Obtener las cartas para el mazo actual
            const inicio = i * cartasPorJugador;
            const fin = (i + 1) * cartasPorJugador;            
            // Agregar el mazo al arreglo de mazos
            // Si no es el último jugador (banca)
            if (i !== numPlayers - 1) {
                // Agregar mazo jugador
                const mazo = {
                    playerId: players[i].player,
                    cards: shuffledCards.slice(inicio, fin)
                }
                maze.push(mazo);

                // Si es la banca, agregar a banca
            } else {
                bankMaze = shuffledCards.slice(inicio, fin)
            }
        }
        // Resetear los playersHands
        const playersHands = []
        for (const player of players) {
            const playerHand =  {
                playerId: player.player,
                split: false,
                double: [],  // En que manos ha hecho double
                hands: [[],[]],
            }
            playersHands.push(playerHand)
        }        
        
        // Actualizar la banca. Poner mazos y resetear manos
        const newBank = await Bank.findById(bankId)
        if (!newBank) {
            return {
                status: "error",
                message: "No se ha podido encontrar banca"
            }
        }
        newBank.maze = maze
        newBank.bankMaze = bankMaze
        newBank.playersHands = playersHands
        newBank.bankHand = []
        await newBank.save()        
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
            message: "Error en collectCards: " + error.message
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

    // Parámetros: userId, typeBoardName, boardId, cardsOnTable, bankId, handIndex
    try {
        const userId = req.body.userId
        const cardsOnTable = req.body.cardsOnTable // Cartas que quiere confirmar
        const bankId = req.body.bankId
        const handIndex = req.body.handIndex

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }

        // Obtener indice de playersHands
        let playerIndex = bank.playersHands.findIndex(h => h.playerId == userId)
        if (playerIndex === -1) {
            const playerHand =  {
                playerId: userId,
                split: false,
                double: [],  // En que manos ha hecho double
                hands: [[],[]],
            }
            bank.playersHands.push(playerHand)
            // return ({
            //     status: "error",
            //     message: "Este jugador no tiene componente de jugadas confirmadas"
            // })
        }
        playerIndex = bank.playersHands.findIndex(h => h.playerId == userId)
        if (playerIndex === -1) {
            return ({
                status: "error",
                message: "Este jugador no tiene componente de jugadas confirmadas"
            })
        }

        // Si ha hecho split :
            // Error si ya ha confirmado:
            //   - hands[0].cards.length > 0 && hands[1].cards.length > 0

        // Si no ha hecho split:
            // Error si ya ha cofirmado:
            //   - hands[0].cards.length > 0

        if ((bank.playersHands[playerIndex].split && 
             bank.playersHands[playerIndex].hands[0].length > 0 && 
             bank.playersHands[playerIndex].hands[1].length > 0 )
            || 
            (!bank.playersHands[playerIndex].split && 
              bank.playersHands[playerIndex].hands[0].length > 0)) {
            return ({
                status: "error",
                message: "Este jugador ya había confirmado sus jugadas"
            })
        }
        // Obtener las jugadas del jugador y agregar hand
        const playerHands = bank.playersHands[playerIndex]
        playerHands.hands[handIndex] = cardsOnTable
        bank.playersHands[playerIndex] = playerHands
        await bank.save()
        
        // Si no ha hecho split, jugador confirmado
        // Si ha hecho split y es la segunda jugada, jugador confirmado
        if ((!playerHands.split) 
            ||
            (   // No ha hecho split
                playerHands.split && 
                ((bank.playersHands[playerIndex].hands[0].length > 0) && 
                (bank.playersHands[playerIndex].hands[1].length > 0)) 
            )) {  
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
        const typeBoardName = req.body.typeBoardName // 'tournament', 'public', 'private', 'single
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
        } else if (typeBoardName === "single") {
            board = await SingleBoard.findById(boardId)
            if (!board) {
                return ({
                    status: "error",
                    message: "No existe una mesa solitaria con el ID proporcionado"
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
    
    try {
        if (level !== 'beginner' && level !== 'medium' && level !== 'expert') {
            return ({
                status: "error",
                message: "Level no válido. Debe ser 'beginner', 'medium' o 'expert'"
            })
        }

        // Crear banca
        const newBank = await Bank.create({ level: level })
        if (!newBank) {
            return ({
                status: "error",
                message: "Error al crear la banca"
            })
        }

        return ({
            status: "success",
            message: "Banca creada correctamente",
            bank: newBank
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
        const bank = await Bank.findByIdAndDelete(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "Banca no encontrada"
            })
        }

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

// Inicializar la partida
async function initBoard(req) {
    // Parámetros: boardId, bankId, players, typeBoardName
    try {
        const boardId = req.body.boardId
        const bankId = req.body.bankId
        const players = req.body.players
        const numPlayers = players.length + 1

        // Mazo total
        const totalMaze = [...allCards, ...allCards]

        // Mezclar las cartas
        const shuffledCards = shuffle(totalMaze);

        const cartasPorJugador = Math.floor(shuffledCards.length / numPlayers);
        const maze = []
        let bankMazeCollect
        // Dividir las cartas en mazos según el número de jugadores (numJugadores + banca)
        for (let i = 0; i < numPlayers; i++) {
            // Obtener las cartas para el mazo actual
            const inicio = i * cartasPorJugador;
            const fin = (i + 1) * cartasPorJugador;            
            // Agregar el mazo al arreglo de mazos
            // Si no es el último jugador (banca)
            if (i !== numPlayers - 1) {
                // Agregar mazo jugador
                const mazo = {
                    playerId: players[i].player,
                    cards: shuffledCards.slice(inicio, fin)
                }
                maze.push(mazo);

                // Si es la banca, agregar a banca
            } else {
                bankMazeCollect = shuffledCards.slice(inicio, fin)
            }
        }
        // Resetear los playersHands
        const playersHands = []
        for (const player of players) {
            const playerHand =  {
                playerId: player.player,
                split: false,
                double: [],  // En que manos ha hecho double
                hands: [[],[]],
            }
            playersHands.push(playerHand)
        }        

        // Iniciar mazos y manos de jugadores y banca
        // const reqCollectCards = { body: { bankId: bankId, players: players } }
        // var resCollectCards = await collectCards(reqCollectCards)
        // if (resCollectCards.status !== "success") return resCollectCards

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        // Inicializar maxos y jugadas vacías
        let bankMaze = maze
        let bankBankMaze = bankMazeCollect

        const initBoard = [];
        let drawCard
        let cards
        // Sacar dos cartas por cada jugador del board
        for (const player of players) {
            // Obtener indice jugador en maze
            const index = bankMaze.findIndex(m => m.playerId.equals(player.player));
            if (index === -1) {
                return ({
                    status: "error",
                    message: "Este jugador no tiene un mazo asignado"
                })
            }
            cards = []
            const playerMaze = bankMaze[index].cards;
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
            bankMaze[index].cards = playerMaze;  // Guardar cambios en baraja

            // Si con esas dos cartas ha hecho blackJack, confirmar jugada
            if(totalPlayerCards === numBlackJack) {
                const reqConfirm = { body: { userId: player.player,
                                    typeBoardName: req.body.typeBoardName,
                                    boardId: boardId,
                                    cardsOnTable: cards,
                                    bankId: bankId,
                                    handIndex: 0 } }
                const resConfirm = await confirmPriv(reqConfirm)
                if (resConfirm.status === "error") return (resConfirm)
            }

            const playerObject = {
                userId: player.player,
                cards: cards,
                totalCards: totalPlayerCards,
                blackJack: totalPlayerCards === numBlackJack
            }
            initBoard.push(playerObject);
        }

        // Sacar una carta de la banca
        cards = []
        if (bankBankMaze.length === 0) {
            return ({
                status: "error",
                message: "El mazo de la banca está vacío",
                bank
            })
        }
        // Obtener una carta de la banca
        drawCard = bankBankMaze.shift();
        cards.push(drawCard)
        const totalBankCards = valueCards(cards)
        const bankObject = {
            userId: "Bank",
            cards: cards,
            totalCards: totalBankCards,
            blackJack: totalBankCards === numBlackJack
        }
        initBoard.push(bankObject);
        
        // Guardar campos bank
        bank.bankHand = cards
        bank.playersHands = playersHands
        bank.bankMaze = bankBankMaze
        bank.maze = bankMaze

        await bank.save();
        
        return({
            status: "success",
            message: "Cartas iniciales de jugadores y banca obtenidos con éxito",
            initBoard
        })
    } catch (error) {
        return {
            status: "error",
            message: "Error al hacer initBoard. " + error.message
        };
    }
}

// Calcular premio para public y private
function calcularEarnedCoins(totalesJugador, blackJacksJugador, 
                         doubleHands, totalesAll, 
                         totalBanca, blackJackBanca, bet) {
    
    // Si ha sido apuesta doble en dicha mano                       
    let doubleBet = 1
    const premioIgualBanca = bet;
    const premioMejorQueBanca = bet * 1.5 * doubleBet;
    const premioMejorQueJugadores = bet * 2 * doubleBet;
    const premioBlackjack = bet * 3 * doubleBet;

    // //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // console.log("Dentro de calcularEarnedCoins:")
    // console.log("               TotalesJugasor:", totalesJugador)
    // console.log("            blackJacksJugador:", blackJacksJugador)
    // console.log("                   totalesAll:", totalesAll)
    // console.log("                   totalBanca:", totalBanca)
    // console.log("               blackJackBanca:", blackJackBanca)
    // console.log("                          bet:", bet)
    // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const coinsGanadasPorJugador = [];
    
    // Para cada jugada del jugador
    for (let i = 0; i < totalesJugador.length; i++) {

        // Puntuacion una mano del jugador
        const totalJugador = totalesJugador[i]
        // Booleano si es blackJack del jugador
        const blackJackJugador = blackJacksJugador[i]

        // Si en dicha mano ha hecho double
        if (doubleHands.includes(i)) {
            doubleBet = 2
        } else {
            doubleBet = 1
        }

        // /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // console.log("                               totalJugador : ", totalJugador)
        // console.log("                               blackJackJugador: ", blackJackJugador)
        // ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // No ha hecho stick
        if (totalJugador === 0) {
            coinsGanadasPorJugador.push(0);
        }
        // Si es mayor que 21 ha perdido
        else if (totalJugador > numBlackJack) {
            coinsGanadasPorJugador.push(0);
        }
        // Haces blackJack y la banca no
        else if (blackJackJugador && !blackJackBanca) {
            coinsGanadasPorJugador.push(parseInt(premioBlackjack * doubleBet));
        }
        // Igual que la banca
        else if (totalJugador === totalBanca) {
            coinsGanadasPorJugador.push(parseInt(premioIgualBanca * doubleBet));
        } 
        // Mayor que la banca
        else if (totalJugador > totalBanca || totalBanca > numBlackJack) {
            const totalesAllCopy = [...totalesAll]            // Encuentra el índice del resultado actual
            const index = totalesAllCopy.indexOf(totalJugador); 
            if (index !== -1) { // Verifica si se encontró
                totalesAllCopy.splice(index, 1); // Elimina el totalJugador actual
            }

            // console.log("                                          index: ", index)/////////////////////////////////////////////////////////////////////////////
            // console.log("                                 totalesAllCopy: ", totalesAllCopy)//////////////////////////////////////////////////////////////////////

            // Además, mayor que todos los jugadores
            // Puntuación mayor jugador o si es menor, que el otro se haya pasado
            if (totalesAllCopy.every(puntuacion => (puntuacion < totalJugador) || (puntuacion > numBlackJack))) {
                coinsGanadasPorJugador.push(parseInt(premioMejorQueJugadores * doubleBet));
            } 
            // Algún jugador igual o mejor que tú. Redondear porque multiplica a 
            else {
                coinsGanadasPorJugador.push(parseInt(Math.round(premioMejorQueBanca * doubleBet)));
            }
        } else {
            coinsGanadasPorJugador.push(0);
        }
    }

    // console.log("Monedas ganadas por le jugador: ", coinsGanadasPorJugador)//////////////////////////////////////////////////////////////

    return coinsGanadasPorJugador;
}

// Calcular premio para tournament
function calcularLoseLife(totalesJugador, blackJacksJugador, 
                          totalesAll, 
                          totalBanca, blackJackBanca) {
    const loseLife = 1
    const loseHalfLife = 0.5
    const noLoseLife = 0
    
    // Puntuacion una mano del jugador
    const totalJugador = totalesJugador[0]
    // Booleano si es blackJack del jugador
    const blackJackJugador = blackJacksJugador[0]

    // Encuentra el índice del resultado actual
    const totalesAllCopy = [...totalesAll]
    const index = totalesAllCopy.indexOf(totalJugador); 
    if (index !== -1) { // Verifica si se encontró
        totalesAllCopy.splice(index, 1); // Elimina el totalJugador actual
    }
    // Puntuacion una mano del jugador oponente
    const totalOponente = totalesAllCopy[0]

    // No ha hecho stick
    if (totalJugador === 0) {
        return loseLife
    }
    // Si es mayor que 21, pierde vida
    if (totalJugador > numBlackJack) {
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
    else if (totalJugador > totalBanca || totalBanca > numBlackJack) {
        // Tiene mejor que banca y mejor que jugador oponente
        if (totalJugador > totalOponente || totalOponente > numBlackJack) {
            return noLoseLife
        } 
        // Tiene mejor que banca y peor que jugador oponente
        else if (totalJugador < totalOponente) {
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
    // Parámetros: bankId, typeBoardName, bet
    try {
        const bankId = req.body.bankId
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
        for (let i = 0; i < bank.playersHands.length; i++) {
            // Ingresar total cartas por jugador
            for (let j = 0; j < bank.playersHands[i].hands.length; j++) {
                // Ingresar el total por mano jugada
                totalCardsAllPlayers.push(valueCards(bank.playersHands[i].hands[j]))
            }
        }

        // Banca realiza su jugada
        let cardsBank = bank.bankHand
        let totalBank = 0
        let bankMaze = bank.bankMaze
        if (bankMaze.length === 0) {
            return ({
                status: "error",
                message: "El mazo de la banca está vacío",
                bank
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
        // Crear una respuesta por jugador 
        // Iterar todos los jugadores de la partida
        for (const player of bank.playersHands) {
            const user = await User.findById(player.playerId);
            if (!user) {
                return {
                    status: "error",
                    message: "No existe un usuario que está en players del board. Error en Bank.results."
                }
            }
            // Manos del jugador que se quiere generar respuesta
            const playerHands = player.hands

            // Si ha sido blackJack la banca
            let blackJackBank = (totalBank === numBlackJack && cardsBank.length === 2)
            // Variable para guardar total cartas jugador respuesta
            let totalCardsPlayer = []  
            for (let i = 0; i < playerHands.length; i++) {
                totalCardsPlayer.push(valueCards(playerHands[i]))
            }
            // Guardar booleano si las cartas del jugador respuesta ha sido blackJack
            let blackJacksPlayer = []     
            for (let i = 0; i < totalCardsPlayer.length; i++) {
                blackJacksPlayer.push(totalCardsPlayer[i] === numBlackJack && playerHands[i].length === 2)
            }

            if (typeBoardName === "tournament") {
                // Calcular loseLife
                const loseLife = calcularLoseLife(totalCardsPlayer, blackJacksPlayer,
                                                        totalCardsAllPlayers, 
                                                        totalBank, blackJackBank)
                const playerObject = {
                    userId: player.playerId,   // Id del usuario
                    userNick: user.nick,     // Nick del usuario
                    // En torneo solo hay una mano
                    cards: playerHands[0],   // [ cards ]  
                    total: totalCardsPlayer[0], // totalCards
                    lives: loseLife       // loseLife
                }
                results.push(playerObject)

            } else if (typeBoardName === "public" || 
                       typeBoardName === "private" ||
                       typeBoardName === "single") {
                // Si la apuesta ha sido doble: true
                const doubleHands = player.double
                // Calcular coinsEarned
                const coinsEarned = calcularEarnedCoins(totalCardsPlayer, blackJacksPlayer,
                                                        doubleHands, totalCardsAllPlayers, 
                                                        totalBank, blackJackBank, bet)

                const playerObject = {
                    userId: player.playerId,   // Id del usuario
                    userNick: user.nick,     // Nick del usuario
                    // En public / private puede haber 1 o 2 manos
                    cards: playerHands,      // [[ cards ]]
                    total: totalCardsPlayer,    // [ totalCards ]
                    coinsEarned: coinsEarned,   // [ coinsEarned ]
                    currentCoins: 0
                }
                results.push(playerObject)
            }  
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
            message: "Resultados obtenidos correctamente",
            results
        })
    } catch (error) {
        return {
            status: "error",
            message: "Error al obtener los resultados. " + error.message
        };
    }
}

/*************************** Funciones logica *****************************/

// Función para pedir una carta
async function drawCard(req) {
    // Parámetros requeridos: userId, boardId, typeBoardName, bankId, cardsOnTable, handIndex
    try {
        // Id del usuario peticion
        const userId = req.body.userId

        // Obtener id de la banca
        const bankId = req.body.bankId

        // Info board
        const boardId = req.body.boardId

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }
        if (bank.maze.length === 0) {
            return ({
                status: "error",
                message: "La banca no tiene mazos"
            })
        }

        // Obtener el mazo correspondiente al jugador
        const playerIndex = bank.maze.findIndex(m => m.playerId == userId);
        if (playerIndex === -1) {
            return ({
                status: "error",
                message: "El jugador no tiene un mazo asignado"
            })
        }
        const playerMaze = bank.maze[playerIndex].cards;
        if (playerMaze.length === 0) {
            return ({
                status: "error",
                message: "El mazo del jugador está vacío"
            })
        }

        // Tomar la primera carta del mazo del jugador
        const drawCard = playerMaze.shift();
        // Actualizar el mazo del jugador en el tablero
        bank.maze[playerIndex].cards = playerMaze;
        // Guardar el tablero actualizado en la base de datos
        await bank.save();

        // Cartas que tiene de momento
        const cardsOnTable = req.body.cardsOnTable
        cardsOnTable.push(drawCard)
        // Obtener el total de las cartas
        const totalCards = valueCards(cardsOnTable)

        if (totalCards < numBlackJack) {   // Devolver las cartas
            return ({
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
                                         boardId: boardId,
                                         cardsOnTable: cardsOnTable,
                                         bankId: bankId,
                                         handIndex: req.body.handIndex } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return (resConfirm)
            return ({
                status: "success",
                message: "Carta obtenida correctamente. Se ha pasado de " + numBlackJack + ". Para de jugar. Ha perdido",
                cardsOnTable,
                totalCards,
                defeat: true,
                blackJack: false
            })
        } else if (totalCards === numBlackJack) {  // Confirmar hand, ha hecho BlackJack
            const reqConfirm = { body: { userId: userId,
                                         typeBoardName: req.body.typeBoardName,
                                         boardId: boardId,
                                         cardsOnTable: cardsOnTable,
                                         bankId: bankId,
                                         handIndex: req.body.handIndex } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return (resConfirm)
            return ({
                status: "success",
                message: "Carta obtenida correctamente. Ha obtenido justo " + numBlackJack + ". Para de jugar",
                cardsOnTable,
                totalCards,
                defeat: false,
                blackJack: true
            })
        }

    } catch (error) {
        return ({
            status: "error",
            message: error.message + ". En drawCards."
        })
    }
}

// Función para doblar
// Pedirá una carta extra
async function double(req) {
    // Parámetros requeridos: userId, boardId, typeBoardName, bankId, cardsOnTable, handIndex
    try {

        // Id del usuario peticion
        const userId = req.body.userId

        // Info board
        const boardId = req.body.boardId

        // Error. No se puede hacer double en un tournament
        if (req.body.typeBoardName === "tournament") {
            return ({
                status: "error",
                message: "No se puede  doblar en una partida de torneo"
            })
        }

        // Cartas que tiene de momento
        const cardsOnTable = req.body.cardsOnTable
        if (cardsOnTable.length !== numCardsDouble) {
            return ({
                status: "error",
                message: "Para doblar debe haber " + numCardsDouble + " cartas"
            })
        }

        // Obtener id de la banca
        const bankId = req.body.bankId

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }
        if (bank.maze.length === 0) {
            return ({
                status: "error",
                message: "La banca no tiene mazos"
            })
        }

        // Obtener el mazo correspondiente al jugador
        const playerIndex = bank.maze.findIndex(m => m.playerId == userId);
        if (playerIndex === -1) {
            return ({
                status: "error",
                message: "El jugador no tiene un mazo asignado"
            })
        }
        const playerMaze = bank.maze[playerIndex].cards;
        if (playerMaze.length === 0) {
            return ({
                status: "error",
                message: "El mazo del jugador está vacío"
            })
        }

        // Tomar la primera carta del mazo del jugador
        const drawCard = playerMaze.shift();
        // Actualizar el mazo del jugador en el tablero
        bank.maze[playerIndex].cards = playerMaze

        // Indica que ha hecho double
        let playerIndexHand = bank.playersHands.findIndex(h => h.playerId == userId);
        if (playerIndexHand === -1) {
            const playerHand =  {
                playerId: userId,
                split: false,
                double: [],  // En que manos ha hecho double
                hands: [[],[]],
            }
            bank.playersHands.push(playerHand)
            // return ({
            //     status: "error",
            //     message: "Este jugador no tiene componente de jugadas confirmadas"
            // })
        }
        playerIndexHand = bank.playersHands.findIndex(h => h.playerId == userId)
        if (playerIndexHand === -1) {
            return ({
                status: "error",
                message: "Este jugador no tiene componente de jugadas confirmadas"
            })
        }
        bank.playersHands[playerIndexHand].double.push(req.body.handIndex)
        // Guardar el tablero actualizado en la base de datos
        await bank.save();

        // Obtener el total de las cartas
        cardsOnTable.push(drawCard)
        const totalCards = valueCards(cardsOnTable)

        // Responder
        const reqConfirm = { body: { userId: userId,
                             typeBoardName: req.body.typeBoardName,
                             boardId: boardId,
                             cardsOnTable: cardsOnTable,
                             bankId: bankId,
                             handIndex: req.body.handIndex } }
        const resConfirm = await confirmPriv(reqConfirm)
        if (resConfirm.status === "error") return (resConfirm)
        return ({
            status: "success",
            message: "Carta obtenida correctamente. Ha hecho un double",
            cardsOnTable,
            totalCards,
            defeat: totalCards > numBlackJack,
            blackJack: totalCards == numBlackJack
        })
    } catch (error) {
        return ({
            status: "error",
            message: error.message + ". En double."
        })
    }
}

// Función para dividir
async function split(req) {
    // Parámetros requeridos: userId, boardId, typeBoardName, bankId, cardsOnTable
    try {

        // Id del usuario peticion
        const userId = req.body.userId

        // Info board
        const boardId = req.body.boardId

        // Cartas del jugador
        const cardsOnTable = req.body.cardsOnTable
        if (cardsOnTable.length !== numCardsSplit) {
            return ({
                status: "error",
                message: "Para dividir debe haber " + numCardsSplit + " cartas"
            })
        }
        if (cardsOnTable[0].value !== cardsOnTable[1].value) {
            return ({
                status: "error",
                message: "Para dividir las dos cartas deben de ser iguales"
            })
        }

        // Obtener id de la banca
        const bankId = req.body.bankId

        // Obtener la banca
        const bank = await Bank.findById(bankId)
        if (!bank) {
            return ({
                status: "error",
                message: "No se ha encontrado una banca con dicho id"
            })
        }
        if (bank.maze.length === 0) {
            return ({
                status: "error",
                message: "La banca no tiene mazos"
            })
        }

        // Obtener el mazo correspondiente al jugador
        const playerIndex = bank.maze.findIndex(m => m.playerId == userId);
        if (playerIndex === -1) {
            return ({
                status: "error",
                message: "El jugador no tiene un mazo asignado"
            })
        }
        const playerMaze = bank.maze[playerIndex].cards;
        if (playerMaze.length === 0) {
            return ({
                status: "error",
                message: "El mazo del jugador está vacío"
            })
        }

        // Tomar las dos primeras cartas del mazo del jugador
        const drawCardFirst = playerMaze.shift();
        const drawCardSecond = playerMaze.shift();
        // Actualizar el mazo del jugador en el tablero
        bank.maze[playerIndex].cards = playerMaze;

        // Indica que ha hecho split
        let playerIndexHand = bank.playersHands.findIndex(h => h.playerId == userId);
        if (playerIndexHand === -1) {
            const playerHand =  {
                playerId: userId,
                split: false,
                double: [],  // En que manos ha hecho double
                hands: [[],[]],
            }
            bank.playersHands.push(playerHand)
            // return ({
            //     status: "error",
            //     message: "Este jugador no tiene componente de jugadas confirmadas"
            // })
        }
        playerIndexHand = bank.playersHands.findIndex(h => h.playerId == userId)
        if (playerIndex === -1) {
            return ({
                status: "error",
                message: "Este jugador no tiene componente de jugadas confirmadas"
            })
        }
        bank.playersHands[playerIndexHand].split = true
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
                                         boardId: boardId,
                                         cardsOnTable: cardsOnTableFirst,
                                         bankId: bankId,
                                         handIndex: 0 } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return (resConfirm)
        }
        if (totalCardsSecond >= numBlackJack) {  // Mirar cartas segundo mazo
            const reqConfirm = { body: { userId: userId,
                                         typeBoardName: req.body.typeBoardName,
                                         boardId: boardId,
                                         cardsOnTable: cardsOnTableSecond,
                                         bankId: bankId,
                                         handIndex: 1 } }
            const resConfirm = await confirmPriv(reqConfirm)
            if (resConfirm.status === "error") return (resConfirm)
        }
        
        return ({
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
        return ({
            status: "error",
            message: error.message + ". En split."
        })
    }
}

// Función para plantarse
async function stick(req) {
    // Parámetros requeridos: userId, boardId, typeBoardName, bankId, cardsOnTable, handIndex
    try {

        // Id del usuario peticion
        const userId = req.body.userId

        // Info board
        const boardId = req.body.boardId

        // Obtener id de la banca
        const bankId = req.body.bankId

        // Realizar confirmación de las cartas
        const reqConfirm = { body: { userId: userId,
                             typeBoardName: req.body.typeBoardName,
                             boardId: boardId,
                             cardsOnTable: req.body.cardsOnTable,
                             bankId: bankId,
                             handIndex: req.body.handIndex } }
        const resConfirm = await confirmPriv(reqConfirm)
        if (resConfirm.status === "error") return (resConfirm)
    
        return ({
            status: "success",
            message: "Confirmación de las cartas realizado con éxito",
            cardsOnTable: req.body.cardsOnTable
        })
    
    } catch (error) {
        return ({
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
    initBoard,
    results,
    drawCard,
    double,
    split,
    stick
}