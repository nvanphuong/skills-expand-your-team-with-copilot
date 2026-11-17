export function getActivityId(name) {
  return `activity-${encodeURIComponent(name)}`;
}

export function createActivitySharing(name) {
  // Keep filters and other page parameters out of links sent to friends.
  const url = new URL(window.location.pathname, window.location.origin);
  url.hash = encodeURIComponent(getActivityId(name));
  const activityUrl = url.href;
  const title = `${name} at Mergington High School`;
  const text = `Check out ${title}!`;

  const sharing = document.createElement("div");
  sharing.className = "activity-sharing";
  sharing.setAttribute("role", "group");
  sharing.setAttribute("aria-label", `Share ${name}`);

  const label = document.createElement("span");
  label.className = "share-label";
  label.textContent = "Share activity:";
  sharing.appendChild(label);

  const destinations = [
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activityUrl)}`],
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${text} ${activityUrl}`)}`],
    ["Email", `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${activityUrl}`)}`],
  ];

  destinations.forEach(([label, href]) => {
    const link = document.createElement("a");
    link.className = "share-button";
    link.textContent = label;
    link.href = href;
    link.setAttribute("aria-label", `Share ${name} via ${label}`);
    if (!href.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    sharing.appendChild(link);
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "share-button";
  copyButton.textContent = "Copy link";
  copyButton.setAttribute("aria-label", `Copy link to ${name}`);
  sharing.appendChild(copyButton);

  const manualLink = document.createElement("input");
  manualLink.type = "text";
  manualLink.readOnly = true;
  manualLink.value = activityUrl;
  manualLink.className = "share-link hidden";
  manualLink.setAttribute("aria-label", `Link to ${name}`);
  sharing.appendChild(manualLink);

  const status = document.createElement("span");
  status.className = "share-status";
  status.setAttribute("role", "status");
  sharing.appendChild(status);

  copyButton.addEventListener("click", async () => {
    if (!navigator.clipboard?.writeText) {
      showManualLink();
      return;
    }

    try {
      await navigator.clipboard.writeText(activityUrl);
      manualLink.classList.add("hidden");
      status.textContent = "Link copied!";
    } catch (error) {
      console.error("Could not copy activity link:", error);
      showManualLink();
    }
  });

  function showManualLink() {
    status.textContent = "Automatic copying is unavailable. Select and copy the link below.";
    manualLink.classList.remove("hidden");
    manualLink.focus();
    manualLink.select();
  }

  return sharing;
}
