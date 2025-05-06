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
import { Circle, G, Svg } from "react-native-svg";

const { width } = Dimensions.get("window");

export default function DiceRollScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [diceNumber, setDiceNumber] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);

  const diceRotate = useSharedValue(0);
  const diceScale = useSharedValue(1);

  useEffect(() => {
    fetchBalance();
  }, []);

  const diceAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotateZ: `${diceRotate.value * 360}deg` },
        { scale: diceScale.value },
      ],
    };
  });

  const animateDice = () => {
    diceRotate.value = 0;
    diceScale.value = 1;

    diceRotate.value = withSequence(
      withTiming(3, { duration: 1000, easing: Easing.linear }),
      withTiming(3.2, { duration: 200, easing: Easing.linear })
    );

    diceScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(0.8, { duration: 200 }),
      withTiming(1.2, { duration: 200 }),
      withTiming(0.9, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  };

  const handleRoll = async () => {
    if (selectedNumber === null) {
      setError("Please select a number");
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
      const response = await api.post("/games/play/dice-roll", {
        bet_amount: amount,
        choice: selectedNumber.toString(),
      });

      const { result: gameResult } = response.data;

      animateDice();

      setTimeout(() => {
        setDiceNumber(gameResult.dice);

        setTimeout(() => {
          setResult({
            playerChoice: selectedNumber,
            diceResult: gameResult.dice,
            won: gameResult.won,
            amount: gameResult.won ? amount * 2 : 0,
          });

          setGameState(gameResult.won ? "won" : "lost");
          fetchBalance(); // Refresh balance after game

          if (gameResult.won) {
            confettiRef.current?.play();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`You won ₦${(amount * 2).toFixed(2)}!`, "success");
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast(`You lost ₦${amount.toFixed(2)}`, "error");
          }
        }, 500);
      }, 1200);
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
    setSelectedNumber(null);
    setDiceNumber(null);
    setGameState("idle");
    setResult(null);
    setError("");
  };

  return (
    <SafeAreaView style={[styles.container]} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Dice Roll</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <Animated.View style={[styles.diceContainer, diceAnimatedStyle]}>
          <DiceSvg number={diceNumber || 1} />
        </Animated.View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.controlsContainer}
          >
            <Text style={styles.choiceLabel}>Select your number:</Text>
            <View style={styles.numbersRow}>
              {[1, 2, 3, 4, 5, 6].map((number) => (
                <TouchableOpacity
                  key={number}
                  onPress={() => {
                    setSelectedNumber(number);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.numberButton,
                    selectedNumber === number && styles.selectedNumber,
                  ]}
                >
                  <Text
                    style={[
                      styles.numberButtonText,
                      selectedNumber === number && styles.selectedNumberText,
                    ]}
                  >
                    {number}
                  </Text>
                </TouchableOpacity>
              ))}
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
              onPress={handleRoll}
              style={[styles.rollButtonContainer]}
            >
              <LinearGradient
                colors={["#52E5E7", "#130CB7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.rollButton}
              >
                <Text style={styles.rollButtonText}>Roll Dice</Text>
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
            <Text style={styles.loadingText}>Rolling dice...</Text>
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
              You chose {selectedNumber} - Dice rolled {diceNumber}
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

const DiceSvg = ({ number = 1, width = 150, height = 150 }) => {
  const getDots = () => {
    switch (number) {
      case 1:
        return <Circle cx="50" cy="50" r="8" fill="#130CB7" />;
      case 2:
        return (
          <G>
            <Circle cx="25" cy="25" r="8" fill="#130CB7" />
            <Circle cx="75" cy="75" r="8" fill="#130CB7" />
          </G>
        );
      case 3:
        return (
          <G>
            <Circle cx="25" cy="25" r="8" fill="#130CB7" />
            <Circle cx="50" cy="50" r="8" fill="#130CB7" />
            <Circle cx="75" cy="75" r="8" fill="#130CB7" />
          </G>
        );
      case 4:
        return (
          <G>
            <Circle cx="25" cy="25" r="8" fill="#130CB7" />
            <Circle cx="25" cy="75" r="8" fill="#130CB7" />
            <Circle cx="75" cy="25" r="8" fill="#130CB7" />
            <Circle cx="75" cy="75" r="8" fill="#130CB7" />
          </G>
        );
      case 5:
        return (
          <G>
            <Circle cx="25" cy="25" r="8" fill="#130CB7" />
            <Circle cx="25" cy="75" r="8" fill="#130CB7" />
            <Circle cx="50" cy="50" r="8" fill="#130CB7" />
            <Circle cx="75" cy="25" r="8" fill="#130CB7" />
            <Circle cx="75" cy="75" r="8" fill="#130CB7" />
          </G>
        );
      case 6:
        return (
          <G>
            <Circle cx="25" cy="25" r="8" fill="#130CB7" />
            <Circle cx="25" cy="50" r="8" fill="#130CB7" />
            <Circle cx="25" cy="75" r="8" fill="#130CB7" />
            <Circle cx="75" cy="25" r="8" fill="#130CB7" />
            <Circle cx="75" cy="50" r="8" fill="#130CB7" />
            <Circle cx="75" cy="75" r="8" fill="#130CB7" />
          </G>
        );
      default:
        return null;
    }
  };

  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      <G>
        <Circle cx="50" cy="50" r="45" fill="#52E5E7" />
        <Circle cx="50" cy="50" r="40" fill="#FFFFFF" />
        {getDots()}
      </G>
    </Svg>
  );
};

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
  diceContainer: {
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
  choiceLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  numbersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  numberButton: {
    width: width / 3.5,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    marginBottom: 10,
  },
  selectedNumber: {
    backgroundColor: "rgba(82, 229, 231, 0.2)",
    borderWidth: 1,
    borderColor: "#52E5E7",
  },
  numberButtonText: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#9e9e9e",
  },
  selectedNumberText: {
    color: "#52E5E7",
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
    marginBottom: 10,
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
  rollButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  rollButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rollButtonText: {
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
