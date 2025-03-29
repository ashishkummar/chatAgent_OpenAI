async function askQuestion() {
    const question = document.getElementById("question").value;
    const responseDiv = document.getElementById("response");

    if (!question) {
        responseDiv.innerHTML = "⚠️ Please enter a question!";
        return;
    }

    responseDiv.innerHTML = "⏳ Thinking...";

    try {
        const res = await fetch("https://chatagentopenai-production.up.railway.app/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        const data = await res.json();
        responseDiv.innerHTML = `<strong>🤖 Response:</strong> ${data.answer || "No response"}`;
    } catch (error) {
        responseDiv.innerHTML = "❌ Error fetching response!";
        console.error(error);
    }
}
