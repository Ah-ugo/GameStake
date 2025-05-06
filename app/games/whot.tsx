"use client"

import { useRouter } from "expo-router"
import { useState, useEffect, useRef } from "react"
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import { useWallet } from "../../context/wallet-context"
import { useToast } from "../../context/toast-context"
import * as Haptics from "expo-haptics"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { placeBet } from "../../lib/api"

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.15
const CARD_HEIGHT = CARD_WIDTH * 1.5
const CARD_MARGIN = 5

// Define card shapes
const SHAPES = {
  CIRCLE: "circle",
  TRIANGLE: "triangle",
  SQUARE: "square",
  CROSS: "cross",
  STAR: "star",
  WHOT: "whot",
}

// Define card colors
const COLORS = {
  RED: "#e74c3c",
  BLUE: "#3498db",
  YELLOW: "#f1c40f",
  GREEN: "#2ecc71",
}

// Create the Whot deck
const createDeck = () => {
  const deck = []
  let id = 1

  // Add numbered cards (1-14) for each shape and color
  Object.keys(SHAPES).forEach((shape) => {
    if (shape === "WHOT") return // Skip WHOT for now

    Object.keys(COLORS).forEach((color) => {
      for (let number = 1; number <= 14; number++) {
        deck.push({
          id: id++,
          shape: SHAPES[shape],
          color: COLORS[color],
          number,
          special: getSpecialAction(number),
        })
      }
    })
  })

  // Add WHOT cards (20 of them)
  for (let i = 0; i < 5; i++) {
    deck.push({
      id: id++,
      shape: SHAPES.WHOT,
      color: "#000000",
      number: 20,
      special: "whot",
    })
  }

  return deck
}

// Get special action based on card number
const getSpecialAction = (number) => {
  switch (number) {
    case 1:
      return "hold-on"
    case 2:
      return "pick-two"
    case 5:
      return "pick-three"
    case 8:
      return "suspension"
    case 14:
      return "general-market"
    default:
      return null
  }
}

// Helper function to get card description
const getCardDescription = (card) => {
  if (card.shape === SHAPES.WHOT) {
    return "WHOT card"
  }

  let description = ""

  // Add special action name if it exists
  if (card.special) {
    switch (card.special) {
      case "hold-on":
        description = "Hold On "
        break
      case "pick-two":
        description = "Pick 2 "
        break
      case "pick-three":
        description = "Pick 3 "
        break
      case "suspension":
        description = "Suspension "
        break
      case "general-market":
        description = "General Market "
        break
    }
  }

  // Add number and shape
  description += `${card.number} ${card.shape}`

  return description
}

