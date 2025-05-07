import { useToast } from "@/context/toast-context";
import { useWallet } from "@/context/wallet-context";
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
  Platform,
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
import { Rect, Svg, Text as SvgText } from "react-native-svg";

const { width } = Dimensions.get("window");

const Lottie = Platform.select({
  native: () => require("lottie-react-native").default,
  default: () => require("@lottiefiles/dotlottie-react").DotLottieReact,
})();

export default function CardDrawScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [playerCard, setPlayerCard] = useState(null);
  const [dealerCard, setDealerCard] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost, tie
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);

  const playerCardScale = useSharedValue(1);
  const dealerCardScale = useSharedValue(1);
  const playerCardRotate = useSharedValue(0);
  const dealerCardRotate = useSharedValue(0);

  useEffect(() => {
    fetchBalance();
  }, []);

  const playerCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: playerCardScale.value },
        { rotateY: `${playerCardRotate.value * 180}deg` },
      ],
    };
  });

  const dealerCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: dealerCardScale.value },
        { rotateY: `${dealerCardRotate.value * 180}deg` },
      ],
    };
  });

  const animateCards = () => {
    // Player card animation
    playerCardScale.value = withSequence(
      withTiming(1.2, { duration: 300 }),
      withTiming(1, { duration: 300 })
    );

    playerCardRotate.value = withSequence(
      withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(0, { duration: 0 })
    );

    // Dealer card animation (delayed)
    setTimeout(() => {
      dealerCardScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 })
      );

      dealerCardRotate.value = withSequence(
        withTiming(1, {
          duration: 600,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        withTiming(0, { duration: 0 })
      );
    }, 800);
  };

  const handleDraw = async () => {
    const amount = Number.parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      setError("Please enter a valid bet amount greater than or equal to ₦10");
      return;
    }

    if (amount > balance) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setGameState("playing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.post("/games/play/card-draw", {
        bet_amount: amount,
      });

      const { result: gameResult } = response.data;

      setTimeout(() => {
        setPlayerCard(gameResult.player_card);
        setDealerCard(gameResult.dealer_card);
        animateCards();

        setTimeout(() => {
          const gameOutcome =
            gameResult.won === true
              ? "won"
              : gameResult.won === false
              ? "lost"
              : "tie";

          setResult({
            playerCard: gameResult.player_card,
            dealerCard: gameResult.dealer_card,
            outcome: gameOutcome,
            amount:
              gameOutcome === "won"
                ? amount * 2
                : gameOutcome === "tie"
                ? amount
                : 0,
          });

          setGameState(gameOutcome);
          fetchBalance(); // Refresh balance after game

          if (gameOutcome === "won") {
            confettiRef.current?.play();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`You won ₦${(amount * 2).toFixed(2)}!`, "success");
          } else if (gameOutcome === "lost") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast(`You lost ₦${amount.toFixed(2)}`, "error");
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast(`It's a tie! Your bet was returned.`, "info");
          }
        }, 1500);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
      setGameState("idle");
      showToast("Failed to place bet", "error");
    }
  };

  const resetGame = () => {
    setBetAmount("");
    setPlayerCard(null);
    setDealerCard(null);
    setGameState("idle");
    setResult(null);
    setError("");
  };

  const getCardColor = (card) => {
    if (!card) return "#7367F0";
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
      style={[styles.container, { marginBottom: 50 }]}
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
        <Text style={styles.title}>Card Draw</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.cardsContainer}>
          <View style={styles.cardSide}>
            <Text style={styles.cardLabel}>Your Card</Text>
            <Animated.View style={[styles.cardWrapper, playerCardStyle]}>
              <PlayingCard
                value={getCardValue(playerCard)}
                symbol={getCardSymbol(playerCard)}
                color={getCardColor(playerCard)}
              />
            </Animated.View>
          </View>

          <View style={styles.versus}>
            <Text style={styles.versusText}>VS</Text>
          </View>

          <View style={styles.cardSide}>
            <Text style={styles.cardLabel}>Dealer's Card</Text>
            <Animated.View style={[styles.cardWrapper, dealerCardStyle]}>
              <PlayingCard
                value={getCardValue(dealerCard)}
                symbol={getCardSymbol(dealerCard)}
                color={getCardColor(dealerCard)}
              />
            </Animated.View>
          </View>
        </View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.controlsContainer}
          >
            <Text style={styles.gameDescription}>
              Draw a card and beat the dealer's card to win. Higher card wins!
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
              onPress={handleDraw}
              style={styles.drawButtonContainer}
            >
              <LinearGradient
                colors={["#7367F0", "#CE9FFC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.drawButton}
              >
                <Text style={styles.drawButtonText}>Draw Cards</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {gameState === "playing" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.loadingContainer}
          >
            <Text style={styles.loadingText}>Drawing cards...</Text>
          </Animated.View>
        )}

        {(gameState === "won" ||
          gameState === "lost" ||
          gameState === "tie") && (
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
                  : gameState === "lost"
                  ? styles.lostResultText
                  : styles.tieResultText,
              ]}
            >
              {gameState === "won"
                ? "You Won!"
                : gameState === "lost"
                ? "You Lost!"
                : "It's a Tie!"}
            </Text>
            <Text style={styles.resultDetails}>
              Your card: {playerCard} - Dealer's card: {dealerCard}
            </Text>
            {gameState === "won" && (
              <Text style={styles.amountWon}>
                +₦{(Number.parseFloat(betAmount) * 2).toFixed(2)}
              </Text>
            )}
            {gameState === "lost" && (
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
                style={styles.actionButtonContainer}
              >
                <LinearGradient
                  colors={["#6a11cb", "#2575fc"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Play Again</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[
                  styles.actionButtonContainer,
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
          {Platform.OS === "web" ? (
            <Lottie
              ref={confettiRef}
              src={require("../../assets/animations/confetti.json")}
              style={styles.confetti}
              loop={false}
              autoplay={false}
            />
          ) : (
            <LottieView
              ref={confettiRef}
              source={require("../../assets/animations/confetti.json")}
              style={styles.confetti}
              loop={false}
              autoPlay={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const PlayingCard = ({
  value = "?",
  symbol = "?",
  color = "#7367F0",
  width = 120,
  height = 180,
}) => (
  <Svg width={width} height={height} viewBox="0 0 120 180">
    <Rect
      x="0"
      y="0"
      width="120"
      height="180"
      rx="10"
      fill="#FFFFFF"
      stroke="#CCCCCC"
      strokeWidth="2"
    />
    <SvgText x="10" y="30" fontSize="24" fontWeight="bold" fill={color}>
      {value}
    </SvgText>
    <SvgText x="10" y="60" fontSize="32" fill={color}>
      {symbol}
    </SvgText>
    <SvgText
      x="110"
      y="170"
      fontSize="24"
      fontWeight="bold"
      fill={color}
      textAnchor="end"
    >
      {value}
    </SvgText>
    <SvgText x="110" y="140" fontSize="32" fill={color} textAnchor="end">
      {symbol}
    </SvgText>
    <SvgText x="60" y="100" fontSize="48" fill={color} textAnchor="middle">
      {symbol}
    </SvgText>
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
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  cardSide: {
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 12,
  },
  cardWrapper: {
    width: 120,
    height: 180,
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
  versus: {
    paddingHorizontal: 16,
  },
  versusText: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#7367F0",
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
  drawButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  drawButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  drawButtonText: {
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
  actionButtonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 4,
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
