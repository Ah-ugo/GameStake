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
  ScrollView,
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
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, G, Line, Path, Svg, Text as SvgText } from "react-native-svg";

const { width } = Dimensions.get("window");
const Lottie = Platform.select({
  native: () => require("lottie-react-native").default,
  default: () => require("@lottiefiles/dotlottie-react").DotLottieReact,
})();

// Roulette numbers and colors
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const getNumberColor = (number: any) => {
  if (number === 0) return "#00C853"; // Green for 0
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  return redNumbers.includes(number) ? "#F44336" : "#212121"; // Red or Black
};

const RouletteSvg = ({
  width = 280,
  height = 280,
  indicatorVisible = false,
}) => {
  const segmentAngle = 360 / ROULETTE_NUMBERS.length;

  return (
    <Svg width={width} height={height} viewBox="0 0 280 280">
      <Circle cx="140" cy="140" r="140" fill="#333333" />
      <Circle cx="140" cy="140" r="135" fill="#222222" />

      {ROULETTE_NUMBERS.map((number, index) => {
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
        const textX = 140 + 100 * Math.cos(textRad);
        const textY = 140 + 100 * Math.sin(textRad);

        return (
          <G key={index}>
            <Path d={pathData} fill={getNumberColor(number)} />
            <SvgText
              x={textX}
              y={textY}
              fontSize="12"
              fontWeight="bold"
              fill="#FFFFFF"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {number}
            </SvgText>
          </G>
        );
      })}

      {/* Indicator at the top */}
      {indicatorVisible && (
        <G>
          <Line
            x1="140"
            y1="0"
            x2="140"
            y2="20"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <Circle cx="140" cy="10" r="5" fill="#FFFFFF" />
        </G>
      )}

      <Circle cx="140" cy="140" r="20" fill="#FFFFFF" />
      <Circle cx="140" cy="140" r="15" fill="#333333" />
    </Svg>
  );
};

