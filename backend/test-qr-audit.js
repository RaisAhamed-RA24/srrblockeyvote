
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste your admin JWT token: ", async (token) => {
  rl.question("Enter the voter's users.id: ", async (userIdInput) => {
    rl.close();

    const userId = Number(userIdInput.trim());

    if (!token.trim() || !Number.isSafeInteger(userId) || userId <= 0) {
      console.error("Invalid token or user ID.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/identity/${userId}/qr-audit`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token.trim()}`,
          },
        }
      );

      const result = await response.json();

      console.log("\nHTTP status:", response.status);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Request failed:", error.message);
    }
  });
});
