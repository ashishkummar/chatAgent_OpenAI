async function askQuestion() {
    const question = document.getElementById("question").value;
    const responseDiv = document.getElementById("response");
    const askButton = document.querySelector("#inputArea button");

    if (!question) {
        responseDiv.innerHTML += `<div class="error-message">⚠️ Please enter a question!</div>`;
        responseDiv.scrollTop = responseDiv.scrollHeight; // Auto-scroll
        return;
    }

    // Disable button and show thinking state
    askButton.disabled = true;
    askButton.innerHTML = "⏳ Thinking...";

    // Append user's question in chat UI
    responseDiv.innerHTML += `<div class="user-message">${question}</div>`;
    responseDiv.scrollTop = responseDiv.scrollHeight; // Auto-scroll

    try {
        const res = await fetch("https://chatagentopenai-production.up.railway.app/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        if (!res.ok) {
            throw new Error(`HTTP Error! Status: ${res.status}`);
        }

        const data = await res.json();

        if (!data.refinedAnswer) {
            throw new Error("Invalid response format!");
        }

        // Append AI response below the question
        responseDiv.innerHTML += `<div class="ai-message">${refineMessage(data.refinedAnswer)}</div>`;
    } catch (error) {
        responseDiv.innerHTML += `<div class="error-message">❌ Error: ${error.message}</div>`;
        console.error("Fetch Error:", error);
    } finally {
        // Re-enable button after response/error
        askButton.disabled = false;
        askButton.innerHTML = "Ask";
        document.getElementById("question").value = ""; // Clear input field after sending

        responseDiv.scrollTop = responseDiv.scrollHeight; // Auto-scroll after response
    }
}


// Function to format responses (Markdown-like styling)
function refineMessage(msg) {
    const matches = msg.match(/```(js|javascript)([\s\S]*?)```/g);
    if (matches) {
        matches.forEach(match => {
            const jsCode = match.replace(/```(js|javascript)|```/g, "").trim();
            const jsWrapped = `<div class="code-container"><pre><code class="language-js">${jsCode}</code></pre></div>`;
            msg = msg.replace(match, jsWrapped);
        });
    }
    msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
    msg = msg.replace(/\n/g, "<br>");
    return msg;
}
