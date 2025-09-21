async function login() {
  const identifier = document.getElementById("username").value.trim(); // Can be username or email
  const password = document.getElementById("password").value.trim();

  if (!identifier || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }) // Changed from 'username' to 'identifier'
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user_id", data.user.user_id);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("pubkey", data.user.pubkey);
      window.location.href = "chat.html";
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}

async function register() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("Please fill in all fields");
    return;
  }

  // For SOCP compliance, we need to generate RSA keys
  try {
    // Show loading message
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = "Generating keys...";
    button.disabled = true;

    // Generate RSA-4096 key pair (this would be done client-side in real implementation)
    // For now, let the server generate them
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username, 
        email: username + "@local.test", // Temporary email for testing
        password 
        // pubkey and privkey_store will be generated server-side for now
      })
    });

    const data = await res.json();
    
    button.textContent = originalText;
    button.disabled = false;

    if (res.ok) {
      alert("Registration successful! You can now log in.");
    } else {
      alert(data.error || "Registration failed");
    }
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}