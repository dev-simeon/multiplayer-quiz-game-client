// public/js/socketClient.js

const SocketClient = (() => {
  let socket = null;

  function connect(token) {
    if (socket && socket.connected) {
      console.log("Socket already connected.");
      // GameClient.attemptRejoinPreviousRoom(); // Ensure GameClient handles this
      return;
    }

    socket = io("https://multiplayer-quiz-game-server.railway.internal/", {
      // Assumes frontend and backend are same origin
      auth: {
        token: token,
      },
    });

    console.log("Attempting to connect Socket.IO...");

    socket.on("connect", () => {
      console.log("Socket.IO connected successfully! SID:", socket.id);
      UI.displayNotification("Connected to game server!", "success");

      if(GameClient && typeof GameClient.registerSocketEventListeners === "function") {
        GameClient.registerSocketEventListeners();
      }
      
      if (GameClient && typeof GameClient.setMySocketId === "function") {
        GameClient.setMySocketId(socket.id);
      }
      if (
        GameClient &&
        typeof GameClient.attemptRejoinPreviousRoom === "function"
      ) {
        GameClient.attemptRejoinPreviousRoom();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error.message, error.data);
      if (error.data && error.data.content) {
        UI.displayNotification(
          `Connection failed: ${error.data.content}`,
          "danger"
        );
      } else if (
        error.message &&
        error.message.includes("Authentication error")
      ) {
        UI.displayNotification(
          "Authentication error with game server. Please re-login.",
          "danger"
        );
        if (Auth && typeof Auth.logout === "function") Auth.logout();
      } else {
        UI.displayNotification("Failed to connect to game server.", "danger");
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket.IO disconnected:", reason);
      UI.displayNotification(
        "Disconnected from game server: " + reason,
        "warning"
      );
      if (GameClient && typeof GameClient.handleDisconnection === "function") {
        GameClient.handleDisconnection();
      }
    });

    socket.on("message", (data) => {
      UI.displayNotification(data, "info");
    });

    socket.on("playerJoined", (player) => {
      if (
        GameClient &&
        typeof GameClient.handlePlayerJoinedNotification === "function"
      ) {
        GameClient.handlePlayerJoinedNotification(player);
      }
    });

    socket.on("playerLeft", (data) => {
      if (
        GameClient &&
        typeof GameClient.handlePlayerLeftNotification === "function"
      ) {
        GameClient.handlePlayerLeftNotification(data);
      }
    });

    // Listener for private messages - your implementation is good!
    socket.on("privateMessage", (data) => {
      // { fromUid, message, timestamp }
      // Assuming GameClient and UI will be available globally or properly scoped
      if (GameClient && typeof GameClient.handlePrivateMessage === "function") {
        GameClient.handlePrivateMessage(data); // Delegate to GameClient
      } else {
        // Fallback or direct UI call if GameClient is not handling it
        console.warn(
          "GameClient.handlePrivateMessage not found, logging to console."
        );
        const fromName = data.fromUid; // Basic fallback name
        UI.displayNotification(
          `PM from ${fromName}: ${data.message}`,
          "secondary"
        );
      }
    });

    socket.on("updatePlayerList", (payload) => {
      if (
        GameClient &&
        typeof GameClient.handleUpdatePlayerList === "function"
      ) {
        GameClient.handleUpdatePlayerList(payload);
      }
    });

    socket.on("playerOffline", (data) => {
      if (GameClient && typeof GameClient.handlePlayerOffline === "function") {
        GameClient.handlePlayerOffline(data);
      }
    });

    socket.on("gameStarted", (initialState) => {
      if (GameClient && typeof GameClient.handleGameStarted === "function") {
        GameClient.handleGameStarted(initialState);
      }
    });

    socket.on("nextTurn", (data) => {
      if (GameClient && typeof GameClient.handleNextTurn === "function") {
        GameClient.handleNextTurn(data);
      }
    });

    socket.on("answerResult", (data) => {
      if (GameClient && typeof GameClient.handleAnswerResult === "function") {
        GameClient.handleAnswerResult(data);
      }
    });

    socket.on("scoreUpdate", (scores) => {
      if (GameClient && typeof GameClient.handleScoreUpdate === "function") {
        GameClient.handleScoreUpdate(scores);
      }
    });

    socket.on("stealOpportunity", (data) => {
      if (
        GameClient &&
        typeof GameClient.handleStealOpportunity === "function"
      ) {
        GameClient.handleStealOpportunity(data);
      }
    });

    socket.on("stealResult", (data) => {
      if (GameClient && typeof GameClient.handleStealResult === "function") {
        GameClient.handleStealResult(data);
      }
    });

    socket.on("gameEnded", (finalScores) => {
      if (GameClient && typeof GameClient.handleGameEnded === "function") {
        GameClient.handleGameEnded(finalScores);
      }
    });

    socket.on("gameError", (data) => {
      console.error("Game Error from server:", data.message);
      UI.displayNotification("Error: " + data.message, "danger");
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
    }
  }

  function emit(eventName, data, ackCallback) {
    if (socket && socket.connected) {
      socket.emit(eventName, data, ackCallback);
    } else {
      console.warn(`Socket not connected. Cannot emit event: ${eventName}`);
      UI.displayNotification(
        "Not connected to server. Action failed.",
        "warning"
      );
      if (ackCallback)
        ackCallback({ status: "error", message: "Not connected." });
    }
  }

  // Specific emitters
  function emitCreateRoom(playerName, callback) {
    emit("createRoom", { playerName }, callback);
  }
  function emitJoinRoom(roomCode, playerName, callback) {
    emit("joinRoom", { roomCode, playerName }, callback);
  }
  function emitStartGame(roomId, callback) {
    emit("game:start", { roomId }, callback);
  }
  function emitSubmitAnswer(roomId, questionId, answerIndex, callback) {
    emit("submitAnswer", { roomId, questionId, answerIndex }, callback);
  }
  function emitSubmitSteal(roomId, questionId, answerIndex, callback) {
    emit("submitSteal", { roomId, questionId, answerIndex }, callback);
  }
  function emitLeaveRoom(roomId, callback) {
    emit("leaveRoom", { roomId }, callback);
  }

  // **NEW**: Emitter for sending private messages
  function emitPrivateMessage(toUid, message, callback) {
    emit("privateMessage", { toUid, message }, callback);
  }

  // Generic 'on' method: useful for flexibility, but prefer explicit handlers for clarity.
  // It's fine to keep if you have specific use cases outside the primary game flow.
  function on(event, handler) {
    if (socket) {
      socket.on(event, handler);
    } else {
      console.warn(
        `Socket not initialized. Cannot attach listener for: ${event}`
      );
    }
  }

  return {
    connect,
    disconnect,
    emit, // Generic emit (can be useful for debugging or unique events)
    // Specific Emitters:
    emitCreateRoom,
    emitJoinRoom,
    emitStartGame,
    emitSubmitAnswer,
    emitSubmitSteal,
    emitLeaveRoom,
    emitPrivateMessage, // Ensure this is exposed
    on, // Expose generic 'on' if needed
  };
})();
