"use client";

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
import { Circle, Svg, Text as SvgText } from "react-native-svg";

const { width } = Dimensions.get("window");
const Lottie = Platform.select({
  native: () => require("lottie-react-native").default,
  default: () => require("@lottiefiles/dotlottie-react").DotLottieReact,
})();

export default function NumberGuessScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [guessedNumber, setGuessedNumber] = useState("");
  const [actualNumber, setActualNumber] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);

  const numberScale = useSharedValue(1);
  const numberRotate = useSharedValue(0);

  useEffect(() => {
    fetchBalance();
  }, []);

  const numberAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: numberScale.value },
        { rotateY: `${numberRotate.value * 360}deg` },
      ],
    };
  });

  const animateNumber = () => {
    numberScale.value = withSequence(
      withTiming(1.5, { duration: 300 }),
      withTiming(1, { duration: 300 })
    );

    numberRotate.value = withSequence(
      withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(0, { duration: 0 })
    );
  };

  const handleGuess = async () => {
    const guess = Number.parseInt(guessedNumber);
    if (isNaN(guess) || guess < 1 || guess > 10) {
      setError("Please enter a number between 1 and 10");
      return;
    }

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
      const response = await api.post("/games/play/number-guess", {
        bet_amount: amount,
        choice: guessedNumber,
      });

      const { result: gameResult } = response.data;

      setTimeout(() => {
        setActualNumber(gameResult.number);
        animateNumber();

        setTimeout(() => {
          setResult({
            guessedNumber: guess,
            actualNumber: gameResult.number,
            won: gameResult.won,
            amount: gameResult.won ? amount * 5 : 0, // Higher payout for correct guess
          });

          setGameState(gameResult.won ? "won" : "lost");
          fetchBalance(); // Refresh balance after game

          if (gameResult.won) {
            confettiRef.current?.play();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`You won ₦${(amount * 5).toFixed(2)}!`, "success");
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast(`You lost ₦${amount.toFixed(2)}`, "error");
          }
        }, 1000);
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
    setGuessedNumber("");
    setActualNumber(null);
    setGameState("idle");
    setResult(null);
    setError("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Number Guess</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <Animated.View style={[styles.numberContainer, numberAnimatedStyle]}>
          <NumberCircle number={actualNumber} />
        </Animated.View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.controlsContainer}
          >
            <Text style={styles.gameDescription}>
              Guess a number between 1 and 10. If you guess correctly, you win
              5x your bet!
            </Text>

            <Text style={styles.guessLabel}>Enter your guess:</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.guessInput}
                keyboardType="numeric"
                value={guessedNumber}
                onChangeText={setGuessedNumber}
                placeholder="1-10"
                placeholderTextColor="#9e9e9e"
                maxLength={2}
              />
            </View>

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
              onPress={handleGuess}
              style={styles.guessButtonContainer}
            >
              <LinearGradient
                colors={["#F6D242", "#FF52E5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.guessButton}
              >
                <Text style={styles.guessButtonText}>Submit Guess</Text>
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
            <Text style={styles.loadingText}>Generating number...</Text>
          </Animated.View>
        )}

        {(gameState === "won" || gameState === "lost") && (
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
                  : styles.lostResultText,
              ]}
            >
              {gameState === "won" ? "You Won!" : "You Lost!"}
            </Text>
            <Text style={styles.resultDetails}>
              You guessed: {guessedNumber} - Actual number: {actualNumber}
            </Text>
            {gameState === "won" && (
              <Text style={styles.amountWon}>
                +₦{(Number.parseFloat(betAmount) * 5).toFixed(2)}
              </Text>
            )}
            {gameState === "lost" && (
              <Text style={styles.amountLost}>
                -₦{Number.parseFloat(betAmount).toFixed(2)}
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

const NumberCircle = ({ number = null, width = 150, height = 150 }) => (
  <Svg width={width} height={height} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="45" fill="#F6D242" />
    <Circle cx="50" cy="50" r="40" fill="#FF52E5" />
    {number !== null && (
      <SvgText
        x="50"
        y="58"
        fontSize="32"
        fontWeight="bold"
        textAnchor="middle"
        fill="#FFFFFF"
      >
        {number}
      </SvgText>
    )}
    {number === null && (
      <SvgText
        x="50"
        y="58"
        fontSize="32"
        fontWeight="bold"
        textAnchor="middle"
        fill="#FFFFFF"
      >
        ?
      </SvgText>
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
  numberContainer: {
    width: 150,
    height: 150,
    marginVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
  },
  gameDescription: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    textAlign: "center",
    marginBottom: 24,
  },
  guessLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  betLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 16,
  },
  guessInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
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
  guessButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  guessButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  guessButtonText: {
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