const WhotGame = () => {
  const router = useRouter()
  const { balance, updateBalance } = useWallet()
  const { showToast } = useToast()
  const [betAmount, setBetAmount] = useState(5)
  const [gameState, setGameState] = useState("BETTING") // BETTING, PLAYING, RESULT
  const [deck, setDeck] = useState([])
  const [discardPile, setDiscardPile] = useState([])
  const [playerHand, setPlayerHand] = useState([])
  const [aiHand, setAiHand] = useState([])
  const [currentPlayer, setCurrentPlayer] = useState("PLAYER") // PLAYER, AI
  const [selectedCard, setSelectedCard] = useState(null)
  const [marketCount, setMarketCount] = useState(0)
  const [gameLog, setGameLog] = useState([])
  const [winner, setWinner] = useState(null)
  const [requestedShape, setRequestedShape] = useState(null)
  const [showShapeSelector, setShowShapeSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [betPlaced, setBetPlaced] = useState(false)
  const cardAnimations = useRef({}).current
  const discardAnimation = useRef(new Animated.Value(0)).current

  // Initialize card animations
  useEffect(() => {
    const allCards = [...deck, ...playerHand, ...aiHand, ...discardPile]
    allCards.forEach((card) => {
      if (!cardAnimations[card.id]) {
        cardAnimations[card.id] = {
          scale: new Animated.Value(1),
          rotate: new Animated.Value(0),
          translateY: new Animated.Value(0),
        }
      }
    })
  }, [deck, playerHand, aiHand, discardPile])

  const addLogMessage = (message) => {
    setGameLog((prev) => [...prev, { id: Date.now(), message }])
  }

  const increaseBet = () => {
    if (betAmount + 5 <= balance) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setBetAmount(betAmount + 5)
    } else {
      showToast("Insufficient balance", "error")
    }
  }

  const decreaseBet = () => {
    if (betAmount - 5 >= 5) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setBetAmount(betAmount - 5)
    }
  }

  const shuffleDeck = (cards) => {
    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const dealCards = () => {
    const shuffledDeck = shuffleDeck(createDeck())

    // Deal 5 cards to each player
    const playerCards = shuffledDeck.slice(0, 5)
    const aiCards = shuffledDeck.slice(5, 10)

    // First card in discard pile
    const firstDiscard = shuffledDeck[10]

    // Remaining deck
    const remainingDeck = shuffledDeck.slice(11)

    setDeck(remainingDeck)
    setPlayerHand(playerCards)
    setAiHand(aiCards)
    setDiscardPile([firstDiscard])

    // Handle if first card is special
    handleSpecialCard(firstDiscard, true)
  }

  const startGame = async () => {
    if (balance < betAmount) {
      showToast("Insufficient balance", "error")
      return
    }

    try {
      setIsLoading(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Place bet through API
      const response = await placeBet(betAmount, "whot")

      if (!response || !response.success) {
        throw new Error(response?.message || "Failed to place bet")
      }

      // Update balance
      updateBalance(-betAmount)
      setBetPlaced(true)

      // Start the game
      setGameState("PLAYING")
      dealCards()
      addLogMessage("Game started! You go first")
    } catch (error) {
      console.error("Bet error:", error)
      showToast(error.message || "Failed to place bet", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // For testing/demo purposes - skip the betting phase
  const skipBetting = () => {
    setGameState("PLAYING")
    dealCards()
    addLogMessage("Game started! You go first")
  }

  const drawCard = (player, count = 1) => {
    if (deck.length === 0) {
      // If deck is empty, shuffle discard pile except top card
      const topCard = discardPile[discardPile.length - 1]
      const newDeck = shuffleDeck(discardPile.slice(0, -1))
      setDeck(newDeck)
      setDiscardPile([topCard])

      if (newDeck.length === 0) {
        // If still no cards, end the game
        endGame(player === "PLAYER" ? "AI" : "PLAYER")
        return []
      }
    }

    // Draw cards from deck
    const drawnCards = deck.slice(0, Math.min(count, deck.length))
    const newDeck = deck.slice(Math.min(count, deck.length))
    setDeck(newDeck)

    // Add cards to player's hand
    if (player === "PLAYER") {
      setPlayerHand((prev) => [...prev, ...drawnCards])
      addLogMessage(`You drew ${count} card${count > 1 ? "s" : ""}`)
    } else {
      setAiHand((prev) => [...prev, ...drawnCards])
      addLogMessage(`AI drew ${count} card${count > 1 ? "s" : ""}`)
    }

    return drawnCards
  }

  const canPlayCard = (card) => {
    if (marketCount > 0) {
      // If there's a market count, can only play cards that increase the market
      return card.special === "pick-two" || card.special === "pick-three" || card.special === "general-market"
    }

    const topCard = discardPile[discardPile.length - 1]

    // WHOT card can be played on anything
    if (card.shape === SHAPES.WHOT) {
      return true
    }

    // If there's a requested shape, must match that
    if (requestedShape) {
      return card.shape === requestedShape
    }

    // Otherwise, match shape, number, or color
    return card.shape === topCard.shape || card.number === topCard.number || card.color === topCard.color
  }

  const playCard = (cardId) => {
    if (currentPlayer !== "PLAYER") return

    const cardIndex = playerHand.findIndex((c) => c.id === cardId)
    if (cardIndex === -1) return

    const card = playerHand[cardIndex]

    if (!canPlayCard(card)) {
      showToast("You can't play this card", "error")
      return
    }

    // Remove card from player's hand
    const newPlayerHand = [...playerHand]
    newPlayerHand.splice(cardIndex, 1)
    setPlayerHand(newPlayerHand)

    // Add card to discard pile
    setDiscardPile((prev) => [...prev, card])

    // Animate card to discard pile
    animateCardToDiscard(card.id)

    addLogMessage(`You played ${getCardDescription(card)}`)

    // Check if player has won
    if (newPlayerHand.length === 0) {
      endGame("PLAYER")
      return
    }

    // Handle special card effects
    handleSpecialCard(card)

    // If card is WHOT, show shape selector
    if (card.shape === SHAPES.WHOT) {
      setShowShapeSelector(true)
      return
    }

    // Reset requested shape if it was set
    setRequestedShape(null)

    // Next turn
    setCurrentPlayer("AI")
    setTimeout(playAiTurn, 1000)
  }

  const handleSpecialCard = (card, isFirstCard = false) => {
    if (!card.special) return

    switch (card.special) {
      case "pick-two":
        if (!isFirstCard) {
          setMarketCount((prev) => prev + 2)
          addLogMessage("Pick 2! Market count is now " + (marketCount + 2))
        }
        break
      case "pick-three":
        if (!isFirstCard) {
          setMarketCount((prev) => prev + 3)
          addLogMessage("Pick 3! Market count is now " + (marketCount + 3))
        }
        break
      case "general-market":
        if (!isFirstCard) {
          setMarketCount((prev) => prev + 4)
          addLogMessage("General Market! Market count is now " + (marketCount + 4))
        }
        break
      case "hold-on":
        addLogMessage("Hold on! " + (currentPlayer === "PLAYER" ? "You" : "AI") + " gets another turn")
        // Player gets another turn
        if (!isFirstCard) {
          setTimeout(() => {
            if (currentPlayer === "PLAYER") {
              // Do nothing, player keeps their turn
            } else {
              playAiTurn()
            }
          }, 1000)
        }
        return // Don't change turns
      case "suspension":
        addLogMessage("Suspension! " + (currentPlayer === "PLAYER" ? "AI" : "You") + " misses a turn")
        // Skip next player's turn
        if (!isFirstCard) {
          setTimeout(() => {
            if (currentPlayer === "PLAYER") {
              // Player gets another turn after AI is skipped
              setCurrentPlayer("PLAYER")
            } else {
              // AI gets another turn after player is skipped
              playAiTurn()
            }
          }, 1000)
        }
        return // Don't change turns yet
      case "whot":
        // Handled separately with shape selection
        addLogMessage((currentPlayer === "PLAYER" ? "You" : "AI") + " played WHOT")
        return
    }
  }

  const selectShape = (shape) => {
    setRequestedShape(shape)
    setShowShapeSelector(false)
    addLogMessage(`You requested ${shape}`)

    // Next turn
    setCurrentPlayer("AI")
    setTimeout(playAiTurn, 1000)
  }

  const handleMarket = () => {
    if (currentPlayer !== "PLAYER") return

    if (marketCount > 0) {
      // Player must pick up cards
      drawCard("PLAYER", marketCount)
      setMarketCount(0)

      // Next turn
      setCurrentPlayer("AI")
      setTimeout(playAiTurn, 1000)
    } else {
      // Normal market - check if player can play any card
      const canPlay = playerHand.some((card) => canPlayCard(card))

      if (canPlay) {
        showToast("You have a playable card", "error")
        return
      }

      // Draw a card
      const drawnCards = drawCard("PLAYER")

      // Check if drawn card can be played
      if (drawnCards.length > 0 && canPlayCard(drawnCards[0])) {
        addLogMessage(`You can play the ${getCardDescription(drawnCards[0])} you just drew`)
      } else {
        // Next turn
        setCurrentPlayer("AI")
        setTimeout(playAiTurn, 1000)
      }
    }
  }

  const playAiTurn = () => {
    if (gameState !== "PLAYING" || currentPlayer !== "AI") return

    // If there's a market count, AI must pick up cards if it can't play a market card
    if (marketCount > 0) {
      const marketCard = aiHand.find(
        (card) => card.special === "pick-two" || card.special === "pick-three" || card.special === "general-market",
      )

      if (marketCard) {
        // AI plays a market card
        playAiCard(marketCard)
      } else {
        // AI must pick up cards
        drawCard("AI", marketCount)
        setMarketCount(0)
        setCurrentPlayer("PLAYER")
      }
      return
    }

    // Find a card AI can play
    const playableCards = aiHand.filter((card) => canPlayCard(card))

    if (playableCards.length > 0) {
      // Sort cards by priority (special cards first, then by matching criteria)
      playableCards.sort((a, b) => {
        // Prioritize special cards
        if (a.special && !b.special) return -1
        if (!a.special && b.special) return 1

        // Then prioritize WHOT cards
        if (a.shape === SHAPES.WHOT && b.shape !== SHAPES.WHOT) return -1
        if (a.shape !== SHAPES.WHOT && b.shape === SHAPES.WHOT) return 1

        return 0
      })

      // Play the highest priority card
      playAiCard(playableCards[0])
    } else {
      // AI must draw a card
      const drawnCards = drawCard("AI")

      // Check if drawn card can be played
      if (drawnCards.length > 0 && canPlayCard(drawnCards[0])) {
        setTimeout(() => {
          playAiCard(drawnCards[0])
        }, 1000)
      } else {
        // Next turn
        setCurrentPlayer("PLAYER")
      }
    }
  }

  const playAiCard = (card) => {
    // Remove card from AI's hand
    const cardIndex = aiHand.findIndex((c) => c.id === card.id)
    const newAiHand = [...aiHand]
    newAiHand.splice(cardIndex, 1)
    setAiHand(newAiHand)

    // Add card to discard pile
    setDiscardPile((prev) => [...prev, card])

    // Animate card to discard pile
    animateCardToDiscard(card.id)

    addLogMessage(`AI played ${getCardDescription(card)}`)

    // Check if AI has won
    if (newAiHand.length === 0) {
      endGame("AI")
      return
    }

    // Handle special card effects
    if (card.special) {
      handleSpecialCard(card)
    }

    // If card is WHOT, AI selects a shape
    if (card.shape === SHAPES.WHOT) {
      // AI selects the shape it has the most of
      const shapeCounts = {}
      newAiHand.forEach((c) => {
        if (c.shape !== SHAPES.WHOT) {
          shapeCounts[c.shape] = (shapeCounts[c.shape] || 0) + 1
        }
      })

      let selectedShape = Object.keys(SHAPES)[0]
      let maxCount = 0

      Object.keys(shapeCounts).forEach((shape) => {
        if (shapeCounts[shape] > maxCount) {
          maxCount = shapeCounts[shape]
          selectedShape = shape
        }
      })

      setRequestedShape(selectedShape)
      addLogMessage(`AI requested ${selectedShape}`)
    } else {
      // Reset requested shape
      setRequestedShape(null)
    }

    // Next turn
    setCurrentPlayer("PLAYER")
  }

  const endGame = (winningPlayer) => {
    setGameState("RESULT")
    setWinner(winningPlayer)

    if (betPlaced) {
      // Handle winnings
      if (winningPlayer === "PLAYER") {
        const winnings = betAmount * 2
        updateBalance(winnings)
        addLogMessage(`You won $${winnings}!`)
      } else {
        addLogMessage(`You lost $${betAmount}.`)
      }
    }

    addLogMessage(`${winningPlayer === "PLAYER" ? "You" : "AI"} won the game!`)
  }

  const animateCardToDiscard = (cardId) => {
    // Animate the card being played
    Animated.sequence([
      Animated.timing(cardAnimations[cardId]?.scale, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnimations[cardId]?.scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Animate the discard pile
    Animated.sequence([
      Animated.timing(discardAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(discardAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Render a card with the appropriate color and shape
  const renderCard = (card, index, isPlayable = false) => {
    const cardStyle = {
      backgroundColor: card.color,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      margin: CARD_MARGIN,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: isPlayable ? "#fff" : "#333",
    }

    const numberStyle = {
      color: card.color === "#000000" || card.color === COLORS.BLUE ? "#fff" : "#000",
      fontSize: 18,
      fontWeight: "bold",
    }

    return (
      <TouchableOpacity
        key={card.id}
        style={cardStyle}
        onPress={() => currentPlayer === "PLAYER" && playCard(card.id)}
        disabled={currentPlayer !== "PLAYER" || !isPlayable}
      >
        <Text style={numberStyle}>{card.number}</Text>
        <Text style={[numberStyle, { fontSize: 14 }]}>{card.shape}</Text>
        {card.special && <Text style={[numberStyle, { fontSize: 12 }]}>{card.special}</Text>}
      </TouchableOpacity>
    )
  }

  // Render AI cards as face down
  const renderAiCard = (card, index) => {
    return (
      <View
        key={card.id}
        style={{
          backgroundColor: "#333",
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          margin: CARD_MARGIN,
          borderRadius: 8,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 2,
          borderColor: "#222",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>WHOT</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#222" }}>
      <StatusBar style="light" />
      <LinearGradient colors={["#333", "#222"]} style={styles.container}>
        {gameState === "BETTING" && (
          <View style={styles.bettingContainer}>
            <Text style={styles.gameTitle}>WHOT Card Game</Text>
            <Text style={styles.balanceText}>Balance: ${balance}</Text>
            <View style={styles.betControls}>
              <TouchableOpacity onPress={decreaseBet} style={styles.betButton} disabled={isLoading}>
                <Ionicons name="remove" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.betAmountText}>Bet Amount: ${betAmount}</Text>
              <TouchableOpacity onPress={increaseBet} style={styles.betButton} disabled={isLoading}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={startGame}
              style={[styles.startButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
            >
              <Text style={styles.startButtonText}>{isLoading ? "Placing Bet..." : "Start Game"}</Text>
            </TouchableOpacity>

            {/* For testing/demo purposes */}
            <TouchableOpacity onPress={skipBetting} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip Betting (Demo)</Text>
            </TouchableOpacity>

            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>How to Play:</Text>
              <Text style={styles.instructionsText}>
                1. Match cards by shape, number, or color{"\n"}
                2. Special cards: Pick 2, Pick 3, Hold On, Suspension, General Market{"\n"}
                3. WHOT cards can be played on any card{"\n"}
                4. First player to play all cards wins
              </Text>
            </View>
          </View>
        )}

        {gameState === "PLAYING" && (
          <View style={styles.gameContainer}>
            <View style={styles.gameHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.gameHeaderText}>{currentPlayer === "PLAYER" ? "Your Turn" : "AI's Turn"}</Text>
              <Text style={styles.balanceText}>Balance: ${balance}</Text>
            </View>

            <View style={styles.aiHand}>
              <Text style={styles.handTitle}>AI Hand ({aiHand.length} cards)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsContainer}>
                {aiHand.map((card, index) => renderAiCard(card, index))}
              </ScrollView>
            </View>

            <View style={styles.discardPileContainer}>
              {marketCount > 0 && (
                <View style={styles.marketCountContainer}>
                  <Text style={styles.marketCountText}>Market: +{marketCount}</Text>
                </View>
              )}

              <Text style={styles.discardPileTitle}>
                {requestedShape ? `Requested: ${requestedShape}` : "Discard Pile"}
              </Text>

              {discardPile.length > 0 && (
                <Animated.View
                  style={[
                    styles.discardCard,
                    {
                      backgroundColor: discardPile[discardPile.length - 1].color,
                      transform: [
                        {
                          scale: discardAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.discardCardNumber}>{discardPile[discardPile.length - 1].number}</Text>
                  <Text style={styles.discardCardShape}>{discardPile[discardPile.length - 1].shape}</Text>
                  {discardPile[discardPile.length - 1].special && (
                    <Text style={styles.discardCardSpecial}>{discardPile[discardPile.length - 1].special}</Text>
                  )}
                </Animated.View>
              )}
            </View>

            <View style={styles.gameActions}>
              <TouchableOpacity
                onPress={handleMarket}
                style={styles.marketButton}
                disabled={currentPlayer !== "PLAYER"}
              >
                <Text style={styles.marketButtonText}>
                  {marketCount > 0 ? `Pick Up ${marketCount}` : "Market (Draw)"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.playerHand}>
              <Text style={styles.handTitle}>Your Hand ({playerHand.length} cards)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsContainer}>
                {playerHand.map((card, index) =>
                  renderCard(card, index, currentPlayer === "PLAYER" && canPlayCard(card)),
                )}
              </ScrollView>
            </View>

            <View style={styles.logContainer}>
              <Text style={styles.logTitle}>Game Log</Text>
              <ScrollView style={styles.logScroll}>
                {gameLog.map((log) => (
                  <Text key={log.id} style={styles.logText}>
                    {log.message}
                  </Text>
                ))}
              </ScrollView>
            </View>

            {showShapeSelector && (
              <View style={styles.shapeSelector}>
                <Text style={styles.shapeSelectorTitle}>Select a Shape</Text>
                <View style={styles.shapeOptions}>
                  {Object.values(SHAPES)
                    .filter((shape) => shape !== SHAPES.WHOT)
                    .map((shape) => (
                      <TouchableOpacity key={shape} style={styles.shapeOption} onPress={() => selectShape(shape)}>
                        <Text style={styles.shapeOptionText}>{shape}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}
          </View>
        )}

        {gameState === "RESULT" && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Game Over</Text>
            <Text style={[styles.resultText, winner === "PLAYER" ? styles.winText : styles.loseText]}>
              {winner === "PLAYER" ? "You Win!" : "AI Wins!"}
            </Text>

            {betPlaced && (
              <Text style={styles.winningsText}>
                {winner === "PLAYER" ? `You won $${betAmount * 2}!` : `You lost $${betAmount}.`}
              </Text>
            )}

            <TouchableOpacity
              onPress={() => {
                setGameState("BETTING")
                setDeck([])
                setDiscardPile([])
                setPlayerHand([])
                setAiHand([])
                setCurrentPlayer("PLAYER")
                setMarketCount(0)
                setGameLog([])
                setWinner(null)
                setRequestedShape(null)
                setShowShapeSelector(false)
                setBetPlaced(false)
              }}
              style={styles.playAgainButton}
            >
              <Text style={styles.playAgainButtonText}>Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/")} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  bettingContainer: {
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
  },
  balanceText: {
    fontSize: 20,
    color: "white",
    marginBottom: 20,
  },
  betControls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  betButton: {
    backgroundColor: "#444",
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  betAmountText: {
    fontSize: 18,
    color: "white",
    minWidth: 150,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: "#555",
    opacity: 0.7,
  },
  startButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  skipButton: {
    backgroundColor: "#555",
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  skipButtonText: {
    color: "#ddd",
    fontSize: 16,
  },
  instructionsContainer: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    marginTop: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    color: "white",
    marginBottom: 10,
    fontWeight: "bold",
  },
  instructionsText: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 22,
  },
  gameContainer: {
    flex: 1,
    width: "100%",
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  gameHeaderText: {
    fontSize: 20,
    color: "white",
    fontWeight: "bold",
  },
  backButton: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    width: "80%",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  logContainer: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 5,
    maxHeight: 100,
    marginBottom: 10,
  },
  logTitle: {
    fontSize: 16,
    color: "white",
    marginBottom: 5,
  },
  logScroll: {
    maxHeight: 80,
  },
  logText: {
    color: "#ddd",
    fontSize: 14,
    marginBottom: 2,
  },
  aiHand: {
    alignItems: "center",
    marginBottom: 10,
  },
  discardPileContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    marginVertical: 10,
  },
  marketCountContainer: {
    position: "absolute",
    top: -15,
    right: 10,
    backgroundColor: "#e74c3c",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  marketCountText: {
    color: "white",
    fontWeight: "bold",
  },
  playerHand: {
    alignItems: "center",
    marginBottom: 10,
  },
  handTitle: {
    fontSize: 16,
    color: "white",
    marginBottom: 5,
  },
  cardsContainer: {
    flexDirection: "row",
    maxHeight: CARD_HEIGHT + CARD_MARGIN * 2,
  },
  discardPileTitle: {
    fontSize: 16,
    color: "white",
    marginBottom: 10,
  },
  discardCard: {
    width: CARD_WIDTH * 1.5,
    height: CARD_HEIGHT * 1.5,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  discardCardNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  discardCardShape: {
    fontSize: 18,
    color: "white",
    marginTop: 5,
  },
  discardCardSpecial: {
    fontSize: 14,
    color: "white",
    marginTop: 5,
    fontStyle: "italic",
  },
  gameActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  marketButton: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: "center",
  },
  marketButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  shapeSelector: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  shapeSelectorTitle: {
    fontSize: 24,
    color: "white",
    marginBottom: 20,
  },
  shapeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: "80%",
  },
  shapeOption: {
    backgroundColor: "#444",
    padding: 15,
    borderRadius: 10,
    margin: 10,
    minWidth: 100,
    alignItems: "center",
  },
  shapeOptionText: {
    color: "white",
    fontSize: 18,
  },
  resultContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  resultTitle: {
    fontSize: 28,
    color: "white",
    marginBottom: 20,
    fontWeight: "bold",
  },
  resultText: {
    fontSize: 36,
    marginBottom: 20,
    fontWeight: "bold",
  },
  winText: {
    color: "#2ecc71",
  },
  loseText: {
    color: "#e74c3c",
  },
  winningsText: {
    fontSize: 24,
    color: "white",
    marginBottom: 30,
  },
  playAgainButton: {
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    marginBottom: 15,
  },
  playAgainButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
})

export default WhotGame
