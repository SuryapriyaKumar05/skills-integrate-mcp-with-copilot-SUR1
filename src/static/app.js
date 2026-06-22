document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminStatus = document.getElementById("admin-status");
  const authToggle = document.getElementById("auth-toggle");
  const authToggleLabel = document.getElementById("auth-toggle-label");
  const authModal = document.getElementById("auth-modal");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");

  let authToken = localStorage.getItem("adminAuthToken") || "";
  let adminUsername = localStorage.getItem("adminUsername") || "";

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function getAuthHeaders() {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }

  function updateAdminUI() {
    const isLoggedIn = Boolean(authToken);

    signupForm.classList.toggle("hidden", !isLoggedIn);
    logoutBtn.classList.toggle("hidden", !isLoggedIn);

    if (isLoggedIn) {
      adminStatus.textContent = `Logged in as ${adminUsername}. You can register and unregister students.`;
      adminStatus.className = "success";
      authToggleLabel.textContent = "Teacher Account";
    } else {
      adminStatus.textContent = "Only teachers can register or unregister students.";
      adminStatus.className = "info";
      authToggleLabel.textContent = "Teacher Login";
    }
  }

  function closeAuthModal() {
    authModal.classList.add("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      const isLoggedIn = Boolean(authToken);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isLoggedIn
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  authToggle.addEventListener("click", () => {
    authModal.classList.toggle("hidden");
  });

  closeModalBtn.addEventListener("click", closeAuthModal);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        adminUsername = result.username;
        localStorage.setItem("adminAuthToken", authToken);
        localStorage.setItem("adminUsername", adminUsername);
        updateAdminUI();
        closeAuthModal();
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Failed to login. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    authToken = "";
    adminUsername = "";
    localStorage.removeItem("adminAuthToken");
    localStorage.removeItem("adminUsername");
    updateAdminUI();
    closeAuthModal();
    showMessage("Logged out.", "info");
    fetchActivities();
  });

  // Initialize app
  updateAdminUI();
  fetchActivities();
});
