document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let messageTimeout;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="availability-count">${spotsLeft} spots left</span></p>
        `;

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        details.participants.forEach((participant) => {
          const participantItem = document.createElement("li");
          participantItem.className = "participant-row";

          const participantEmail = document.createElement("span");
          participantEmail.className = "participant-email";
          participantEmail.textContent = participant;
          participantItem.appendChild(participantEmail);

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "remove-participant";
          removeButton.setAttribute("aria-label", `Unregister ${participant} from ${name}`);
          removeButton.title = "Unregister participant";
          removeButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="m19 6-1 14H6L5 6" />
              <path d="M10 11v5M14 11v5" />
            </svg>
          `;
          removeButton.addEventListener("click", async () => {
            removeButton.disabled = true;
            try {
              const response = await fetch(
                `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(participant)}`,
                { method: "DELETE" }
              );
              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.detail || "Failed to unregister participant.");
              }

              details.participants.splice(details.participants.indexOf(participant), 1);
              participantItem.remove();
              participantsHeading.textContent = `Participants (${details.participants.length})`;
              activityCard.querySelector(".availability-count").textContent =
                `${details.max_participants - details.participants.length} spots left`;
              showMessage(result.message, "success");
            } catch (error) {
              removeButton.disabled = false;
              showMessage(error.message || "Failed to unregister participant. Please try again.", "error");
              console.error("Error unregistering participant:", error);
            }
          });
          participantItem.appendChild(removeButton);
          participantsList.appendChild(participantItem);
        });
        participantsSection.appendChild(participantsList);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      return true;
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
      return false;
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        signupForm.reset();
        const refreshed = await fetchActivities();
        showMessage(
          refreshed ? result.message : `${result.message}. The activity list could not be refreshed.`,
          refreshed ? "success" : "error"
        );
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
