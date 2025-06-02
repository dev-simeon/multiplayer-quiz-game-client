// Global state variables (minimal, gameClient.js will hold more game-specific state)
let currentView = "authView"; // Initial view - Note: UI.showView manages the actual display

// DOM Elements (cache main ones) - This is good for reference but UI.js might manage its own cache
const views = {
  authView: document.getElementById("authView"),
  roomManagementView: document.getElementById("roomManagementView"),
  lobbyView: document.getElementById("lobbyView"),
  gameView: document.getElementById("gameView"),
  resultsView: document.getElementById("resultsView"),
};

// Initialize all modules on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  // Initialize Firebase Auth and UI
  if (typeof Auth !== "undefined" && typeof Auth.init === "function") {
    Auth.init(); // Will set up FirebaseUI or custom listeners
  } else {
    console.error("Auth module or Auth.init function is not defined.");
  }

  // Initialize UI interactions (button clicks not tied to specific game events yet)
  initUIEventListeners();

  // Initialize Lobby Chat UI event listeners (if GameClient is ready)
  if (
    typeof GameClient !== "undefined" &&
    typeof GameClient.initLobbyChatEventListeners === "function"
  ) {
    GameClient.initLobbyChatEventListeners();
  } else {
    console.error(
      "GameClient or GameClient.initLobbyChatEventListeners function is not defined."
    );
  }

  // GameClient's socket event listeners will be registered after socket connection.
  // UI module is mostly a collection of functions, no specific init needed unless for global elements.
});

function initUIEventListeners() {
  // Auth related (logout)
  const logoutButton = document.getElementById("logoutButton");
  if (
    logoutButton &&
    typeof Auth !== "undefined" &&
    typeof Auth.logout === "function"
  ) {
    logoutButton.addEventListener("click", Auth.logout);
  }

  // Room Management
  const createRoomButton = document.getElementById("createRoomButton");
  if (
    createRoomButton &&
    typeof GameClient !== "undefined" &&
    typeof GameClient.handleCreateRoom === "function"
  ) {
    createRoomButton.addEventListener("click", GameClient.handleCreateRoom);
  }

  const joinRoomButton = document.getElementById("joinRoomButton");
  if (
    joinRoomButton &&
    typeof GameClient !== "undefined" &&
    typeof GameClient.handleJoinRoom === "function"
  ) {
    joinRoomButton.addEventListener("click", GameClient.handleJoinRoom);
  }

  const copyRoomCodeButton = document.getElementById("copyRoomCodeButton");
  if (
    copyRoomCodeButton &&
    typeof UI !== "undefined" &&
    typeof UI.copyRoomCodeToClipboard === "function"
  ) {
    copyRoomCodeButton.addEventListener("click", UI.copyRoomCodeToClipboard);
  }

  // Lobby
  const startGameButton = document.getElementById("startGameButton");
  if (
    startGameButton &&
    typeof GameClient !== "undefined" &&
    typeof GameClient.handleStartGame === "function"
  ) {
    startGameButton.addEventListener("click", GameClient.handleStartGame);
  }

  const leaveRoomButtonLobby = document.getElementById("leaveRoomButtonLobby");
  if (
    leaveRoomButtonLobby &&
    typeof GameClient !== "undefined" &&
    typeof GameClient.handleLeaveRoom === "function"
  ) {
    leaveRoomButtonLobby.addEventListener("click", GameClient.handleLeaveRoom);
  }

  // Game
  const answerOptions = document.getElementById("answerOptions");
  if (
    answerOptions &&
    typeof GameClient !== "undefined" &&
    typeof GameClient.handleSubmitAnswer === "function"
  ) {
    answerOptions.addEventListener("click", GameClient.handleSubmitAnswer); // Event delegation
  }

  const leaveRoomButtonGame = document.getElementById("leaveRoomButtonGame");
  if (
    leaveRoomButtonGame &&
    typeof GameClient !== "undefined" &&
    typeof GameClient.handleLeaveRoom === "function"
  ) {
    leaveRoomButtonGame.addEventListener("click", GameClient.handleLeaveRoom);
  }

  // Results
  const backToRoomManagementButton = document.getElementById(
    "backToRoomManagementButton"
  );
  if (
    backToRoomManagementButton &&
    typeof GameClient !== "undefined" &&
    typeof GameClient.handlePlayAgain === "function"
  ) {
    // This button now correctly calls handlePlayAgain from your GameClient
    backToRoomManagementButton.addEventListener(
      "click",
      GameClient.handlePlayAgain
    );
  }
}

// Called by Auth.js when auth state changes
function onAuthStateChanged(user) {
  // Ensure UI and GameClient modules are available
  if (
    typeof UI === "undefined" ||
    typeof GameClient === "undefined" ||
    typeof Auth === "undefined" ||
    typeof SocketClient === "undefined"
  ) {
    console.error(
      "CRITICAL: UI, GameClient, Auth, or SocketClient module not loaded. Cannot proceed with onAuthStateChanged."
    );
    if (
      typeof UI !== "undefined" &&
      typeof UI.displayNotification === "function"
    ) {
      UI.displayNotification(
        "Critical error: Application modules not loaded.",
        "danger",
        0
      );
    }
    return;
  }

  if (user) {
    console.log("User is signed in:", user.displayName || user.email);
    UI.updateUserInfo(user);
    // Determine if user was already in a room (e.g., from localStorage)
    // For now, always show room management after login, rejoin logic is in GameClient.attemptRejoinPreviousRoom
    const previousRoomId = localStorage.getItem("currentGameRoomId");
    if (previousRoomId && GameClient.isInRoom && GameClient.isInRoom()) {
      // Check if GameClient thinks it's in a room
      UI.showView("lobbyView"); // Or 'gameView' if game was in progress
      UI.setLobbyRoomCode(localStorage.getItem("currentGameRoomCode"));
    } else {
      UI.showView("roomManagementView");
    }

    GameClient.setMyUID(user.uid); // Store UID

    Auth.getIdToken()
      .then((token) => {
        if (token) {
          SocketClient.connect(token); // SocketClient.connect will handle calling GameClient.setMySocketId
        } else {
          console.error("Could not get ID token for Socket.IO connection.");
          UI.displayNotification(
            "Error: Could not authenticate for real-time connection.",
            "danger"
          );
        }
      })
      .catch((error) => {
        console.error("Error getting ID token:", error);
        UI.displayNotification("Error: Could not get ID token.", "danger");
      });
  } else {
    console.log("User is signed out.");
    UI.updateUserInfo(null);
    UI.showView("authView");
    SocketClient.disconnect();
    GameClient.resetClientState();
    localStorage.removeItem("currentGameRoomId"); // Clear room persistence on logout
    localStorage.removeItem("currentGameRoomCode");
  }
}

// Start the application
// (DOMContentLoaded handles initialization)
