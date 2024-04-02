// Imports de esquemas necesarios
const Bank = require("../models/bankSchema")

class Card {
    constructor(value, suit) {
        this.value = value
        this.suit = suit
    }
}

class Deck {
    constructor() {
        this.cards = this.createDeck() // Las cartas son fijas y no se tocan
        this.maze = this.cards // El mazo puede ir variando al sacar cartas
    }

    // Hearts: corazones
    // Diamonds: diamantes
    // Clubs: tréboles
    // Spades: picas
    createDeck() {
        const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades']
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace']
        const cards = []

        for (const suit of suits) {
            for (const value of values) {
                cards.push(new Card(value, suit))
            }
        }

        return new Deck(cards)
    }

    collectCards() {
        this.maze = this.cards
    }

    drawCard() {
        if (this.maze.length === 0) {
            this.collectCards()
        }

        const randomIndex = Math.floor(Math.random() * this.maze.length)
        const card = this.maze[randomIndex]
        this.maze.splice(randomIndex, 1) // Remover la carta de la baraja
        return card
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
    eliminate
}