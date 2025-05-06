"use client";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "../../context/toast-context";
import { useWallet } from "../../context/wallet-context";

export default function WithdrawScreen() {
  const router = useRouter();
  const { balance, requestWithdrawal, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBalance();
  }, []);

  const handleWithdraw = async () => {
    const withdrawalAmount = Number.parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      setError("Please enter a valid amount");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (withdrawalAmount > balance) {
      setError("Insufficient balance");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!accountName || !accountNumber || !bankName || !routingNumber) {
      setError("Please fill in all bank details");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError("");
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await requestWithdrawal(withdrawalAmount, {
        accountName,
        accountNumber,
        bankName,
        routingNumber,
      });
      showToast("Withdrawal request submitted successfully", "success");
      Alert.alert(
        "Withdrawal Request Submitted",
        "Your withdrawal request has been submitted. Once processed by admin, the funds will be transferred to your bank account.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Failed to submit withdrawal request. Please try again."
      );
      showToast("Failed to submit withdrawal request", "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
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
        <Text style={styles.title}>Withdraw</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(600).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Enter Withdrawal Amount</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.dollarSign}>₦</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(600).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Your Bank Details</Text>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Account Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Enter account name"
              placeholderTextColor="#9e9e9e"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Account Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Enter account number"
              placeholderTextColor="#9e9e9e"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Bank Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Enter bank name"
              placeholderTextColor="#9e9e9e"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Routing Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={routingNumber}
              onChangeText={setRoutingNumber}
              placeholder="Enter routing number"
              placeholderTextColor="#9e9e9e"
              keyboardType="numeric"
            />
          </View>
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          onPress={handleWithdraw}
          disabled={isLoading}
          style={styles.buttonContainer}
        >
          <LinearGradient
            colors={["#6a11cb", "#2575fc"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Submit Withdrawal Request</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.noteText}>
          Note: Withdrawal requests are processed manually by admin. Please
          allow 1-3 business days for processing.
        </Text>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  dollarSign: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#9e9e9e",
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#ffffff",
  },
  errorText: {
    color: "#ff5252",
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
  },
  buttonContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  noteText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    textAlign: "center",
    marginTop: 8,
  },
});
