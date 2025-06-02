// public/js/ui.js
const UI = (() => {
  // Cache DOM elements that are frequently updated
  const elements = {
    authView: document.getElementById("authView"),
    roomManagementView: document.getElementById("roomManagementView"),
    lobbyView: document.getElementById("lobbyView"),
    gameView: document.getElementById("gameView"),
    resultsView: document.getElementById("resultsView"),

    userInfo: document.getElementById("userInfo"),
    logoutButton: document.getElementById("logoutButton"),
    playerNameDisplay: document.getElementById("playerNameDisplay"),

    lobbyRoomCode: document.getElementById("lobbyRoomCode"),
    playerList: document.getElementById("playerList"),
    playerCount: document.getElementById("playerCount"),
    startGameButton: document.getElementById("startGameButton"),

    // Lobby Chat elements (if you add dedicated chat UI)
    lobbyChatMessages: document.getElementById("lobbyChatMessages"), // Assuming you add this ID for chat messages display
    chatRecipientSelect: document.getElementById("chatRecipientSelect"), // Already used by your updatePlayerList
    lobbyChatInput: document.getElementById("lobbyChatInput"), // For reference, GameClient/main.js handles its events
    lobbyChatSendButton: document.getElementById("lobbyChatSendButton"), // For reference

    turnIndicator: document.getElementById("turnIndicator"),
    timerDisplay: document.getElementById("timerDisplay"),
    questionArea: document.getElementById("questionArea"),
    questionText: document.getElementById("questionText"),
    answerOptions: document.getElementById("answerOptions"),
    currentPlayerAvatar: document.getElementById("currentPlayerAvatar"), // From your displayQuestion
    stealPhaseInfo: document.getElementById("stealPhaseInfo"),
    scoreBoard: document.getElementById("scoreBoard"),
    currentQuestionNumber: document.getElementById("currentQuestionNumber"),
    totalQuestionCount: document.getElementById("totalQuestionCount"),

    finalScoreBoard: document.getElementById("finalScoreBoard"),
    summaryQuestions: document.getElementById("summaryQuestions"), // From your displayGameResults

    // Notification elements (though your new toast logic uses a dynamic container)
    // notificationArea: document.getElementById("notificationArea"),
    // notificationMessage: document.getElementById("notificationMessage"),
    toastContainer: document.getElementById("toastContainer"), // For Bootstrap toasts
  };

  let currentVisibleView = elements.authView;
  // let notificationTimeout = null; // Not needed with Bootstrap toasts managing their own timeouts

  function showView(viewName) {
    // Your existing logic for clearing lobby chat when leaving lobbyView
    if (
      currentVisibleView &&
      currentVisibleView.id === "lobbyView" && // Check by ID for robustness
      elements[viewName] &&
      elements[viewName].id !== "lobbyView"
    ) {
      clearLobbyChat(); // Call your function
    }

    if (currentVisibleView) {
      currentVisibleView.style.display = "none";
    }
    const newView = elements[viewName] || document.getElementById(viewName); // Fallback if not in cache but ID exists
    if (newView) {
      newView.style.display = "block";
      currentVisibleView = newView;
    } else {
      console.error("View not found:", viewName);
    }
  }

  function updateUserInfo(user) {
    /* ... (your existing code - looks good) ... */
    if (user) {
      elements.userInfo.textContent = `Logged in as: ${
        user.displayName || user.email
      }`;
      elements.logoutButton.style.display = "inline-block";
      if (elements.playerNameDisplay)
        elements.playerNameDisplay.textContent =
          user.displayName || user.email.split("@")[0];
    } else {
      elements.userInfo.textContent = "Not logged in";
      elements.logoutButton.style.display = "none";
    }
  }

  // Your excellent Bootstrap Toast notification system
  function displayNotification(message, type = "info", duration = 3000) {
    /* ... (your existing code - looks great) ... */
    const toastContainer =
      elements.toastContainer || document.getElementById("toastContainer"); // Use cached or find
    if (!toastContainer) {
      console.warn("Toast container not found for notification:", message);
      // Fallback to console or simple alert if toast container is missing
      alert(`${type.toUpperCase()}: ${message}`);
      return;
    }

    const typeToBg = {
      success: "bg-success text-white",
      info: "bg-info text-dark", // Adjusted for better contrast with white text potentially
      warning: "bg-warning text-dark",
      danger: "bg-danger text-white",
      secondary: "bg-secondary text-white", // For chat/PMs if needed
    };
    const bgClass = typeToBg[type] || typeToBg.info;
    const toastId = `toast-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const toast = document.createElement("div");
    toast.className = `toast align-items-center ${bgClass} border-0`; // Added border-0
    toast.id = toastId;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    toastContainer.appendChild(toast);
    const toastInstance = bootstrap.Toast.getOrCreateInstance(toast, {
      delay: duration,
      autohide: duration > 0,
    });
    toastInstance.show();
    toast.addEventListener("hidden.bs.toast", () => {
      toast.remove();
    });
  }

  function setLobbyRoomCode(code) {
    /* ... (your existing code - looks good) ... */
    if (elements.lobbyRoomCode)
      elements.lobbyRoomCode.textContent = code || "----";
  }

  function copyRoomCodeToClipboard() {
    /* ... (your existing code - looks good) ... */
    const roomCode = elements.lobbyRoomCode.textContent;
    if (roomCode && roomCode !== "----") {
      navigator.clipboard
        .writeText(roomCode)
        .then(() => {
        })
        .catch((err) => {
          console.error("Failed to copy room code: ", err);
          displayNotification("Failed to copy room code.", "warning");
        });
    }
  }

  // updatePlayerList now also correctly calls updateLobbyChatRecipientList
  function updatePlayerList(players, myUID, hostUID) {
    /* ... (your existing code including chat recipient update - looks good) ... */
    if (!elements.playerList) return;
    elements.playerList.innerHTML = "";
    players.forEach((player) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";
      li.dataset.uid = player.uid; // Add UID for potential interaction later (e.g. click to PM)
      li.textContent = player.name || player.uid;
      if (player.uid === myUID) {
        li.textContent += " (You)";
        li.classList.add("active");
      }
      if (player.uid === hostUID) {
        const hostBadge = document.createElement("span");
        hostBadge.className = "badge bg-primary rounded-pill ms-2";
        hostBadge.textContent = "Host";
        li.appendChild(hostBadge);
      }
      if (player.online === false) {
        const offlineBadge = document.createElement("span");
        offlineBadge.className = "badge bg-secondary rounded-pill ms-2";
        offlineBadge.textContent = "Offline";
        li.appendChild(offlineBadge);
      }
      elements.playerList.appendChild(li);
    });
    if (elements.playerCount) elements.playerCount.textContent = players.length;
    updateLobbyChatRecipientList(players, myUID); // Call your integrated function
  }

  function toggleStartGameButton(enable, isHost) {
    /* ... (your existing code - looks good) ... */
    if (elements.startGameButton) {
      elements.startGameButton.disabled = !enable;
      elements.startGameButton.style.display = isHost ? "block" : "none";
      if (!enable && isHost) {
        elements.startGameButton.textContent = "Start Game (Need 2+ players)";
      } else if (enable && isHost) {
        elements.startGameButton.textContent = "Start Game!";
      }
    }
  }

  function getInitials(nameOrEmail) {
    /* ... (your existing code - looks good) ... */
    if (!nameOrEmail) return "?";
    const name = nameOrEmail.split("@")[0];
    const parts = name.split(/\s|\./).filter(Boolean);
    if (parts.length === 0) return "?"; // Handle empty name after split
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function displayQuestion(questionObj, isMyTurnToAnswer) {
    /* ... (your existing code including avatar - looks good) ... */
    if (!elements.questionText || !elements.answerOptions) return;
    elements.questionText.innerHTML = questionObj.text;
    elements.answerOptions.innerHTML = "";

    const avatarEl =
      elements.currentPlayerAvatar ||
      document.getElementById("currentPlayerAvatar");
    if (avatarEl) {
      const user = Auth.getCurrentUser(); // Auth should be accessible
      let initials = "?";
      if (user) {
        initials = getInitials(user.displayName || user.email);
      }
      avatarEl.textContent = initials;
    }

    questionObj.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "list-group-item list-group-item-action answer-option";
      button.innerHTML = option;
      button.dataset.index = index;
      button.disabled = !isMyTurnToAnswer;
      elements.answerOptions.appendChild(button);
    });
  }

  function updateTimer(seconds, isSteal = false) {
    /* ... (your existing code - looks good) ... */
    if (!elements.timerDisplay) return;
    const prefix = isSteal ? "Steal Time: " : "Time Left: ";
    elements.timerDisplay.textContent = `${prefix}${seconds}s`;
    if (seconds <= 5 && seconds > 0) {
      elements.timerDisplay.classList.add("text-danger");
    } else {
      elements.timerDisplay.classList.remove("text-danger");
    }
  }

  function updateScoreBoard(scores, playersList, myUID) {
    /* ... (your existing code - looks good) ... */
    if (!elements.scoreBoard) return;
    elements.scoreBoard.innerHTML = "";
    if (!playersList || playersList.length === 0) {
      console.warn("Player list not available for scoreboard update");
      Object.entries(scores).forEach(([uid, score]) => {
        const li = document.createElement("li");
        li.className =
          "list-group-item d-flex justify-content-between align-items-center";
        li.textContent = `${uid}: ${score}`;
        if (uid === myUID) li.classList.add("fw-bold");
        elements.scoreBoard.appendChild(li);
      });
      return;
    }
    playersList.forEach((player) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center";
      const playerName = player.name || player.uid;
      const playerScore =
        scores[player.uid] !== undefined ? scores[player.uid] : "N/A";
      li.textContent = `${playerName}: ${playerScore}`;
      if (player.uid === myUID) {
        li.classList.add("fw-bold");
      }
      elements.scoreBoard.appendChild(li);
    });
  }

  function setTurnIndicator(message, isMyTurn) {
    /* ... (your existing code - looks good) ... */
    if (!elements.turnIndicator) return;
    elements.turnIndicator.textContent = message;
    if (isMyTurn) {
      elements.turnIndicator.classList.add("active-turn", "text-primary");
    } else {
      elements.turnIndicator.classList.remove("active-turn", "text-primary");
    }
  }

  function showStealOpportunityInfo(stealerName, questionId, isMyStealAttempt) {
    /* ... (your existing code - looks good) ... */
    if (!elements.stealPhaseInfo) return;
    elements.stealPhaseInfo.innerHTML = `<strong>Steal Opportunity!</strong> ${stealerName}, it's your chance to steal question!`;
    elements.stealPhaseInfo.style.display = "block";
  }

  function hideStealOpportunityInfo() {
    /* ... (your existing code - looks good) ... */
    if (elements.stealPhaseInfo) elements.stealPhaseInfo.style.display = "none";
  }

  function highlightAnswer(selectedIndex, correctIndex, wasPlayerCorrect) {
    /* ... (your existing code - looks good) ... */
    const options = elements.answerOptions.querySelectorAll(".answer-option");
    options.forEach((button, index) => {
      button.disabled = true;
      if (index === correctIndex) {
        button.classList.add("correct");
      } else if (index === selectedIndex && !wasPlayerCorrect) {
        button.classList.add("incorrect");
      }
    });
  }

  function resetAnswerHighlights() {
    /* ... (your existing code - looks good) ... */
    const options = elements.answerOptions.querySelectorAll(".answer-option");
    options.forEach((button) => {
      button.classList.remove("correct", "incorrect");
    });
  }

  function enableAnswerOptions(enable) {
    /* ... (your existing code - looks good) ... */
    const options = elements.answerOptions.querySelectorAll(".answer-option");
    options.forEach((button) => {
      button.disabled = !enable;
    });
  }

  // Your excellent and very detailed displayGameResults function
  function displayGameResults(
    finalScores,
    playersList,
    myUID,
    questionSummary
  ) {
    /* ... (your existing comprehensive code - looks fantastic!) ... */
    if (!elements.finalScoreBoard) return;

    // Clear previous dynamic content
    const oldConfetti = document.getElementById("confettiCanvas");
    if (oldConfetti) oldConfetti.remove();
    const oldOverview = document.getElementById("overviewCard");
    if (oldOverview) oldOverview.remove();
    const summaryDiv =
      elements.summaryQuestions || document.getElementById("summaryQuestions");
    if (summaryDiv) summaryDiv.innerHTML = ""; // Clear question summary area

    // --- Quick Overview Card ---
    const myPlayer = playersList.find((p) => p.uid === myUID);
    const myScore = myPlayer ? finalScores[myUID] ?? myPlayer.score ?? 0 : 0;
    const sorted = playersList
      .map((p) => ({
        name: p.name || p.uid,
        score: finalScores[p.uid] !== undefined ? finalScores[p.uid] : 0,
        uid: p.uid,
      }))
      .sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((p) => p.uid === myUID) + 1;
    const totalPlayers = sorted.length;
    const maxScore = sorted.length > 0 ? sorted[0].score : 1; // Avoid division by zero if maxScore is 0
    const scorePercent =
      maxScore > 0
        ? Math.round((myScore / maxScore) * 100)
        : myScore > 0
        ? 100
        : 0; // Handle if maxScore is 0 but myScore > 0

    const scoresArr = sorted.map((p) => p.score);
    const topScore = Math.max(0, ...scoresArr); // Ensure topScore is at least 0
    const numWithTopScore = sorted.filter((p) => p.score === topScore).length;
    const isTiedForFirst =
      myScore === topScore && numWithTopScore > 1 && topScore > 0; // Only a tie if score > 0
    const isSoleWinner =
      myScore === topScore && numWithTopScore === 1 && topScore > 0; // Only a winner if score > 0
    const minScore = Math.min(...scoresArr);
    const numWithMinScore = sorted.filter((p) => p.score === minScore).length;
    const isSoleLast =
      myScore === minScore &&
      numWithMinScore === 1 &&
      myRank === totalPlayers &&
      totalPlayers > 1;

    if (isSoleWinner || isTiedForFirst) {
      // Confetti for winners or tied first
      launchConfetti();
    }

    const myName = myPlayer ? myPlayer.name : "You";
    const myInitials = getInitials(myName);

    const overviewCard = document.createElement("div");
    overviewCard.className =
      "card mb-4 shadow-sm border-0 animate__animated animate__fadeInDown";
    overviewCard.id = "overviewCard";
    overviewCard.innerHTML = `
      <div class="card-body text-center">
        <div class="d-flex justify-content-center align-items-center mb-2 gap-2">
          <div class="avatar bg-gradient-primary text-white rounded-circle shadow me-2" style="width:48px; height:48px; font-size:1.3rem; display:flex; align-items:center; justify-content:center;">${myInitials}</div>
          <div class="text-start">
            <h3 class="fw-bold mb-1">Your Results</h3>
            <div class="d-flex flex-row align-items-center justify-content-center gap-2 flex-wrap">
              <span class="badge bg-primary fs-6" data-bs-toggle="tooltip" title="Your rank among all players">${
                isTiedForFirst
                  ? "Tied for 1st!"
                  : isSoleWinner
                  ? "Winner!"
                  : `Rank: ${myRank} / ${totalPlayers}`
              }</span>
              <span class="badge bg-success fs-5 px-3 py-2">Score: ${myScore}</span>
            </div>
          </div>
        </div>
        <div class="d-flex flex-column align-items-center mb-2 mt-2">
          <div class="progress w-75" style="height: 8px;">
            <div class="progress-bar bg-success" role="progressbar" style="width: ${scorePercent}%; transition: width 1s;" aria-valuenow="${scorePercent}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          <div class="text-muted small mt-1">
            ${
              isSoleWinner
                ? "🏆 You are the champion!"
                : isTiedForFirst
                ? "It's a tie for first place! Well fought."
                : isSoleLast
                ? "Better luck next time!"
                : "Good effort!"
            }
          </div>
        </div>
      </div>
    `;
    const resultsViewContainer =
      elements.resultsView || document.getElementById("resultsView");
    resultsViewContainer.insertBefore(
      overviewCard,
      resultsViewContainer.firstChild
    ); // Insert at the top of results view

    if (window.bootstrap && typeof bootstrap.Tooltip === "function") {
      // Check for Tooltip constructor
      setTimeout(() => {
        const tooltipTriggerList = [].slice.call(
          document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
          new bootstrap.Tooltip(tooltipTriggerEl);
        });
      }, 100);
    }

    elements.finalScoreBoard.className = "list-group mb-4";
    elements.finalScoreBoard.innerHTML = "";
    sorted.forEach((player, idx) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item d-flex justify-content-between align-items-center" +
        (player.uid === myUID ? " active" : "");
      li.innerHTML = `<span>${idx + 1}. ${
        player.name
      }</span><span class='fw-bold'>${player.score}</span>`;
      elements.finalScoreBoard.appendChild(li);
    });

    // --- Question Summary Cards ---
    if (
      summaryDiv &&
      Array.isArray(questionSummary) &&
      questionSummary.length > 0
    ) {
      const grid = document.createElement("div");
      grid.className = "row row-cols-1 row-cols-md-2 g-4";
      questionSummary.forEach((q, i) => {
        const card = document.createElement("div");
        card.className = "col";
        let cardBorder = "border-secondary";
        let cardHeaderHTML = ""; // Changed to cardHeaderHTML to avoid conflict
        let playerIcon = "",
          playerText = "",
          playerClass = "",
          playerTooltip = "";
        let correctIcon = "",
          correctText = "",
          correctClass = "";

        if (
          typeof q.playerAnswerIndex === "number" &&
          q.options[q.playerAnswerIndex] !== undefined
        ) {
          playerText = q.options[q.playerAnswerIndex];
          if (
            q.correctIndex !== null &&
            q.playerAnswerIndex === q.correctIndex
          ) {
            playerIcon = `<i class='bi bi-check-circle-fill text-success me-1' aria-label='Correct'></i>`;
            playerClass = "text-success fw-bold";
            playerTooltip = "You answered correctly";
            cardBorder = "border-success";
            cardHeaderHTML = `<div class='card-header bg-success text-white fw-bold'>Correct</div>`;
          } else {
            playerIcon = `<i class='bi bi-x-circle-fill text-danger me-1' aria-label='Incorrect'></i>`;
            playerClass = "text-danger";
            playerTooltip = "You answered incorrectly"; // Removed fw-bold for incorrect
            cardBorder = "border-danger";
            cardHeaderHTML = `<div class='card-header bg-danger text-white fw-bold'>Incorrect</div>`;
          }
        } else {
          playerIcon = `<i class='bi bi-dash-circle-fill text-secondary me-1' aria-label='Unanswered'></i>`;
          playerText = "Not Answered";
          playerClass = "text-secondary";
          playerTooltip = "You did not answer";
          cardBorder = "border-secondary";
          cardHeaderHTML = `<div class='card-header bg-secondary text-white fw-bold'>Unanswered</div>`;
        }
        if (
          typeof q.correctIndex === "number" &&
          q.options[q.correctIndex] !== undefined
        ) {
          correctIcon = `<i class='bi bi-check-circle-fill text-success me-1' aria-label='Correct answer'></i>`;
          correctText = q.options[q.correctIndex];
          correctClass = "text-success fw-bold";
        } else {
          correctIcon = `<i class='bi bi-dash-circle-fill text-secondary me-1' aria-label='No correct answer'></i>`;
          correctText = "-";
          correctClass = "text-secondary";
        }
        card.innerHTML = `
          <div class="card h-100 shadow-sm ${cardBorder} animate__animated animate__fadeInUp question-summary-card" style="animation-delay: ${
          i * 0.08
        }s;">
            ${cardHeaderHTML}
            <div class="card-body">
              <div class="mb-2">
                <span class="badge bg-primary me-2">Q${i + 1}</span>
                <span class="fw-semibold" title="${q.question}">${
          q.question.length > 70
            ? q.question.substring(0, 67) + "..."
            : q.question
        }</span>
              </div>
              <div class="mb-2">
                <span class="fw-semibold">Your Answer:</span>
                <span class="${playerClass}" title="${playerTooltip}">${playerIcon}${
          playerText.length > 30
            ? playerText.substring(0, 27) + "..."
            : playerText
        }</span>
              </div>
              <div>
                <span class="fw-semibold">Correct Answer:</span>
                <span class="${correctClass}">${correctIcon}${
          correctText.length > 30
            ? correctText.substring(0, 27) + "..."
            : correctText
        }</span>
              </div>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
      summaryDiv.appendChild(grid);
    } else if (summaryDiv) {
      summaryDiv.innerHTML =
        '<div class="alert alert-light text-muted small">No question-by-question summary available for your answers.</div>';
    }
    showView("resultsView");
  }

  function launchConfetti() {
    /* ... (your existing code - looks good) ... */
    if (window.confetti) {
      window.confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.id = "confettiCanvas";
    canvas.style.position = "fixed";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "2000";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    const emojis = ["🎉", "✨", "🥳", "🎊", "⭐", "🏆"];
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: -30 - Math.random() * 60,
      vy: 2 + Math.random() * 3,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      size: 28 + Math.random() * 20,
      rot: Math.random() * Math.PI * 2,
      vx: Math.random() * 4 - 2, // slight horizontal movement
    }));
    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.save();
        ctx.font = `${p.size}px serif`;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + frame * (p.vx > 0 ? 0.01 : -0.01)); // Rotate based on horizontal direction
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
        p.y += p.vy;
        p.x += p.vx;
        if (p.y > height + 40 || p.x < -40 || p.x > width + 40) {
          // Reset if off screen
          p.y = -30 - Math.random() * 40;
          p.x = Math.random() * width;
          p.vx = Math.random() * 4 - 2;
        }
      });
      frame++;
      if (frame < 180) {
        requestAnimationFrame(draw);
      } // Longer animation
      else {
        canvas.remove();
      }
    }
    draw();
  }

  function updateGameProgress(currentQ, totalQ) {
    /* ... (your existing code - looks good) ... */
    if (!elements.currentQuestionNumber || !elements.totalQuestionCount) return;
    const clampedCurrent = Math.min(Math.max(currentQ, 1), totalQ);
    elements.currentQuestionNumber.textContent = clampedCurrent;
    elements.totalQuestionCount.textContent = totalQ;
  }

  // --- Lobby Chat UI Functions ---
  function appendLobbyChatMessage({
    fromName,
    toName,
    message,
    isOwn,
    timestamp,
  }) {
    const chatBox =
      elements.lobbyChatMessages ||
      document.getElementById("lobbyChatMessages");
    if (!chatBox) {
      console.warn("Lobby chat message area not found.");
      // Fallback to a general notification for PMs if chat area is missing
      if (!isOwn)
        displayNotification(`PM from ${fromName}: ${message}`, "secondary");
      return;
    }

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("lobby-chat-message", "p-2", "mb-1", "rounded");

    let timeStr = "";
    if (timestamp) {
      const date = new Date(timestamp);
      timeStr = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // Explicitly request 12-hour format
        hourCycle: 'h12' // Ensure consistent 12-hour cycle
      });
    }

    let messagePrefix = "";
    if (isOwn) {
      msgDiv.classList.add("text-end", "bg-light"); // Align own messages to the right, light background
      messagePrefix = toName
        ? `<span class="fw-bold">You to ${toName}:</span> `
        : `<span class="fw-bold">You:</span> `;
    } else {
      msgDiv.classList.add("text-start", "border"); // Other messages on left, with a border
      messagePrefix = `<span class="fw-bold">${fromName}:</span> `;
    }

    msgDiv.innerHTML = `${messagePrefix}${message} <span class="text-muted small ms-2 fst-italic">${timeStr}</span>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
  }

  function clearLobbyChat() {
    const chatBox =
      elements.lobbyChatMessages ||
      document.getElementById("lobbyChatMessages");
    if (chatBox) chatBox.innerHTML = "";
  }

  function updateLobbyChatRecipientList(players, myUID) {
    const chatSelect =
      elements.chatRecipientSelect ||
      document.getElementById("chatRecipientSelect");
    if (!chatSelect) return;

    const currentValue = chatSelect.value; // Preserve current selection if possible
    chatSelect.innerHTML = ""; // Clear existing options

    // Option for Lobby (general chat - if you implement it)
    // const lobbyOpt = document.createElement("option");
    // lobbyOpt.value = "lobby"; // Or a special broadcast ID
    // lobbyOpt.textContent = "Lobby (Everyone)";
    // chatSelect.appendChild(lobbyOpt);

    let firstRecipientValue = null;
    players.forEach((player) => {
      if (player.uid !== myUID && player.online) {
        // Only list online players other than myself
        const opt = document.createElement("option");
        opt.value = player.uid;
        opt.textContent = player.name || player.uid;
        chatSelect.appendChild(opt);
        if (!firstRecipientValue) firstRecipientValue = player.uid;
      }
    });

    // Try to restore previous selection or select the first available recipient
    if (
      players.some((p) => p.uid === currentValue && p.uid !== myUID && p.online)
    ) {
      chatSelect.value = currentValue;
    } else if (firstRecipientValue) {
      chatSelect.value = firstRecipientValue;
    }
    // else if (lobbyOpt.value) { // If lobby option exists and no specific player
    //     chatSelect.value = lobbyOpt.value;
    // }
  }

  return {
    showView,
    updateUserInfo,
    displayNotification,
    setLobbyRoomCode,
    copyRoomCodeToClipboard,
    updatePlayerList,
    toggleStartGameButton,
    displayQuestion,
    updateTimer,
    updateScoreBoard,
    setTurnIndicator,
    showStealOpportunityInfo,
    hideStealOpportunityInfo,
    highlightAnswer,
    resetAnswerHighlights,
    enableAnswerOptions,
    displayGameResults,
    updateGameProgress,
    // Chat related UI functions
    appendLobbyChatMessage,
    clearLobbyChat,
    updateLobbyChatRecipientList,
  };
})();
