document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminToggle = document.getElementById("admin-toggle");
  const adminMenu = document.getElementById("admin-menu");
  const adminLoginButton = document.getElementById("admin-login");
  const adminLogoutButton = document.getElementById("admin-logout");
  const adminStatus = document.getElementById("admin-status");
  const adminModal = document.getElementById("admin-modal");
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminCancel = document.getElementById("admin-cancel");
  const adminMessage = document.getElementById("admin-message");
  const adminNotice = document.getElementById("admin-notice");

  let adminToken = localStorage.getItem("adminToken");
  let adminUsername = localStorage.getItem("adminUsername");
  let isAdmin = false;

  function setAdminState(token, username) {
    adminToken = token;
    adminUsername = username;
    isAdmin = true;
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminUsername", username);
    updateAdminUI();
  }

  function clearAdminState() {
    adminToken = null;
    adminUsername = null;
    isAdmin = false;
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUsername");
    updateAdminUI();
  }

  function updateAdminUI() {
    if (isAdmin) {
      adminStatus.textContent = `Signed in as ${adminUsername}`;
      adminStatus.classList.remove("hidden");
      adminLoginButton.classList.add("hidden");
      adminLogoutButton.classList.remove("hidden");
      adminNotice.classList.add("hidden");
    } else {
      adminStatus.textContent = "";
      adminStatus.classList.add("hidden");
      adminLoginButton.classList.remove("hidden");
      adminLogoutButton.classList.add("hidden");
      adminNotice.classList.remove("hidden");
    }

    signupForm
      .querySelectorAll("input, select, button")
      .forEach((element) => {
        element.disabled = !isAdmin;
      });
  }

  async function verifyAdminToken() {
    if (!adminToken) {
      updateAdminUI();
      return;
    }

    try {
      const response = await fetch("/admin/verify", {
        headers: {
          "X-Admin-Token": adminToken,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAdminState(adminToken, result.username);
      } else {
        clearAdminState();
      }
    } catch (error) {
      clearAdminState();
      console.error("Error verifying admin session:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

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
                  .map((email) => {
                    const deleteButton = isAdmin
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}" type="button">Remove</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
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
      if (isAdmin) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
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
          headers: {
            "X-Admin-Token": adminToken || "",
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAdmin) {
      messageDiv.textContent = "Teacher login required to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Admin-Token": adminToken || "",
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  adminToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    adminMenu.classList.toggle("hidden");
  });

  adminMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    adminMenu.classList.add("hidden");
  });

  adminLoginButton.addEventListener("click", () => {
    adminMenu.classList.add("hidden");
    adminMessage.classList.add("hidden");
    adminLoginForm.reset();
    adminModal.classList.remove("hidden");
  });

  adminCancel.addEventListener("click", () => {
    adminModal.classList.add("hidden");
  });

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        setAdminState(result.token, result.username);
        adminModal.classList.add("hidden");
        fetchActivities();
      } else {
        adminMessage.textContent = result.detail || "Login failed.";
        adminMessage.className = "message error";
        adminMessage.classList.remove("hidden");
      }
    } catch (error) {
      adminMessage.textContent = "Login failed. Please try again.";
      adminMessage.className = "message error";
      adminMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  adminLogoutButton.addEventListener("click", async () => {
    adminMenu.classList.add("hidden");
    try {
      await fetch("/admin/logout", {
        method: "POST",
        headers: {
          "X-Admin-Token": adminToken || "",
        },
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    clearAdminState();
    fetchActivities();
  });

  // Initialize app
  verifyAdminToken().then(fetchActivities);
});
