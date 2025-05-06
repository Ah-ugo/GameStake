"use client";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useWallet } from "../context/wallet-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { balance, transactions } = useWallet();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  // Calculate statistics
  const totalGames = transactions.filter((t) => t.type === "game").length;
  const gamesWon = transactions.filter(
    (t) => t.type === "game" && t.status === "won"
  ).length;
  const gamesLost = transactions.filter(
    (t) => t.type === "game" && t.status === "lost"
  ).length;
  const winRate =
    totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;

  // Calculate favorite game
  const gameTypeCounts = {};
  transactions
    .filter((t) => t.type === "game")
    .forEach((t) => {
      if (t.game_type) {
        gameTypeCounts[t.game_type] = (gameTypeCounts[t.game_type] || 0) + 1;
      }
    });

  let favoriteGame = "None";
  let maxCount = 0;
  for (const [game, count] of Object.entries(gameTypeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      favoriteGame = game
        .replace(/-/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await logout();
      router.replace("/auth/login");
    } catch (error) {
      console.error(error);
      showToast("Failed to logout", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSetting = (setting, value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (setting) {
      case "notifications":
        setNotificationsEnabled(value);
        break;
      case "sound":
        setSoundEnabled(value);
        break;
      case "haptic":
        setHapticEnabled(value);
        break;
      case "darkMode":
        setDarkModeEnabled(value);
        break;
    }
    showToast(`Setting updated`, "success");
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
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(600).springify()}
          style={styles.profileSection}
        >
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={["#6a11cb", "#2575fc"]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.username}>{user?.username || "User"}</Text>
          <Text style={styles.email}>{user?.email || "user@example.com"}</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>₦{balance.toFixed(2)}</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(600).springify()}
          style={styles.statsSection}
        >
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalGames}</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{gamesWon}</Text>
              <Text style={styles.statLabel}>Games Won</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{winRate}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{favoriteGame}</Text>
              <Text style={styles.statLabel}>Favorite Game</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).duration(600).springify()}
          style={styles.settingsSection}
        >
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#ffffff"
              />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => toggleSetting("notifications", value)}
              trackColor={{ false: "#767577", true: "#2575fc" }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={24} color="#ffffff" />
              <Text style={styles.settingLabel}>Sound Effects</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(value) => toggleSetting("sound", value)}
              trackColor={{ false: "#767577", true: "#2575fc" }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="phone-portrait-outline"
                size={24}
                color="#ffffff"
              />
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={(value) => toggleSetting("haptic", value)}
              trackColor={{ false: "#767577", true: "#2575fc" }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={24} color="#ffffff" />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={(value) => toggleSetting("darkMode", value)}
              trackColor={{ false: "#767577", true: "#2575fc" }}
              thumbColor="#f4f3f4"
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(600).duration(600).springify()}
          style={styles.actionsSection}
        >
          <TouchableOpacity
            onPress={() => router.push("/wallet/deposit")}
            style={styles.actionButton}
          >
            <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
            <Text style={styles.actionButtonText}>Deposit Funds</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/wallet/withdraw")}
            style={styles.actionButton}
          >
            <Ionicons
              name="arrow-down-circle-outline"
              size={24}
              color="#ffffff"
            />
            <Text style={styles.actionButtonText}>Withdraw Funds</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/transactions")}
            style={styles.actionButton}
          >
            <Ionicons name="list-outline" size={24} color="#ffffff" />
            <Text style={styles.actionButtonText}>Transaction History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.actionButton, styles.logoutButton]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={24} color="#ffffff" />
                <Text style={styles.actionButtonText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace("/home");
          }}
        >
          <Ionicons name="game-controller" size={24} color="#9e9e9e" />
          <Text style={styles.tabLabel}>Games</Text>
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
          style={[styles.tabItem, styles.tabItemActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name="person" size={24} color="#2575fc" />
          <Text style={styles.tabLabelActive}>Profile</Text>
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 40,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  username: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginBottom: 16,
  },
  balanceContainer: {
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  statsSection: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#2575fc",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
  },
  settingsSection: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#ffffff",
    marginLeft: 12,
  },
  actionsSection: {
    marginBottom: 100,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: "#F44336",
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
});
