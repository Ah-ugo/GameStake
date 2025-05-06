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
import { Circle, G, Path, Rect, Svg } from "react-native-svg";

const { width } = Dimensions.get("window");
const CHOICES = ["rock", "paper", "scissors"];

export default function RockPaperScissorsScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost, tie
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);

  const playerScale = useSharedValue(1);
  const computerScale = useSharedValue(1);

  useEffect(() => {
    fetchBalance();
  }, []);

  const playerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playerScale.value }],
    };
  });

  const computerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: computerScale.value }],
    };
  });

  const animateChoice = (isPlayer) => {
    const scaleValue = isPlayer ? playerScale : computerScale;
    scaleValue.value = withSequence(
      withTiming(1.2, { duration: 200, easing: Easing.bounce }),
      withTiming(1, { duration: 200 })
    );
  };

  const handlePlay = async () => {
    if (!playerChoice) {
      setError("Please select rock, paper, or scissors");
      return;
    }

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
    setGameState("playing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.post("/games/play/rock-paper-scissors", {
        bet_amount: amount,
        choice: playerChoice,
      });

      const { result: gameResult } = response.data;

      // Simulate network delay
      setTimeout(() => {
        setComputerChoice(gameResult.computer_choice);
        animateChoice(false);

        setTimeout(() => {
          setResult({
            playerChoice,
            computerChoice: gameResult.computer_choice,
            result:
              gameResult.won === true
                ? "won"
                : gameResult.won === false
                ? "lost"
                : "tie",
            amount:
              gameResult.won === true
                ? amount * 2
                : gameResult.won === null
                ? amount
                : 0,
          });

          if (gameResult.won === true) {
            setGameState("won");
            confettiRef.current?.play();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`You won ₦${(amount * 2).toFixed(2)}!`, "success");
          } else if (gameResult.won === false) {
            setGameState("lost");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast(`You lost ₦${amount.toFixed(2)}`, "error");
          } else {
            setGameState("tie");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast(`It's a tie! Your bet was returned.`, "info");
          }

          fetchBalance(); // Refresh balance after game
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
    setPlayerChoice(null);
    setComputerChoice(null);
    setGameState("idle");
    setResult(null);
    setError("");
  };

  const getChoiceIcon = (choice) => {
    switch (choice) {
      case "rock":
        return <RockSvg />;
      case "paper":
        return <PaperSvg />;
      case "scissors":
        return <ScissorsSvg />;
      default:
        return <QuestionMarkSvg />;
    }
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
        <Text style={styles.title}>Rock Paper Scissors</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.playersContainer}>
          <View style={styles.playerSide}>
            <Text style={styles.playerLabel}>You</Text>
            <Animated.View
              style={[styles.choiceContainer, playerAnimatedStyle]}
            >
              {getChoiceIcon(playerChoice || "question")}
            </Animated.View>
          </View>

          <View style={styles.versus}>
            <Text style={styles.versusText}>VS</Text>
          </View>

          <View style={styles.computerSide}>
            <Text style={styles.playerLabel}>Computer</Text>
            <Animated.View
              style={[styles.choiceContainer, computerAnimatedStyle]}
            >
              {getChoiceIcon(computerChoice || "question")}
            </Animated.View>
          </View>
        </View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.controlsContainer}
          >
            <Text style={styles.choiceLabel}>Make your choice:</Text>
            <View style={styles.choicesRow}>
              <TouchableOpacity
                onPress={() => {
                  setPlayerChoice("rock");
                  animateChoice(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.choiceButton,
                  playerChoice === "rock" && styles.selectedChoice,
                ]}
              >
                <RockSvg width={40} height={40} />
                <Text
                  style={[
                    styles.choiceButtonText,
                    playerChoice === "rock" && styles.selectedChoiceText,
                  ]}
                >
                  Rock
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setPlayerChoice("paper");
                  animateChoice(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.choiceButton,
                  playerChoice === "paper" && styles.selectedChoice,
                ]}
              >
                <PaperSvg width={40} height={40} />
                <Text
                  style={[
                    styles.choiceButtonText,
                    playerChoice === "paper" && styles.selectedChoiceText,
                  ]}
                >
                  Paper
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setPlayerChoice("scissors");
                  animateChoice(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.choiceButton,
                  playerChoice === "scissors" && styles.selectedChoice,
                ]}
              >
                <ScissorsSvg width={40} height={40} />
                <Text
                  style={[
                    styles.choiceButtonText,
                    playerChoice === "scissors" && styles.selectedChoiceText,
                  ]}
                >
                  Scissors
                </Text>
              </TouchableOpacity>
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
              onPress={handlePlay}
              style={styles.playButtonContainer}
            >
              <LinearGradient
                colors={["#F02FC2", "#6094EA"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playButton}
              >
                <Text style={styles.playButtonText}>Play</Text>
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
            <Text style={styles.loadingText}>Computer is choosing...</Text>
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
              You chose {playerChoice.toUpperCase()} - Computer chose{" "}
              {computerChoice.toUpperCase()}
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

const RockSvg = ({ width = 80, height = 80 }) => (
  <Svg width={width} height={height} viewBox="0 0 100 100">
    <G>
      <Circle cx="50" cy="50" r="45" fill="#7367F0" />
      <Circle cx="50" cy="50" r="35" fill="#6A5AE0" />
      <Circle cx="35" cy="40" r="5" fill="#8F7FF7" opacity="0.6" />
      <Path
        d="M30,45 Q40,30 50,45 Q60,30 70,45 Q75,60 50,70 Q25,60 30,45 Z"
        fill="#5D4ED6"
        stroke="#4A3AC8"
        strokeWidth="2"
      />
    </G>
  </Svg>
);

const PaperSvg = ({ width = 80, height = 80 }) => (
  <Svg width={width} height={height} viewBox="0 0 100 100">
    <G>
      <Rect x="25" y="20" width="50" height="60" rx="5" fill="#65FDF0" />
      <Rect x="30" y="30" width="40" height="5" rx="2" fill="#1D6FA3" />
      <Rect x="30" y="40" width="40" height="5" rx="2" fill="#1D6FA3" />
      <Rect x="30" y="50" width="40" height="5" rx="2" fill="#1D6FA3" />
      <Rect x="30" y="60" width="25" height="5" rx="2" fill="#1D6FA3" />
    </G>
  </Svg>
);

const ScissorsSvg = ({ width = 80, height = 80 }) => (
  <Svg width={width} height={height} viewBox="0 0 100 100">
    <G>
      <Circle cx="35" cy="40" r="15" fill="#F02FC2" />
      <Circle cx="65" cy="40" r="15" fill="#F02FC2" />
      <Rect x="30" y="40" width="40" height="10" fill="#F02FC2" />
      <Path
        d="M35,55 L45,75 L25,75 Z"
        fill="#6094EA"
        stroke="#4A76D6"
        strokeWidth="2"
      />
      <Path
        d="M65,55 L75,75 L55,75 Z"
        fill="#6094EA"
        stroke="#4A76D6"
        strokeWidth="2"
      />
    </G>
  </Svg>
);

const QuestionMarkSvg = ({ width = 80, height = 80 }) => (
  <Svg width={width} height={height} viewBox="0 0 100 100">
    <G>
      <Circle cx="50" cy="50" r="45" fill="#2a2a2a" />
      <Path
        d="M50,25 Q65,25 65,40 Q65,50 55,55 Q50,57 50,65 L50,70"
        stroke="#9e9e9e"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="50" cy="80" r="4" fill="#9e9e9e" />
    </G>
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
  playersContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
  },
  playerSide: {
    alignItems: "center",
  },
  computerSide: {
    alignItems: "center",
  },
  playerLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 12,
  },
  choiceContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1e1e1e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2a2a2a",
  },
  versus: {
    paddingHorizontal: 16,
  },
  versusText: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#F02FC2",
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  choiceLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  choicesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  choiceButton: {
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 12,
    width: width / 3.5,
  },
  selectedChoice: {
    backgroundColor: "rgba(240, 47, 194, 0.2)",
    borderWidth: 1,
    borderColor: "#F02FC2",
  },
  choiceButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#9e9e9e",
    marginTop: 8,
  },
  selectedChoiceText: {
    color: "#F02FC2",
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
  playButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  playButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonText: {
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