export default function RouletteScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [selectedBetType, setSelectedBetType] = useState("color"); // color, even_odd, number, dozen
  const [selectedBetValue, setSelectedBetValue] = useState("red"); // red, black, even, odd, 1-36, first, second, third
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const wheelRotation = useSharedValue(0);
  const ballPosition = useSharedValue({ x: 0, y: -80 }); // Start at the top

  useEffect(() => {
    fetchBalance();
  }, []);

  const wheelStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${wheelRotation.value}deg` }],
    };
  });

  const ballStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: ballPosition.value.x },
        { translateY: ballPosition.value.y },
      ],
    };
  });

  // This function calculates the exact angle needed to position a specific number at the top
  const getAngleForNumber = (number: any) => {
    const numberIndex = ROULETTE_NUMBERS.indexOf(number);
    if (numberIndex === -1) {
      console.error(`Number ${number} not found in roulette wheel!`);
      return 0;
    }

    // Calculate the angle for this number (each number takes 360/37 degrees)
    const segmentAngle = 360 / ROULETTE_NUMBERS.length;

    // The angle needed to position this number at the top (12 o'clock position)
    // We need to rotate clockwise, so we use a negative angle
    return -(numberIndex * segmentAngle);
  };

  function animateWheel(finalNumber: any) {
    // Reset any previous animations
    wheelRotation.value = 0;

    // Get the angle needed to position the result number at the top
    const targetAngle = getAngleForNumber(finalNumber);

    // Add multiple full rotations for animation effect (4 full rotations + the target angle)
    const finalRotation = 1440 + targetAngle; // 1440 = 4 * 360

    setDebugInfo({
      targetNumber: finalNumber,
      targetAngle: targetAngle,
      finalRotation: finalRotation,
    });

    console.log(
      `Spinning to number: ${finalNumber}, angle: ${targetAngle}, final rotation: ${finalRotation}`
    );

    // Animate the wheel with a slow-down effect
    wheelRotation.value = withTiming(finalRotation, {
      duration: 5000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // The ball stays fixed at the top position in this implementation
    // This ensures it always aligns with the result number
  }

  const handleBet = async () => {
    const amount = Number.parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      setError("Please enter a valid bet amount greater than or equal to ₦10");
      return;
    }

    if (amount > balance) {
      setError("Insufficient balance");
      return;
    }

    // Validate bet selection
    if (selectedBetType === "number" && selectedNumber === null) {
      setError("Please select a number");
      return;
    }

    setError("");
    setGameState("playing");
    setDebugInfo(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Prepare bet choice based on selected type and value
    let betChoice;
    if (selectedBetType === "number") {
      betChoice = `number:${selectedNumber}`;
    } else if (selectedBetType === "color") {
      betChoice = `color:${selectedBetValue}`;
    } else if (selectedBetType === "even_odd") {
      betChoice = `even_odd:${selectedBetValue}`;
    } else if (selectedBetType === "dozen") {
      betChoice = `dozen:${selectedBetValue}`;
    }

    try {
      const response = await api.post("/games/play/roulette", {
        bet_amount: amount,
        choice: betChoice,
      });

      const { result: gameResult } = response.data;

      // Store the result first to ensure we have the correct data
      const resultData = {
        number: gameResult.number,
        color: gameResult.color,
        won: gameResult.won,
        multiplier: gameResult.multiplier,
        amount: gameResult.won ? amount * gameResult.multiplier : 0,
      };

      // Animate wheel to land on the result number
      animateWheel(gameResult.number);

      // Wait for animation to complete
      setTimeout(() => {
        setResult(resultData);
        setGameState(resultData.won ? "won" : "lost");
        fetchBalance(); // Refresh balance after game

        if (resultData.won) {
          confettiRef.current?.play();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast(`You won ₦${resultData.amount.toFixed(2)}!`, "success");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast(`You lost ₦${amount.toFixed(2)}`, "error");
        }
      }, 6000);
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
    setDebugInfo(null);
    wheelRotation.value = 0;
    ballPosition.value = { x: 0, y: -80 };
  };

  const renderBetOptions = () => {
    switch (selectedBetType) {
      case "color":
        return (
          <View style={styles.betOptions}>
            <TouchableOpacity
              onPress={() => {
                setSelectedBetValue("red");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.betOption,
                selectedBetValue === "red" && styles.selectedBetOption,
                { backgroundColor: "rgba(244, 67, 54, 0.2)" },
              ]}
            >
              <View
                style={[styles.colorIndicator, { backgroundColor: "#F44336" }]}
              />
              <Text style={styles.betOptionText}>Red</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedBetValue("black");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.betOption,
                selectedBetValue === "black" && styles.selectedBetOption,
                { backgroundColor: "rgba(33, 33, 33, 0.2)" },
              ]}
            >
              <View
                style={[styles.colorIndicator, { backgroundColor: "#212121" }]}
              />
              <Text style={styles.betOptionText}>Black</Text>
            </TouchableOpacity>
          </View>
        );
      case "even_odd":
        return (
          <View style={styles.betOptions}>
            <TouchableOpacity
              onPress={() => {
                setSelectedBetValue("even");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.betOption,
                selectedBetValue === "even" && styles.selectedBetOption,
              ]}
            >
              <Text style={styles.betOptionText}>Even</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedBetValue("odd");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.betOption,
                selectedBetValue === "odd" && styles.selectedBetOption,
              ]}
            >
              <Text style={styles.betOptionText}>Odd</Text>
            </TouchableOpacity>
          </View>
        );
      case "dozen":
        return (
          <View style={styles.betOptions}>
            <TouchableOpacity
              onPress={() => {
                setSelectedBetValue("first");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.betOption,
                selectedBetValue === "first" && styles.selectedBetOption,
              ]}
            >
              <Text style={styles.betOptionText}>1-12</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedBetValue("second");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.betOption,
                selectedBetValue === "second" && styles.selectedBetOption,
              ]}
            >
              <Text style={styles.betOptionText}>13-24</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedBetValue("third");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.betOption,
                selectedBetValue === "third" && styles.selectedBetOption,
              ]}
            >
              <Text style={styles.betOptionText}>25-36</Text>
            </TouchableOpacity>
          </View>
        );
      case "number":
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.numbersScrollView}
          >
            <View style={styles.numbersContainer}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedNumber(0);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.numberButton,
                  selectedNumber === 0 && styles.selectedNumberButton,
                  { backgroundColor: "rgba(0, 200, 83, 0.2)" },
                ]}
              >
                <Text style={styles.numberButtonText}>0</Text>
              </TouchableOpacity>
              {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => {
                    setSelectedNumber(num);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.numberButton,
                    selectedNumber === num && styles.selectedNumberButton,
                    {
                      backgroundColor: `rgba(${
                        getNumberColor(num) === "#F44336"
                          ? "244, 67, 54"
                          : "33, 33, 33"
                      }, 0.2)`,
                    },
                  ]}
                >
                  <Text style={styles.numberButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );
      default:
        return null;
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
        <Text style={styles.title}>Roulette</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.wheelContainer}>
          {/* Fixed indicator at the top */}
          <View style={styles.indicator} />

          <Animated.View style={[styles.wheel, wheelStyle]}>
            <RouletteSvg />
          </Animated.View>

          {/* Debug info overlay */}
          {debugInfo && (
            <View style={styles.debugOverlay}>
              <Text style={styles.debugText}>
                Target: {debugInfo.targetNumber}
              </Text>
              <Text style={styles.debugText}>
                Angle: {debugInfo.targetAngle.toFixed(1)}°
              </Text>
            </View>
          )}
        </View>
        <ScrollView>
          {gameState === "idle" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.controlsContainer}
            >
              <Text style={styles.gameDescription}>
                Place your bets on the roulette wheel! Choose a color, even/odd,
                dozen, or specific number.
              </Text>

              <View style={styles.betTypeSelector}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBetType("color");
                    setSelectedBetValue("red");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.betTypeButton,
                    selectedBetType === "color" && styles.selectedBetTypeButton,
                  ]}
                >
                  <Text style={styles.betTypeText}>Color</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBetType("even_odd");
                    setSelectedBetValue("even");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.betTypeButton,
                    selectedBetType === "even_odd" &&
                      styles.selectedBetTypeButton,
                  ]}
                >
                  <Text style={styles.betTypeText}>Even/Odd</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBetType("dozen");
                    setSelectedBetValue("first");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.betTypeButton,
                    selectedBetType === "dozen" && styles.selectedBetTypeButton,
                  ]}
                >
                  <Text style={styles.betTypeText}>Dozen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedBetType("number");
                    setSelectedNumber(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.betTypeButton,
                    selectedBetType === "number" &&
                      styles.selectedBetTypeButton,
                  ]}
                >
                  <Text style={styles.betTypeText}>Number</Text>
                </TouchableOpacity>
              </View>

              {renderBetOptions()}

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
                onPress={handleBet}
                style={[styles.betButtonContainer, { paddingBottom: 50 }]}
              >
                <LinearGradient
                  colors={["#11998E", "#38EF7D"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.betButton}
                >
                  <Text style={styles.betButtonText}>Place Bet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>

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
            <View style={styles.resultDetails}>
              <Text style={styles.resultNumber}>Number: {result?.number}</Text>
              <View style={styles.resultColorContainer}>
                <Text style={styles.resultColorLabel}>Color: </Text>
                <View
                  style={[
                    styles.resultColorIndicator,
                    {
                      backgroundColor:
                        result?.color === "red"
                          ? "#F44336"
                          : result?.color === "black"
                          ? "#212121"
                          : "#00C853",
                    },
                  ]}
                />
              </View>
            </View>
            {gameState === "won" && (
              <>
                <Text style={styles.multiplierText}>
                  Multiplier: {result?.multiplier}x
                </Text>
                <Text style={styles.amountWon}>
                  +₦{result?.amount.toFixed(2)}
                </Text>
              </>
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
    position: "relative",
  },
  wheel: {
    width: 280,
    height: 280,
  },
  indicator: {
    position: "absolute",
    top: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFFFFF",
    zIndex: 10,
  },
  debugOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 8,
    zIndex: 100,
  },
  debugText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
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
  betTypeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  betTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  selectedBetTypeButton: {
    backgroundColor: "rgba(17, 153, 142, 0.2)",
    borderWidth: 1,
    borderColor: "#11998E",
  },
  betTypeText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  betOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  betOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  selectedBetOption: {
    borderWidth: 1,
    borderColor: "#11998E",
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  betOptionText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  numbersScrollView: {
    width: "100%",
    marginBottom: 16,
  },
  numbersContainer: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  selectedNumberButton: {
    borderWidth: 1,
    borderColor: "#11998E",
  },
  numberButtonText: {
    fontSize: 16,
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
  betButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  betButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  betButtonText: {
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
    marginBottom: 16,
  },
  wonResultText: {
    color: "#4CAF50",
  },
  lostResultText: {
    color: "#F44336",
  },
  resultDetails: {
    width: "100%",
    marginBottom: 16,
  },
  resultNumber: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 8,
  },
  resultColorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultColorLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  resultColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
  multiplierText: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 8,
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
