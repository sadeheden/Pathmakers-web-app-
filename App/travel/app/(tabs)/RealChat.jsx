import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export default function RealChatScreen() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Act as a travel agent. Answer questions with full explanations and step-by-step thinking.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const askAI = useCallback(async () => {
    try {
      setIsLoading(true);
        const response = await fetch("https://pathmakers-web-app-app-travel.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        setMessages((prev) => [...prev, data.choices[0].message]);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, an error occurred. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    if (
      messages.length > 1 &&
      messages[messages.length - 1].role === "user"
    ) {
      askAI();
    }
  }, [messages]);

  const handleSend = () => {
    if (text.trim() === "") return;
    setMessages([...messages, { role: "user", content: text }]);
    setText("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.header}>AI Triper - Chat</Text>

      <ScrollView style={styles.chatBox} contentContainerStyle={{ paddingBottom: 80 }}>
        {messages
          .filter((m) => m.role !== "system")
          .map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                message.role === "user" ? styles.userMessage : styles.botMessage,
              ]}
            >
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          ))}
        {isLoading && (
          <ActivityIndicator size="large" color="#6633cc" style={{ marginTop: 10 }} />
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type your message..."
          style={styles.input}
          editable={!isLoading}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={isLoading || !text.trim()}
          style={styles.sendButton}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 15,
    backgroundColor: "#6633cc",
    color: "#fff",
  },
  chatBox: {
    flex: 1,
    padding: 10,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#daf0ff",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f1f1",
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#6633cc",
    borderRadius: 20,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
