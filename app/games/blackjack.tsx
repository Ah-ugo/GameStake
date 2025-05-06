"use client";

import { useToast } from "@/context/toast-context";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { G, Path, Rect, Svg, Text as SvgText } from "react-native-svg";
import { useWallet } from "../../context/wallet-context";

const { width } = Dimensions.get("window");

export default function BlackjackScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [dealerScore, setDealerScore] = useState(0);
  const [gameState, setGameState] = useState("idle"); // idle, betting, playing, dealerTurn, won, lost, tie, busted
  const [gameId, setGameId] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);

  const playerCardScale = useSharedValue(1);
  const dealerCardScale = useSharedValue(1);

  useEffect(() => {
    fetchBalance();
  }, []);

  const playerCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playerCardScale.value }],
    };
  });

  const dealerCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dealerCardScale.value }],
    };
  });

  const animateCard = (isPlayer) => {
    const scaleValue = isPlayer ? playerCardScale : dealerCardScale;
    scaleValue.value = withSequence(
      withTiming(1.2, { duration: 200, easing: Easing.bounce }),
      withTiming(1, { duration: 200 })
    );
  };

  const startGame = async () => {
    const amount = Number.parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid bet amount");
      return;
    }

    if (amount > balance) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setGameState("betting");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.post("/games/play/blackjack/start", {
        bet_amount: amount,
      });

      const {
        game_id,
        player_cards,
        dealer_cards,
        player_score,
        dealer_score,
      } = response.data;

      setGameId(game_id);

      // Deal cards with animation
      setTimeout(() => {
        setPlayerCards(player_cards);
        animateCard(true);

        setTimeout(() => {
          setDealerCards(dealer_cards);
          animateCard(false);

          setPlayerScore(player_score);
          setDealerScore(dealer_score);
          setGameState("playing");
        }, 500);
      }, 500);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
      setGameState("idle");
      showToast("Failed to start game", "error");
    }
  };

  const hit = async () => {
    if (gameState !== "playing") return;

    try {
      const response = await api.post(`/games/play/blackjack/hit`, {
        game_id: gameId,
      });

      const { player_cards, player_score, game_status } = response.data;

      setPlayerCards(player_cards);
      animateCard(true);
      setPlayerScore(player_score);

      if (game_status === "busted") {
        setGameState("busted");
        fetchBalance();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast(`You busted with ${player_score}!`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to hit", "error");
    }
  };

  const stand = async () => {
    if (gameState !== "playing") return;

    setGameState("dealerTurn");

    try {
      const response = await api.post(`/games/play/blackjack/stand`, {
        game_id: gameId,
      });

      const { dealer_cards, dealer_score, game_status, winnings } =
        response.data;

      // Animate dealer drawing cards
      const originalDealerCards = [...dealerCards];
      const newCards = dealer_cards.slice(originalDealerCards.length);

      if (newCards.length > 0) {
        let cardIndex = 0;
        const dealerDrawInterval = setInterval(() => {
          if (cardIndex < newCards.length) {
            setDealerCards([
              ...originalDealerCards,
              ...newCards.slice(0, cardIndex + 1),
            ]);
            animateCard(false);
            cardIndex++;
          } else {
            clearInterval(dealerDrawInterval);
            finishGame();
          }
        }, 500);
      } else {
        finishGame();
      }

      function finishGame() {
        setDealerScore(dealer_score);

        if (game_status === "win") {
          setGameState("won");
          confettiRef.current?.play();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast(`You won ₦${winnings.toFixed(2)}!`, "success");
        } else if (game_status === "lose") {
          setGameState("lost");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast(`You lost!`, "error");
        } else if (game_status === "tie") {
          setGameState("tie");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast(`It's a tie!`, "info");
        }

        fetchBalance();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to stand", "error");
    }
  };

  const resetGame = () => {
    setBetAmount("");
    setPlayerCards([]);
    setDealerCards([]);
    setPlayerScore(0);
    setDealerScore(0);
    setGameState("idle");
    setGameId(null);
    setError("");
  };

  const getCardColor = (card) => {
    if (!card) return "#3F2B96";
    return card.includes("hearts") || card.includes("diamonds")
      ? "#F44336"
      : "#212121";
  };

  const getCardSymbol = (card) => {
    if (!card) return "?";
    if (card.includes("hearts")) return "♥";
    if (card.includes("diamonds")) return "♦";
    if (card.includes("clubs")) return "♣";
    if (card.includes("spades")) return "♠";
    return "?";
  };

  const getCardValue = (card) => {
    if (!card) return "";
    return card.split(" ")[0];
  };

  return (
    <SafeAreaView
      style={[styles.container, { marginBottom: 30 }]}
      edges={["top"]}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Blackjack</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.tableContainer}>
          <View style={styles.dealerSection}>
            <Text style={styles.sectionLabel}>
              Dealer {dealerScore > 0 && `(${dealerScore})`}
            </Text>
            <View style={styles.cardsRow}>
              {dealerCards.map((card, index) => (
                <Animated.View
                  key={`dealer-${index}`}
                  style={[
                    styles.cardWrapper,
                    dealerCardStyle,
                    index > 0 && { marginLeft: -40 },
                  ]}
                >
                  <PlayingCard
                    value={getCardValue(card)}
                    symbol={getCardSymbol(card)}
                    color={getCardColor(card)}
                    hidden={index === 0 && gameState === "playing"}
                  />
                </Animated.View>
              ))}
            </View>
          </View>

          <View style={styles.playerSection}>
            <Text style={styles.sectionLabel}>
              You {playerScore > 0 && `(${playerScore})`}
            </Text>
            <View style={styles.cardsRow}>
              {playerCards.map((card, index) => (
                <Animated.View
                  key={`player-${index}`}
                  style={[
                    styles.cardWrapper,
                    playerCardStyle,
                    index > 0 && { marginLeft: -40 },
                  ]}
                >
                  <PlayingCard
                    value={getCardValue(card)}
                    symbol={getCardSymbol(card)}
                    color={getCardColor(card)}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        </View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.controlsContainer}
          >
            <Text style={styles.gameDescription}>
              Try to get as close to 21 as possible without going over. Beat the
              dealer's hand to win!
            </Text>

            <Text style={styles.betLabel}>Enter bet amount:</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.dollarSign}>₦</Text>
              <TextInput
                style={styles.betInput}
                keyboardType="numeric"
                value={betAmount}
                onChangeText={setBetAmount}
                placeholder="0.00"
                placeholderTextColor="#9e9e9e"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              onPress={startGame}
              style={styles.dealButtonContainer}
            >
              <LinearGradient
                colors={["#3F2B96", "#A8C0FF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dealButton}
              >
                <Text style={styles.dealButtonText}>Deal Cards</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {gameState === "betting" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.loadingContainer}
          >
            <Text style={styles.loadingText}>Dealing cards...</Text>
          </Animated.View>
        )}

        {gameState === "playing" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.actionsContainer}
          >
            <TouchableOpacity
              onPress={hit}
              style={styles.actionButtonContainer}
            >
              <LinearGradient
                colors={["#4CAF50", "#2E7D32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Hit</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={stand}
              style={styles.actionButtonContainer}
            >
              <LinearGradient
                colors={["#F44336", "#C62828"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Stand</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {gameState === "dealerTurn" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.loadingContainer}
          >
            <Text style={styles.loadingText}>Dealer's turn...</Text>
          </Animated.View>
        )}

        {(gameState === "won" ||
          gameState === "lost" ||
          gameState === "tie" ||
          gameState === "busted") && (
          <Animated.View
            entering={SlideInDown.duration(500).springify()}
            exiting={SlideOutDown.duration(500)}
            style={styles.resultContainer}
          >
            <Text
              style={[
                styles.resultText,
                gameState === "won"
                  ? styles.wonResultText
                  : gameState === "lost" || gameState === "busted"
                  ? styles.lostResultText
                  : styles.tieResultText,
              ]}
            >
              {gameState === "won"
                ? "You Won!"
                : gameState === "lost"
                ? "You Lost!"
                : gameState === "busted"
                ? "Busted!"
                : "It's a Tie!"}
            </Text>
            <Text style={styles.resultDetails}>
              Your score: {playerScore} - Dealer's score: {dealerScore}
            </Text>

            {gameState === "won" && (
              <Text style={styles.amountWon}>
                +${(Number.parseFloat(betAmount) * 2).toFixed(2)}
              </Text>
            )}
            {(gameState === "lost" || gameState === "busted") && (
              <Text style={styles.amountLost}>
                -₦{Number.parseFloat(betAmount).toFixed(2)}
              </Text>
            )}
            {gameState === "tie" && (
              <Text style={styles.amountTie}>
                ₦{Number.parseFloat(betAmount).toFixed(2)} returned
              </Text>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={resetGame}
                style={styles.playAgainButtonContainer}
              >
                <LinearGradient
                  colors={["#6a11cb", "#2575fc"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.playAgainButton}
                >
                  <Text style={styles.playAgainButtonText}>Play Again</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[
                  styles.playAgainButtonContainer,
                  styles.secondaryButtonContainer,
                ]}
              >
                <View style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Exit Game</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>

      {gameState === "won" && (
        <View style={styles.confettiContainer}>
          <LottieView
            ref={confettiRef}
            source={require("../../assets/animations/confetti.json")}
            style={styles.confetti}
            loop={false}
            autoPlay={false}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const PlayingCard = ({
  value = "?",
  symbol = "?",
  color = "#3F2B96",
  hidden = false,
  width = 80,
  height = 120,
}) => (
  <Svg width={width} height={height} viewBox="0 0 80 120">
    {hidden ? (
      // Card back
      <G>
        <Rect
          x="0"
          y="0"
          width="80"
          height="120"
          rx="10"
          fill="#3F2B96"
          stroke="#CCCCCC"
          strokeWidth="2"
        />
        <Path
          d="M10,10 L70,110 M70,10 L10,110"
          stroke="#A8C0FF"
          strokeWidth="2"
        />
        <Rect x="20" y="40" width="40" height="40" rx="5" fill="#A8C0FF" />
      </G>
    ) : (
      // Card front
      <G>
        <Rect
          x="0"
          y="0"
          width="80"
          height="120"
          rx="10"
          fill="#FFFFFF"
          stroke="#CCCCCC"
          strokeWidth="2"
        />
        <SvgText x="8" y="20" fontSize="16" fontWeight="bold" fill={color}>
          {value}
        </SvgText>
        <SvgText x="8" y="40" fontSize="20" fill={color}>
          {symbol}
        </SvgText>
        <SvgText
          x="72"
          y="112"
          fontSize="16"
          fontWeight="bold"
          fill={color}
          textAnchor="end"
        >
          {value}
        </SvgText>
        <SvgText x="72" y="92" fontSize="20" fill={color} textAnchor="end">
          {symbol}
        </SvgText>
        <SvgText x="40" y="70" fontSize="32" fill={color} textAnchor="middle">
          {symbol}
        </SvgText>
      </G>
    )}
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  balanceContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  balanceText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  gameContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  tableContainer: {
    width: "100%",
    flex: 1,
    maxHeight: 400,
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
    justifyContent: "space-between",
  },
  dealerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  playerSection: {
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 120,
  },
  cardWrapper: {
    width: 80,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  gameDescription: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    textAlign: "center",
    marginBottom: 24,
  },
  betLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 24,
  },
  dollarSign: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#9e9e9e",
    marginRight: 8,
  },
  betInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  errorText: {
    color: "#ff5252",
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
    alignSelf: "flex-start",
  },
  dealButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  dealButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dealButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  actionButtonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  resultContainer: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
  },
  resultText: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    marginBottom: 8,
  },
  wonResultText: {
    color: "#4CAF50",
  },
  lostResultText: {
    color: "#F44336",
  },
  tieResultText: {
    color: "#FFC107",
  },
  resultDetails: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginBottom: 16,
  },
  amountWon: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#4CAF50",
    marginBottom: 24,
  },
  amountLost: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#F44336",
    marginBottom: 24,
  },
  amountTie: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#FFC107",
    marginBottom: 24,
  },
  actionButtons: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  playAgainButtonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 4,
  },
  playAgainButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  playAgainButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  secondaryButtonContainer: {
    backgroundColor: "transparent",
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  confetti: {
    width: "100%",
    height: "100%",
  },
});
