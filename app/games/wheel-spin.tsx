"use client";

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
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, G, Path, Svg, Text as SvgText } from "react-native-svg";
import { useToast } from "../../context/toast-context";
import { useWallet } from "../../context/wallet-context";
import { api } from "../../lib/api";

const { width } = Dimensions.get("window");

// Wheel segments with multipliers
const WHEEL_SEGMENTS = [
  { value: 0, color: "#F44336", multiplier: 0 }, // Red - lose
  { value: 1, color: "#4CAF50", multiplier: 1.5 }, // Green - 1.5x
  { value: 2, color: "#2196F3", multiplier: 2 }, // Blue - 2x
  { value: 3, color: "#FF9800", multiplier: 3 }, // Orange - 3x
  { value: 4, color: "#9C27B0", multiplier: 5 }, // Purple - 5x
  { value: 5, color: "#F44336", multiplier: 0 }, // Red - lose
  { value: 6, color: "#4CAF50", multiplier: 1.5 }, // Green - 1.5x
  { value: 7, color: "#2196F3", multiplier: 2 }, // Blue - 2x
];

export default function WheelSpinScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);

  const wheelRotation = useSharedValue(0);
  const indicatorScale = useSharedValue(1);

  useEffect(() => {
    fetchBalance();
  }, []);

  const wheelStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${wheelRotation.value}deg` }],
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: indicatorScale.value }],
    };
  });

  const animateWheel = (finalSegment) => {
    // Calculate the exact angle needed to land on the center of the segment
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const segmentIndex = WHEEL_SEGMENTS.findIndex(
      (segment) => segment.value === finalSegment
    );

    // Calculate the angle to the center of the segment
    // We need to add 360 degrees * number of spins (5) for a good spinning effect
    // Then add the specific angle to land on the segment
    // We need to make the arrow point exactly at the segment
    // We need to adjust the rotation to ensure the wheel stops at the correct segment
    const finalRotation = 360 * 5 - segmentIndex * segmentAngle;

    // Animate the wheel with a spring effect
    wheelRotation.value = withTiming(finalRotation, {
      duration: 5000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Animate the indicator for visual feedback
    indicatorScale.value = withTiming(1.3, { duration: 300 });
    indicatorScale.value = withDelay(300, withTiming(1, { duration: 300 }));
  };

  const handleSpin = async () => {
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
      const response = await api.post("/games/play/wheel-spin", {
        bet_amount: amount,
      });

      const { result: gameResult } = response.data;

      // Animate wheel to land on the correct segment
      animateWheel(gameResult.segment);

      // Wait for animation to complete
      setTimeout(() => {
        const won = gameResult.multiplier > 0;
        const winAmount = amount * gameResult.multiplier;

        setResult({
          segment: gameResult.segment,
          multiplier: gameResult.multiplier,
          won,
          amount: won ? winAmount : 0,
        });

        setGameState(won ? "won" : "lost");
        fetchBalance(); // Refresh balance after game

        if (won) {
          confettiRef.current?.play();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast(`You won ₦${winAmount.toFixed(2)}!`, "success");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast(`You lost ₦${amount.toFixed(2)}`, "error");
        }
      }, 5500);
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
    setGameState("idle");
    setResult(null);
    setError("");
    wheelRotation.value = 0;
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
        <Text style={styles.title}>Wheel Spin</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.wheelContainer}>
          <Animated.View style={[styles.wheel, wheelStyle]}>
            <WheelSvg />
          </Animated.View>
          <Animated.View style={[styles.indicator, indicatorStyle]}>
            <Ionicons name="caret-down" size={40} color="#ffffff" />
          </Animated.View>
        </View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.controlsContainer}
          >
            <Text style={styles.gameDescription}>
              Spin the wheel and win up to 5x your bet! Land on a colored
              segment to win the corresponding multiplier.
            </Text>

            <View style={styles.multiplierContainer}>
              <View style={styles.multiplierItem}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: "#4CAF50" },
                  ]}
                />
                <Text style={styles.multiplierText}>1.5x</Text>
              </View>
              <View style={styles.multiplierItem}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: "#2196F3" },
                  ]}
                />
                <Text style={styles.multiplierText}>2x</Text>
              </View>
              <View style={styles.multiplierItem}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: "#FF9800" },
                  ]}
                />
                <Text style={styles.multiplierText}>3x</Text>
              </View>
              <View style={styles.multiplierItem}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: "#9C27B0" },
                  ]}
                />
                <Text style={styles.multiplierText}>5x</Text>
              </View>
              <View style={styles.multiplierItem}>
                <View
                  style={[
                    styles.colorIndicator,
                    { backgroundColor: "#F44336" },
                  ]}
                />
                <Text style={styles.multiplierText}>0x</Text>
              </View>
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
              onPress={handleSpin}
              style={styles.spinButtonContainer}
            >
              <LinearGradient
                colors={["#00C9FF", "#92FE9D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.spinButton}
              >
                <Text style={styles.spinButtonText}>Spin Wheel</Text>
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
            <Text style={styles.loadingText}>Spinning wheel...</Text>
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
              Multiplier: {result?.multiplier}x
            </Text>
            {gameState === "won" && (
              <Text style={styles.amountWon}>
                +₦{result?.amount.toFixed(2)}
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

// Fix the WheelSvg component to ensure the segments are correctly positioned
const WheelSvg = ({ width = 280, height = 280 }) => {
  const segmentAngle = 360 / WHEEL_SEGMENTS.length;

  return (
    <Svg width={width} height={height} viewBox="0 0 280 280">
      <Circle cx="140" cy="140" r="140" fill="#333333" />
      <Circle cx="140" cy="140" r="135" fill="#222222" />

      {WHEEL_SEGMENTS.map((segment, index) => {
        const startAngle = index * segmentAngle;
        const endAngle = (index + 1) * segmentAngle;

        // Calculate the path for the segment
        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((endAngle - 90) * Math.PI) / 180;

        const x1 = 140 + 130 * Math.cos(startRad);
        const y1 = 140 + 130 * Math.sin(startRad);
        const x2 = 140 + 130 * Math.cos(endRad);
        const y2 = 140 + 130 * Math.sin(endRad);

        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

        const pathData = `M 140 140 L ${x1} ${y1} A 130 130 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

        // Calculate position for the text
        const textRad = ((startAngle + segmentAngle / 2 - 90) * Math.PI) / 180;
        const textX = 140 + 80 * Math.cos(textRad);
        const textY = 140 + 80 * Math.sin(textRad);

        return (
          <G key={index}>
            <Path d={pathData} fill={segment.color} />
            <SvgText
              x={textX}
              y={textY}
              fontSize="16"
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {segment.multiplier}x
            </SvgText>
          </G>
        );
      })}

      <Circle cx="140" cy="140" r="20" fill="#FFFFFF" />
      <Circle cx="140" cy="140" r="15" fill="#333333" />
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
  wheelContainer: {
    marginVertical: 20,
    alignItems: "center",
  },
  wheel: {
    width: 280,
    height: 280,
  },
  indicator: {
    position: "absolute",
    top: -30,
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  gameDescription: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    textAlign: "center",
    marginBottom: 16,
  },
  multiplierContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
  },
  multiplierItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    marginBottom: 8,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  multiplierText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
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
  spinButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  spinButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  spinButtonText: {
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
