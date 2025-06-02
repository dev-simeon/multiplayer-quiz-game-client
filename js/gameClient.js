// public/js/gameClient.js
const GameClient = (() => {
  // Client-side game state (existing variables)
  let myUID = null;
  let mySocketId = null;
  let currentRoomId = null;
  let currentRoomCode = null;
  let hostUID = null;
  let playersInRoom = [];
  let currentQuestion = null;
  let isMyTurn = false;
  let isStealPhaseActive = false;
  let currentStealerUID = null;
  let questionStartTime = 0;
  let timerInterval = null;
  let currentTurnTimeoutDuration = 0;
  let totalQuestionsInGame = 0;
  let currentQuestionNumberInGame = 0;

  // User's new state variables (keeping them)
  let questionSummary = [];
  let playAgainRequested = false;
  let myTurnQuestions = [];
  let myTurnQuestionsData = []; // To store question text, options, correctIndex for summary
  let playAgainTimeout = null;
  let playAgainCountdown = 0;

  function resetClientState() {
    currentRoomId = null;
    currentRoomCode = null;
    hostUID = null;
    playersInRoom = [];
    currentQuestion = null;
    isMyTurn = false;
    isStealPhaseActive = false;
    currentStealerUID = null;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    questionStartTime = 0;
    currentTurnTimeoutDuration = 0;
    totalQuestionsInGame = 0;
    currentQuestionNumberInGame = 0;
    UI.hideStealOpportunityInfo();
    UI.enableAnswerOptions(false);

    // Reset new state variables
    questionSummary = [];
    playAgainRequested = false;
    myTurnQuestions = [];
    myTurnQuestionsData = [];
    clearPlayAgainTimeout();
    // Note: myUID and mySocketId are not reset here as they persist with the session/connection.
  }

  function setMyUID(uid) {
    myUID = uid;
  }
  function setMySocketId(sid) {
    mySocketId = sid;
  }

  function attemptRejoinPreviousRoom() {
    /* ... (user's existing logic) ... */
    const storedRoomId = localStorage.getItem("currentGameRoomId");
    const storedRoomCode = localStorage.getItem("currentGameRoomCode");
    const user = Auth.getCurrentUser();

    if (storedRoomId && storedRoomCode && user) {
      console.log(`Attempting to rejoin room: ${storedRoomCode}`);
      // Actual rejoin logic would involve emitting an event to the server
      // and the server responding, potentially with game state.
      // For now, this is a placeholder for more complex rejoin logic.
      // UI.displayNotification(`Found previous room ${storedRoomCode}. Manual rejoin required.`, "info");
    }
  }

  function handleDisconnection() {
    /* ... (user's existing logic) ... */
    UI.displayNotification(
      "Connection lost. Please check your internet and refresh if needed.",
      "danger"
    );
    // Consider disabling UI elements that require a connection
    // If in game/lobby, the UI might show a disconnected state.
  }

  function handleCreateRoom() {
    /* ... (user's existing logic, seems fine) ... */
    const user = Auth.getCurrentUser();
    if (!user) {
      UI.displayNotification("Please log in to create a room.", "warning");
      return;
    }
    const playerName =
      user.displayName || user.email.split("@")[0] || "HostPlayer";
    SocketClient.emitCreateRoom(playerName, (response) => {
      if (response && response.status === "ok") {
        currentRoomId = response.roomId;
        currentRoomCode = response.roomCode;
        hostUID = myUID; // Creator is definitely the host

        localStorage.setItem("currentGameRoomId", currentRoomId);
        localStorage.setItem("currentGameRoomCode", currentRoomCode);

        UI.setLobbyRoomCode(currentRoomCode);
        UI.showView("lobbyView");
        UI.displayNotification(
          `Room ${currentRoomCode} created! Waiting for players...`,
          "success"
        );
      } else {
        UI.displayNotification(
          response.message || "Failed to create room.",
          "danger"
        );
      }
    });
  }

  function handleJoinRoom() {
    /* ... (user's existing logic, seems fine) ... */
    const user = Auth.getCurrentUser();
    if (!user) {
      UI.displayNotification("Please log in to join a room.", "warning");
      return;
    }
    const roomCodeInputEl = document.getElementById("roomCodeInput");
    const roomCode = roomCodeInputEl.value.trim().toUpperCase();
    if (!roomCode) {
      UI.displayNotification("Please enter a room code.", "warning");
      return;
    }
    const playerName =
      user.displayName ||
      user.email.split("@")[0] ||
      `Player_${myUID ? myUID.substring(0, 4) : "New"}`;
    SocketClient.emitJoinRoom(roomCode, playerName, (response) => {
      if (response && response.status === "ok") {
        currentRoomId = response.roomId;
        currentRoomCode = response.roomCode;
        // hostUID will be set by the 'updatePlayerList' event.

        localStorage.setItem("currentGameRoomId", currentRoomId);
        localStorage.setItem("currentGameRoomCode", currentRoomCode);

        UI.setLobbyRoomCode(currentRoomCode);
        UI.showView("lobbyView");
        UI.displayNotification(
          `Successfully joined room ${currentRoomCode}.`,
          "success"
        );
        roomCodeInputEl.value = "";
      } else {
        UI.displayNotification(
          response.message || "Failed to join room.",
          "danger"
        );
      }
    });
  }

  function handleUpdatePlayerList(payload) {
    /* ... (user's existing logic - this is good as it handles the richer payload for hostId) ... */
    let receivedPlayers = [];
    let receivedHostId = null;

    if (payload && Array.isArray(payload.players) && payload.hostId) {
      receivedPlayers = payload.players;
      receivedHostId = payload.hostId;
      if (hostUID !== receivedHostId) {
        console.log("Host ID updated from server:", receivedHostId);
        hostUID = receivedHostId;
      }
    } else if (Array.isArray(payload)) {
      // Fallback for older payload structure
      receivedPlayers = payload;
      console.warn(
        "updatePlayerList received only player array. Host ID might not be updated for joiners/migrations unless creator."
      );
    } else {
      console.error(
        "Received malformed payload for updatePlayerList:",
        payload
      );
      return;
    }

    if (!myUID) {
      // Ensure myUID is set
      const currentUser = Auth.getCurrentUser();
      if (currentUser) myUID = currentUser.uid;
      else {
        console.error("Cannot process player list: myUID is not set.");
        return;
      }
    }

    playersInRoom = receivedPlayers.map((p) => ({
      uid: p.uid,
      name: p.name,
      score: p.score !== undefined ? p.score : 0,
      online: p.online !== undefined ? p.online : true,
      joinOrder: p.joinOrder,
      isHost: p.uid === hostUID,
    }));

    UI.updatePlayerList(playersInRoom, myUID, hostUID); // UI needs to display host badge based on isHost or by checking player.uid === hostUID
    UI.updateLobbyChatRecipientList(playersInRoom, myUID); // Update chat recipient list

    const onlinePlayerCount = playersInRoom.filter((p) => p.online).length;
    UI.toggleStartGameButton(
      onlinePlayerCount >= 2 && myUID === hostUID,
      myUID === hostUID
    );
  }

  function handlePlayerJoinedNotification(player) {
    /* ... (user's existing logic) ... */
    if (player.uid !== myUID) {
      UI.displayNotification(
        `${player.name || player.uid} has joined the lobby.`,
        "info"
      );
    }
  }

  function handlePlayerLeftNotification(data) {
    /* ... (user's existing logic) ... */
    const player = playersInRoom.find((p) => p.uid === data.uid);
    if (player && player.uid !== myUID) {
      UI.displayNotification(
        `${player.name || data.uid} has left the room.`,
        "info"
      );
    }
  }

  function handleStartGame() {
    /* ... (user's existing logic) ... */
    if (!currentRoomId) {
      UI.displayNotification("Not in a room to start game.", "warning");
      return;
    }
    if (myUID !== hostUID) {
      UI.displayNotification("Only the host can start the game.", "warning");
      return;
    }
    const onlinePlayers = playersInRoom.filter(
      (p) => p.online !== false
    ).length;
    if (onlinePlayers < 2) {
      UI.displayNotification(
        "Need at least 2 online players to start.",
        "warning"
      );
      return;
    }
    SocketClient.emitStartGame(currentRoomId, (response) => {
      if (response && response.status === "ok") {
        UI.displayNotification("Game starting...", "success");
      } else {
        UI.displayNotification(
          response.message || "Failed to start game.",
          "danger"
        );
      }
    });
  }

  function handleLeaveRoom() {
    /* ... (user's existing logic) ... */
    if (currentRoomId) {
      SocketClient.emitLeaveRoom(currentRoomId, (response) => {
        if (response && response.status === "ok") {
          UI.displayNotification("You have left the room.", "info");
        } else {
          UI.displayNotification(
            response.message || "Error leaving room.",
            "warning"
          );
        }
        resetClientStateAfterLeave();
      });
    } else {
      resetClientStateAfterLeave();
    }
  }

  function resetClientStateAfterLeave() {
    /* ... (user's existing logic with additions) ... */
    const wasInRoom = !!currentRoomId;
    resetClientState();
    localStorage.removeItem("currentGameRoomId");
    localStorage.removeItem("currentGameRoomCode");
    UI.showView("roomManagementView");
    if (wasInRoom) console.log("Client state reset after leaving room.");
    clearPlayAgainTimeout(); // From user's new code
    if (typeof UI.clearLobbyChat === "function") UI.clearLobbyChat(); // From user's new code
  }

  function handleSubmitAnswer(event) {
    /* ... (user's existing logic) ... */
    if (
      !event.target.classList.contains("answer-option") ||
      event.target.disabled
    ) {
      return;
    }
    if (!isMyTurn && !(isStealPhaseActive && myUID === currentStealerUID)) {
      UI.displayNotification("Not your turn to answer!", "warning");
      return;
    }
    if (!currentRoomId || !currentQuestion) {
      UI.displayNotification("Game or question data missing.", "danger");
      return;
    }

    const answerIndex = parseInt(event.target.dataset.index, 10);
    UI.enableAnswerOptions(false);
    event.target.classList.add("pending-selection");

    if (isStealPhaseActive && myUID === currentStealerUID) {
      SocketClient.emitSubmitSteal(
        currentRoomId,
        currentQuestion.id,
        answerIndex,
        (response) => {
          if (!(response && response.status === "ok")) {
            UI.displayNotification(
              response.message || "Failed to submit steal.",
              "danger"
            );
            UI.enableAnswerOptions(myUID === currentStealerUID);
            event.target.classList.remove("pending-selection");
          }
        }
      );
    } else if (isMyTurn) {
      SocketClient.emitSubmitAnswer(
        currentRoomId,
        currentQuestion.id,
        answerIndex,
        (response) => {
          if (!(response && response.status === "ok")) {
            UI.displayNotification(
              response.message || "Failed to submit answer.",
              "danger"
            );
            UI.enableAnswerOptions(isMyTurn);
            event.target.classList.remove("pending-selection");
          }
        }
      );
    }
  }

  function handlePlayerOffline(data) {
    /* ... (user's existing logic) ... */
    if (currentRoomId === data.roomId) {
      const player = playersInRoom.find((p) => p.uid === data.uid);
      if (player) {
        player.online = false;
        UI.updatePlayerList(playersInRoom, myUID, hostUID);
        UI.displayNotification(
          `${player.name || data.uid} went offline.`,
          "warning"
        );
        const onlinePlayerCount = playersInRoom.filter((p) => p.online).length;
        UI.toggleStartGameButton(
          onlinePlayerCount >= 2 && myUID === hostUID,
          myUID === hostUID
        );
      }
    }
  }

  function handleGameStarted(initialState) {
    /* ... (user's existing logic, ensure initialState.questions is handled if present) ... */
    console.log("Game Started:", initialState);
    currentQuestion = initialState.question;

    if (initialState.hostId && hostUID !== initialState.hostId) {
      hostUID = initialState.hostId;
    }

    if (initialState.players) {
      playersInRoom = initialState.players.map((p) => ({
        uid: p.uid,
        name: p.name,
        score: p.score !== undefined ? p.score : 0,
        online: p.online !== undefined ? p.online : true,
        isHost: p.uid === hostUID,
      }));
    }
    totalQuestionsInGame = initialState.totalQuestions;
    currentQuestionNumberInGame = Math.min(
      Math.max(initialState.currentQuestionNum || 1, 1),
      totalQuestionsInGame
    );
    isMyTurn = initialState.turnUid === myUID;
    isStealPhaseActive = false;
    currentStealerUID = null;

    // User's logic for myTurnQuestions / myTurnQuestionsData
    myTurnQuestions = [];
    myTurnQuestionsData = [];
    if (
      initialState.players &&
      initialState.totalQuestions &&
      playersInRoom.length > 0 &&
      initialState.questions
    ) {
      // Check for initialState.questions
      const myIndexInOrderedPlayers = playersInRoom.findIndex(
        (p) => p.uid === myUID
      ); // Assuming playersInRoom is now ordered by joinOrder or similar
      if (myIndexInOrderedPlayers !== -1) {
        for (let i = 0; i < initialState.totalQuestions; i++) {
          // This turn determination logic might need to match server's determineCurrentTurnPlayerUid
          if (i % playersInRoom.length === myIndexInOrderedPlayers) {
            myTurnQuestions.push(i);
            if (initialState.questions[i]) {
              // Assuming initialState.questions is an array of question objects
              myTurnQuestionsData.push({
                question: initialState.questions[i].text,
                options: initialState.questions[i].options,
                correctIndex: initialState.questions[i].correctIndex,
              });
            } else {
              myTurnQuestionsData.push({
                question: `Question #${i + 1}`,
                options: ["-", "-", "-", "-"],
                correctIndex: null,
              });
            }
          }
        }
      }
    } else {
      console.warn(
        "Could not determine myTurnQuestions; players, totalQuestions, or questions array missing in initialState."
      );
    }

    UI.updateScoreBoard(initialState.scores, playersInRoom, myUID);
    UI.displayQuestion(currentQuestion, isMyTurn);
    UI.setTurnIndicator(
      isMyTurn ? "Your Turn!" : `${getPlayerName(initialState.turnUid)}'s Turn`,
      isMyTurn
    );
    startClientTimer(initialState.turnTimeout);
    UI.hideStealOpportunityInfo();
    UI.updateGameProgress(currentQuestionNumberInGame, totalQuestionsInGame);
    UI.showView("gameView");

    const btn = document.getElementById("backToRoomManagementButton");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Play Again / New Game";
    }
    playAgainRequested = false;
    clearPlayAgainTimeout();
  }

  function handleNextTurn(data) {
    /* ... (user's existing logic) ... */
    console.log("Next Turn:", data);
    currentQuestion = data.question;
    isMyTurn = data.turnUid === myUID;
    isStealPhaseActive = false;
    currentStealerUID = null;
    const serverQuestionNum = data.currentQuestionNum; // Expecting server to send current question number
    const guessedNext = currentQuestionNumberInGame + 1;
    currentQuestionNumberInGame = Math.min(
      Math.max(serverQuestionNum || guessedNext, 1),
      totalQuestionsInGame
    );

    UI.resetAnswerHighlights();
    UI.displayQuestion(currentQuestion, isMyTurn);
    UI.setTurnIndicator(
      isMyTurn ? "Your Turn!" : `${getPlayerName(data.turnUid)}'s Turn`,
      isMyTurn
    );
    startClientTimer(data.timeout);
    UI.hideStealOpportunityInfo();
    UI.updateGameProgress(currentQuestionNumberInGame, totalQuestionsInGame);
  }

  function handleAnswerResult(data) {
    /* ... (user's existing logic, ensure questionSummary part is robust) ... */
    if (currentQuestion && currentQuestion.id === data.questionId) {
      const answeredPlayerName = getPlayerName(data.uid);
      const message = data.correct
        ? `${answeredPlayerName} answered correctly!`
        : `${answeredPlayerName} answered incorrectly.`;
      UI.displayNotification(
        message,
        data.correct ? "success" : "warning",
        2500
      );

      let mySelectedIndex = -1;
      const selectedButton = Array.from(
        document.getElementById("answerOptions").children
      ).find((btn) => btn.classList.contains("pending-selection"));
      if (selectedButton) {
        mySelectedIndex = parseInt(selectedButton.dataset.index, 10);
        selectedButton.classList.remove("pending-selection");
      }
      UI.highlightAnswer(mySelectedIndex, data.correctIndex, data.correct);

      if (data.uid === myUID && currentQuestion) {
        const qIndexInGame = currentQuestionNumberInGame - 1; // 0-indexed for game progress
        // Find if this question was one of "my turn" questions based on how they were assigned
        // This logic assumes `turnIndex` from room doc (used for loading questions) is the unique identifier for question order.
        // And myTurnQuestions stores these indices.
        // Let's assume currentQuestion.id is the string index '0', '1', etc.
        const originalQuestionIndexForSummary = parseInt(
          currentQuestion.id,
          10
        );

        questionSummary.push({
          question: currentQuestion.text,
          options: currentQuestion.options,
          playerAnswerIndex: mySelectedIndex,
          correctIndex: data.correctIndex,
          questionIndex: originalQuestionIndexForSummary, // Use the actual DB question index for reliable summary matching
        });
      }
    }
    UI.enableAnswerOptions(false);
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function handleScoreUpdate(scores) {
    /* ... (user's existing logic) ... */
    console.log("Score Update:", scores);
    playersInRoom.forEach((p) => {
      if (scores[p.uid] !== undefined) {
        p.score = scores[p.uid];
      }
    });
    UI.updateScoreBoard(scores, playersInRoom, myUID);
  }

  function handleStealOpportunity(data) {
    /* ... (user's existing logic) ... */
    if (currentQuestion && currentQuestion.id === data.questionId) {
      UI.resetAnswerHighlights(); // Reset before showing steal
      isStealPhaseActive = true;
      currentStealerUID = data.nextUid;
      isMyTurn = false;
      const stealerName = getPlayerName(data.nextUid);
      UI.showStealOpportunityInfo(
        stealerName,
        data.questionId,
        myUID === data.nextUid
      );
      UI.setTurnIndicator(
        `${stealerName}'s Steal Attempt!`,
        myUID === data.nextUid
      );
      UI.enableAnswerOptions(myUID === data.nextUid);
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      startClientTimer(data.stealTimeout, true);
    }
  }

  function handleStealResult(data) {
    /* ... (user's existing logic, ensure questionSummary is robust) ... */
    if (currentQuestion && currentQuestion.id === data.questionId) {
      // const stealerName = getPlayerName(data.uid); // Already available in message below
      let mySelectedIndex = -1;
      const selectedButton = Array.from(
        document.getElementById("answerOptions").children
      ).find((btn) => btn.classList.contains("pending-selection"));
      if (selectedButton) {
        mySelectedIndex = parseInt(selectedButton.dataset.index, 10);
        selectedButton.classList.remove("pending-selection");
      }
      UI.highlightAnswer(
        mySelectedIndex,
        currentQuestion.correctIndex,
        data.correct
      ); // Assumes currentQuestion.correctIndex is valid

      if (data.uid === myUID && currentQuestion) {
        // If I was the one stealing
        const originalQuestionIndexForSummary = parseInt(
          currentQuestion.id,
          10
        );
        questionSummary.push({
          question: currentQuestion.text,
          options: currentQuestion.options,
          playerAnswerIndex: mySelectedIndex,
          correctIndex: currentQuestion.correctIndex,
          questionIndex: originalQuestionIndexForSummary,
        });
      }
    }
    isStealPhaseActive = false;
    currentStealerUID = null;
    UI.enableAnswerOptions(false);
    UI.hideStealOpportunityInfo();
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function handleGameEnded(finalScores) {
    /* ... (user's existing logic for summary) ... */
    console.log("Game Ended. Final Scores:", finalScores);
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    // Build a summary for all questions based on myTurnQuestionsData
    const finalSummaryForDisplay = myTurnQuestionsData.map(
      (qData, dataIndex) => {
        const originalQuestionIndex = myTurnQuestions[dataIndex]; // The index in the overall game's question sequence
        const answeredAttempt = questionSummary.find(
          (qs) => qs.questionIndex === originalQuestionIndex
        );
        return {
          question: qData.question,
          options: qData.options,
          playerAnswerIndex: answeredAttempt
            ? answeredAttempt.playerAnswerIndex
            : null, // null if not answered
          correctIndex: qData.correctIndex,
        };
      }
    );

    UI.displayGameResults(
      finalScores,
      playersInRoom,
      myUID,
      finalSummaryForDisplay
    );
    isMyTurn = false;
    isStealPhaseActive = false;
    currentQuestion = null;
    questionSummary = []; // Reset for next game
    myTurnQuestions = [];
    myTurnQuestionsData = [];
    localStorage.removeItem("currentGameRoomId");
    localStorage.removeItem("currentGameRoomCode");
    clearPlayAgainTimeout();
  }

  function getPlayerName(uid) {
    /* ... (user's existing logic, ensure robustness for missing user.email) ... */
    const player = playersInRoom.find((p) => p.uid === uid);
    const currentUser = Auth.getCurrentUser();
    const myName = currentUser
      ? currentUser.displayName ||
        (currentUser.email ? currentUser.email.split("@")[0] : "You")
      : "You";
    return player
      ? player.name
      : uid === myUID
      ? myName
      : `Player ${uid ? uid.substring(0, 4) : "Unknown"}`;
  }

  function startClientTimer(durationSeconds, isStealTimer = false) {
    /* ... (user's existing logic) ... */
    if (timerInterval) clearInterval(timerInterval);
    let timeLeft = durationSeconds;
    currentTurnTimeoutDuration = durationSeconds;
    questionStartTime = Date.now();
    UI.updateTimer(timeLeft, isStealTimer);
    timerInterval = setInterval(() => {
      timeLeft--;
      UI.updateTimer(timeLeft, isStealTimer);
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        UI.enableAnswerOptions(false);
      }
    }, 1000);
  }

  // User's new "Play Again" logic - kept as is
  function isInRoom() {
    return currentRoomId && playersInRoom.some((p) => p.uid === myUID);
  }
  function handlePlayAgain() {
    /* ... (user's existing logic) ... */
    if (playAgainRequested) return;
    playAgainRequested = true;
    const btn = document.getElementById("backToRoomManagementButton");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-2"></span>Waiting for others...';
    }
    if (!currentRoomId) {
      UI.showView("roomManagementView");
      playAgainRequested = false;
      return;
    }

    const rejoiningNeeded = !isInRoom(); // Check if a rejoin is truly needed
    const performPlayAgainRequest = () => {
      SocketClient.emit(
        "playAgainRequest",
        { roomId: currentRoomId },
        (response) => {
          if (!response || response.status !== "ok") {
            UI.displayNotification(
              response?.message || "Failed to request new game.",
              "danger"
            );
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = "Play Again / New Game";
            }
            playAgainRequested = false;
          } else {
            startPlayAgainTimeout();
          }
        }
      );
    };

    if (rejoiningNeeded) {
      const user = Auth.getCurrentUser();
      const playerName = user
        ? user.displayName || (user.email ? user.email.split("@")[0] : "Player")
        : "Player";
      UI.displayNotification(
        "Re-establishing connection for new game...",
        "info"
      );
      SocketClient.emitJoinRoom(currentRoomCode, playerName, (response) => {
        // Use currentRoomCode
        if (response && response.status === "ok") {
          currentRoomId = response.roomId; // Update roomId if it changed (shouldn't for same room)
          performPlayAgainRequest();
        } else {
          UI.displayNotification(
            response?.message ||
              "Failed to re-join room. Please try creating/joining manually.",
            "danger"
          );
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = "Play Again / New Game";
          }
          playAgainRequested = false;
          UI.showView("roomManagementView"); // Force back if rejoin fails
        }
      });
    } else {
      performPlayAgainRequest();
    }
  }
  function startPlayAgainTimeout() {
    /* ... (user's existing logic) ... */
    clearPlayAgainTimeout();
    playAgainCountdown = 30;
    updatePlayAgainButtonCountdown();
    playAgainTimeout = setInterval(() => {
      playAgainCountdown--;
      updatePlayAgainButtonCountdown();
      if (playAgainCountdown <= 0) {
        clearPlayAgainTimeout();
        playAgainRequested = false;
        const btn = document.getElementById("backToRoomManagementButton");
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "Play Again / New Game";
        }
        UI.displayNotification(
          "Not enough players wanted to play again.",
          "warning"
        );
        setTimeout(() => {
          // Before showing room management, ensure we are in a consistent lobby state
          // This might involve re-fetching player list for the current room or resetting more fully
          if (currentRoomId) {
            // If still conceptually in a room
            UI.showView("lobbyView"); // Go back to lobby of current room
          } else {
            UI.showView("roomManagementView");
          }
        }, 1500);
      }
    }, 1000);
  }
  function updatePlayAgainButtonCountdown() {
    /* ... (user's existing logic) ... */
    const btn = document.getElementById("backToRoomManagementButton");
    if (btn && playAgainRequested && playAgainCountdown > 0) {
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Waiting for others... (${playAgainCountdown}s)`;
    }
  }
  function clearPlayAgainTimeout() {
    /* ... (user's existing logic) ... */
    if (playAgainTimeout) {
      clearInterval(playAgainTimeout);
      playAgainTimeout = null;
    }
  }

  // Expose for socketClient.js (private message handler) and potentially UI.js
  function getPlayersInRoom() {
    return playersInRoom;
  }

  // *** NEW: Handler for incoming private messages (called by SocketClient) ***
  function handlePrivateMessage(data) {
    // { fromUid, message, timestamp }
    const sender = playersInRoom.find((p) => p.uid === data.fromUid);
    const senderName = sender
      ? sender.name
      : data.fromUid === myUID
      ? "You (echo)"
      : `User ${data.fromUid.substring(0, 4)}`;

    if (typeof UI.appendLobbyChatMessage === "function") {
      UI.appendLobbyChatMessage({
        fromName: senderName,
        message: data.message,
        isOwn: data.fromUid === myUID, // Mark if it's an echo of my own sent message (if server echoes) or actual PM
        timestamp: data.timestamp,
      });
    }

    // User's notification logic (from their previous socketClient.js for privateMessage)
    const input = document.getElementById("lobbyChatInput");
    if (
      data.fromUid !== myUID && // Don't notify for my own messages
      (!document.hasFocus() || !input || document.activeElement !== input)
    ) {
      UI.displayNotification(
        `New PM from ${senderName}: ${data.message.substring(0, 30)}...`,
        "info",
        3500
      );
    }
  }

  // *** NEW: Function to initiate sending a private message (called by UI) ***
  function sendPrivateMessage(toUid, messageText) {
    if (!messageText.trim()) {
      UI.displayNotification("Cannot send an empty message.", "warning");
      return;
    }
    if (!toUid || toUid === "lobby") {
      // Assuming "lobby" means broadcast (not implemented here)
      UI.displayNotification(
        "Please select a recipient for private message.",
        "warning"
      );
      // For a general lobby chat, you'd have a different emit, e.g., 'lobbyMessage'
      console.log("Attempted to send PM to 'lobby' or no recipient.");
      return;
    }

    SocketClient.emitPrivateMessage(toUid, messageText, (response) => {
      if (response && response.status === "ok") {
        // UI.displayNotification("Private message sent.", "success", 1500); // Optional: too noisy?
        // Display my own sent message in the chat UI immediately
        if (typeof UI.appendLobbyChatMessage === "function") {
          UI.appendLobbyChatMessage({
            fromName: "You", // Or Auth.getCurrentUser()?.displayName
            toName: getPlayerName(toUid), // For display like "You to [RecipientName]:"
            message: messageText,
            isOwn: true,
            timestamp: Date.now(),
          });
        }
        // Clear the input field usually happens in the main.js listener
      } else {
        UI.displayNotification(
          response.message || "Failed to send private message.",
          "danger"
        );
      }
    });
  }

  // Event listeners setup (moved from user's DOMContentLoaded to be part of module, called from main.js if needed)
  function initLobbyChatEventListeners() {
    const sendBtn = document.getElementById("lobbyChatSendButton");
    const input = document.getElementById("lobbyChatInput");
    const select = document.getElementById("chatRecipientSelect");

    if (sendBtn && input && select) {
      sendBtn.addEventListener("click", () => {
        const message = input.value.trim();
        const toUid = select.value; // This should be the UID of the selected player
        if (!message) return;
        if (!toUid) {
          UI.displayNotification("Please select a recipient.", "warning");
          return;
        }
        if (toUid === "all") {
          // Assuming "all" is for a general lobby message (not private)
          // GameClient.sendLobbyBroadcastMessage(message); // Needs a separate mechanism
          console.log(
            "General lobby message attempt (not implemented as PM):",
            message
          );
          UI.displayNotification(
            "General lobby chat not implemented here, use PM.",
            "info"
          );
        } else {
          sendPrivateMessage(toUid, message); // Use the new GameClient function
        }
        input.value = ""; // Clear input after sending
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendBtn.click();
        }
      });
    }
  }

  // Setup event listeners that GameClient itself needs for server events via SocketClient.on
  // This replaces the direct SocketClient.on calls from user's previous DOMContentLoaded block for these events.
  // This is called from main.js typically, or after SocketClient is ready.
  function registerSocketEventListeners() {
    if (typeof SocketClient !== "undefined" && SocketClient.on) {
      SocketClient.on("playAgainStatus", (data) => {
        const btn = document.getElementById("backToRoomManagementButton");
        if (btn && playAgainRequested) {
          // Only update if I requested
          btn.disabled = true;
          btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Waiting for others... (${data.votes}/${data.totalRequired})`;
        }
      });
      SocketClient.on("playAgainFailed", (data) => {
        const btn = document.getElementById("backToRoomManagementButton");
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "Play Again / New Game";
        }
        playAgainRequested = false;
        clearPlayAgainTimeout(); // Clear any local timeout
        UI.displayNotification(
          data?.message || "Not enough players to start a new game.",
          "warning"
        );
        setTimeout(() => {
          if (currentRoomId && isInRoom()) {
            // If still in a valid room context
            UI.showView("lobbyView");
          } else {
            UI.showView("roomManagementView");
          }
        }, 1500);
      });
      // Note: `SocketClient.on('privateMessage', ...)` is handled within SocketClient.js, which calls `GameClient.handlePrivateMessage`
    } else {
      console.warn(
        "SocketClient.on not available for registering playAgain listeners yet."
      );
    }
  }

  return {
    setMyUID,
    setMySocketId,
    resetClientState,
    attemptRejoinPreviousRoom,
    handleDisconnection,

    handleCreateRoom,
    handleJoinRoom,
    handleStartGame,
    handleLeaveRoom,
    handleSubmitAnswer,

    // For SocketClient to call
    handlePlayerJoinedNotification,
    handlePlayerLeftNotification,
    handleUpdatePlayerList,
    handlePlayerOffline,
    handleGameStarted,
    handleNextTurn,
    handleAnswerResult,
    handleScoreUpdate,
    handleStealOpportunity,
    handleStealResult,
    handleGameEnded,
    handlePrivateMessage, // New: for incoming PMs

    // For UI/main.js to call
    handlePlayAgain, // User's existing function
    sendPrivateMessage, // New: for sending PMs

    // Utilities / State accessors
    isInRoom, // User's existing function
    getPlayersInRoom, // User's existing function

    // Initialization
    initLobbyChatEventListeners, // Call this from main.js after DOM is ready
    registerSocketEventListeners, // Call this from main.js after SocketClient is connected
  };
})();
