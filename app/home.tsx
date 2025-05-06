"use client";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useWallet } from "../context/wallet-context";

const games = [
  {
    id: "1",
    name: "Coin Toss",
    icon: require("../assets/images/games/coin-toss.png"),
    route: "/games/coin-toss",
    color: ["#FF9500", "#FF5E3A"],
  },
  {
    id: "2",
    name: "Dice Roll",
    icon: require("../assets/images/games/dice-roll.png"),
    route: "/games/dice-roll",
    color: ["#52E5E7", "#130CB7"],
  },
  {
    id: "3",
    name: "Rock Paper Scissors",
    icon: require("../assets/images/games/rock-paper-scissors.png"),
    route: "/games/rock-paper-scissors",
    color: ["#F02FC2", "#6094EA"],
  },
  {
    id: "4",
    name: "Even/Odd",
    icon: require("../assets/images/games/even-odd.png"),
    route: "/games/even-odd",
    color: ["#65FDF0", "#1D6FA3"],
  },
  {
    id: "5",
    name: "Card Draw",
    icon: require("../assets/images/games/card-draw.png"),
    route: "/games/card-draw",
    color: ["#7367F0", "#CE9FFC"],
  },
  {
    id: "6",
    name: "Number Guess",
    icon: require("../assets/images/games/number-guess.png"),
    route: "/games/number-guess",
    color: ["#F6D242", "#FF52E5"],
  },
  {
    id: "7",
    name: "Wheel Spin",
    icon: require("../assets/images/games/wheel-spin.png"),
    route: "/games/wheel-spin",
    color: ["#00C9FF", "#92FE9D"],
  },
  {
    id: "8",
    name: "Slot Machine",
    icon: require("../assets/images/games/slot-machine.png"),
    route: "/games/slot-machine",
    color: ["#FC466B", "#3F5EFB"],
  },
  {
    id: "9",
    name: "Blackjack",
    icon: require("../assets/images/games/blackjack.png"),
    route: "/games/blackjack",
    color: ["#3F2B96", "#A8C0FF"],
  },
  {
    id: "10",
    name: "Roulette",
    icon: require("../assets/images/games/roulette.png"),
    route: "/games/roulette",
    color: ["#11998E", "#38EF7D"],
  },
  // {
  //   id: "11",
  //   name: "Whot",
  //   icon: require("../assets/images/games/whot.png"),
  //   route: "/games/whot",
  //   color: ["#11998E", "#38EF7D"],
  // },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const balanceScale = useSharedValue(1);

  const balanceStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: balanceScale.value }],
    };
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await fetchBalance();
    } catch (error) {
      showToast("Failed to load balance", "error");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBalance();
    } catch (error) {
      showToast("Failed to refresh data", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGamePress = (route: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route);
  };

  const animateBalance = () => {
    balanceScale.value = withSpring(1.1, { damping: 2 });
    setTimeout(() => {
      balanceScale.value = withSpring(1);
    }, 300);
  };

  useEffect(() => {
    animateBalance();
  }, [balance]);

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await logout();
      router.push("/auth/login");
    } catch (error) {
      showToast("Failed to logout", "error");
    }
  };

  function truncateText(text: any) {
    return text.length > 6 ? text.substring(0, 6) + "..." : text;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.username || "User"}</Text>
          <Text style={styles.subtitle}>Ready to test your luck?</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.balanceCard, balanceStyle]}>
        <LinearGradient
          colors={["#6a11cb", "#2575fc"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.balanceGradient}
        >
          <View style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balanceAmount}>₦{balance.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/wallet/deposit");
              }}
              style={styles.balanceButton}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.balanceButtonText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/wallet/withdraw");
              }}
              style={styles.balanceButton}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.balanceButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.gamesSection}>
        <Text style={styles.sectionTitle}>Games</Text>
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.gameRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gamesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              colors={["#ffffff"]}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(index * 100)
                .duration(600)
                .springify()}
              style={styles.gameCard}
            >
              <TouchableOpacity
                onPress={() => handleGamePress(item.route)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={item.color}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gameGradient}
                >
                  <Image source={item.icon} style={styles.gameIcon} />
                  <Text style={styles.gameName}>{truncateText(item.name)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, styles.tabItemActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name="game-controller" size={24} color="#2575fc" />
          <Text style={styles.tabLabelActive}>Games</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/transactions");
          }}
        >
          <Ionicons name="list" size={24} color="#9e9e9e" />
          <Text style={styles.tabLabel}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/profile");
          }}
        >
          <Ionicons name="person" size={24} color="#9e9e9e" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  greeting: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
  },
  logoutButton: {
    padding: 8,
  },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  balanceGradient: {
    borderRadius: 16,
    padding: 20,
  },
  balanceContent: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  balanceActions: {
    flexDirection: "row",
  },
  balanceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  balanceButtonText: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
    marginLeft: 6,
  },
  gamesSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  gamesList: {
    paddingBottom: 80,
  },
  gameCard: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    marginHorizontal: "1.66%",
  },
  gameGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  gameIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
  },
  gameName: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabItemActive: {
    backgroundColor: "rgba(37, 117, 252, 0.1)",
    borderRadius: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginTop: 4,
  },
  tabLabelActive: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#2575fc",
    marginTop: 4,
  },
  gameRow: {
    justifyContent: "space-between",
  },
});
