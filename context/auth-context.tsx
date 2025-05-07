import { api } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

// Platform-specific storage functions
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" ? localStorage.getItem(key) : null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, value);
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        localStorage.removeItem(key);
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

type User = {
  id: string;
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await storage.getItem("token");
        if (token) {
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const response = await api.get("/users/me");
          setUser(response.data);
        }
      } catch (error) {
        console.error("Failed to load user", error);
        await storage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const tokenResponse = await api.post(
        "/token",
        new URLSearchParams({
          username: email,
          password: password,
          grant_type: "password",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token } = tokenResponse.data;

      await storage.setItem("token", access_token);
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      const userResponse = await api.get("/users/me");
      setUser(userResponse.data);
    } catch (error: any) {
      const message = error.response?.data?.detail || "Login failed";
      console.error("Login failed:", message);
      throw new Error(message);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      if (!username || !email || !password) {
        throw new Error("All fields are required");
      }

      await storage.removeItem("token");

      const response = await api.post("/auth/register", {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (!response.data?.id) {
        throw new Error("Invalid server response");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      let loginAttempts = 0;
      while (loginAttempts < 3) {
        try {
          await login(username.trim(), password.trim());
          break;
        } catch (loginError) {
          loginAttempts++;
          if (loginAttempts === 3) {
            throw new Error(
              `Automatic login failed: ${(loginError as Error).message}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = parseRegistrationError(error);
      console.error("Registration error:", errorMessage);
      throw new Error(errorMessage);
    }
  };

  const parseRegistrationError = (error: any): string => {
    if (error.response?.data) {
      const { detail } = error.response.data;
      if (Array.isArray(detail)) {
        return detail.map((err) => `${err.loc[1]} ${err.msg}`).join("\n");
      }
      if (typeof detail === "string") {
        if (detail.includes("username")) return "Username already registered";
        if (detail.includes("email")) return "Email already registered";
        return detail;
      }
    }
    return error.message || "Registration failed";
  };

  const logout = async () => {
    try {
      await storage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
      throw new Error("Logout failed");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
