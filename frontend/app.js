async function askQuestion() {
    const question = document.getElementById("question").value;
    const responseDiv = document.getElementById("response");
    const askButton = document.querySelector("#inputArea button");

    if (!question) {
        responseDiv.innerHTML += `<div class="error-message">⚠️ Please enter a question!</div>`;
        smoothScroll(responseDiv);
        return;
    }

    // Disable button and show thinking state
    askButton.disabled = true;
    askButton.innerHTML = "⏳ Thinking...";

    // Append user's question in chat UI
    responseDiv.innerHTML += `<div class="user-message">${question}</div>`;
    smoothScroll(responseDiv);

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

        smoothScroll(responseDiv);
    }
}

// Smooth scrolling function (prevents main page movement)
function smoothScroll(element) {
    const start = element.scrollTop;
    const end = element.scrollHeight;
    const duration = 500; // Adjust for faster/slower animation
    const startTime = performance.now();

    function animateScroll(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        element.scrollTop = start + (end - start) * progress;

        if (progress < 1) {
            requestAnimationFrame(animateScroll);
        }
    }

    requestAnimationFrame(animateScroll);
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
