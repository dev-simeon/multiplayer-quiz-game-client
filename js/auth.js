const Auth = (() => {
  let firebaseApp = null;
  let firebaseAuth = null;
  let firebaseUi = null;

  // TODO: Replace with your app's Firebase project configuration
 const firebaseConfig = {
    apiKey: "AIzaSyDnsjlOBMxAPgqwUIzaKjK5VzVvgpbiqE4",
    authDomain: "my-quiz-app-92722.firebaseapp.com",
    projectId: "my-quiz-app-92722",
    storageBucket: "my-quiz-app-92722.firebasestorage.app",
    messagingSenderId: "18855818405",
    appId: "1:18855818405:web:a89790901608b2bf2cc94c",
  };

  function init() {
    if (!firebaseApp) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      firebaseAuth = firebase.auth();
      firebaseUi = new firebaseui.auth.AuthUI(firebaseAuth);
    }

    firebaseAuth.onAuthStateChanged((user) => {
      onAuthStateChanged(user); // Call global handler in main.js
    });

    startFirebaseUi();
  }

  function startFirebaseUi() {
    const uiConfig = {
      callbacks: {
        signInSuccessWithAuthResult: function (authResult, redirectUrl) {
          // User successfully signed in.
          // Return type determines whether we need to redirect.
          // True to redirect, false to handle it here.
          console.log("FirebaseUI sign-in success:", authResult);
          // onAuthStateChanged will handle UI changes
          return false; // No redirect needed if handled by onAuthStateChanged
        },
        uiShown: function () {
          // The widget is rendered.
          // Hide the loader.
          // document.getElementById('loader').style.display = 'none';
        },
      },
      signInFlow: "popup", // Or 'redirect'
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.FacebookAuthProvider.PROVIDER_ID,
        // firebase.auth.TwitterAuthProvider.PROVIDER_ID, // Example
        // firebase.auth.GithubAuthProvider.PROVIDER_ID,  // Example
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        // firebase.auth.PhoneAuthProvider.PROVIDER_ID,   // Example
        // firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID // Example
        // For Apple, setup is more involved and requires specific configurations
        // on Firebase console and Apple Developer portal.
      ],
      // tosUrl and privacyPolicyUrl are recommended.
      // tosUrl: '<your-tos-url>',
      // privacyPolicyUrl: '<your-privacy-policy-url>'
    };
    const authContainer = document.getElementById("firebaseui-auth-container");
    if (authContainer) {
      firebaseUi.start("#firebaseui-auth-container", uiConfig);
    } else {
      console.warn(
        "FirebaseUI auth container not found. Auth UI will not be rendered."
      );
    }
  }

  function getCurrentUser() {
    return firebaseAuth ? firebaseAuth.currentUser : null;
  }

  async function getIdToken() {
    const user = getCurrentUser();
    if (user) {
      try {
        return await user.getIdToken(true); // true to force refresh
      } catch (error) {
        console.error("Error getting ID token:", error);
        return null;
      }
    }
    return null;
  }

  function logout() {
    if (firebaseAuth) {
      firebaseAuth
        .signOut()
        .then(() => {
          console.log("User signed out successfully.");
          // onAuthStateChanged will handle UI updates
        })
        .catch((error) => {
          console.error("Sign out error:", error);
          UI.displayNotification(
            "Error signing out: " + error.message,
            "danger"
          );
        });
    }
  }

  return {
    init,
    getCurrentUser,
    getIdToken,
    logout,
  };
})();
