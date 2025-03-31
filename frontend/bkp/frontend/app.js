// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore, collection, addDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCTthotYUGbiIQxiH6CuP9l7MZVJxJUY6o",
    authDomain: "chat-agent-openai.firebaseapp.com",
    projectId: "chat-agent-openai",
    storageBucket: "chat-agent-openai.firebasestorage.app",
    messagingSenderId: "245533128903",
    appId: "1:245533128903:web:414320f666e8efaf6526e2"
};
 
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("askButton").addEventListener("click", askQuestion);
});

async function askQuestion() {
    const question = document.getElementById("question").value.trim();
    const responseDiv = document.getElementById("response");
    const askButton = document.getElementById("askButton");

    if (!question) {
        responseDiv.innerHTML += `<div class="error-message">⚠️ Please enter a question!</div>`;
        smoothScroll(responseDiv);
        return;
    }

    askButton.disabled = true;
    askButton.innerHTML = "⏳ Thinking...";
    responseDiv.innerHTML += `<div class="user-message">${question}</div>`;
    smoothScroll(responseDiv);

    try {
        const res = await fetch("https://chatagentopenai-production.up.railway.app/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        if (!res.ok) throw new Error(`HTTP Error! Status: ${res.status}`);

        const data = await res.json();
        if (!data.refinedAnswer) throw new Error("Invalid response format!");

        const aiResponse = refineMessage(data.refinedAnswer);
              //aiResponse = marked.parse(aiResponse)

        const docRef = await addDoc(collection(db, "chatHistory"), { 
            question, 
            response: data.refinedAnswer, 
            timestamp: new Date()
        });

        const responseId = docRef.id;
       
        responseDiv.innerHTML += `
            <div class="ai-message" data-id="${responseId}">
                ${aiResponse}
                <div class="feedback">
                    <span class="thumbs-up" onclick="saveFeedback('${responseId}', 'Satisfied with answer')">👍</span>
                    <span class="thumbs-down" onclick="openFeedbackModal('${responseId}')">👎</span>
                </div>
            </div>`;

    } catch (error) {
        responseDiv.innerHTML += `<div class="error-message">❌ Error: ${error.message}</div>`;
        console.error("Fetch Error:", error);
    } finally {
        askButton.disabled = false;
        askButton.innerHTML = "Ask";
        smoothScroll(responseDiv);
    }
}

window.saveFeedback = async function (responseId, userReaction) {
    if (!responseId || !userReaction) {
        console.error("Invalid feedback data:", responseId, userReaction);
        alert("Error: Invalid feedback data.");
        return;
    }
    try {
        const feedbackRef = doc(db, "chatHistory", responseId);
        await setDoc(feedbackRef, { userReaction, timestamp: new Date() }, { merge: true });
        alert("Feedback submitted! ✅");
    } catch (error) {
        console.error("Firestore Error:", error);
        alert("Error submitting feedback.");
    }
};

window.openFeedbackModal = function (responseId) {
    document.getElementById("feedbackModal").style.display = "block";
    document.getElementById("submitFeedback").setAttribute("data-id", responseId);
    
    // Auto-save "disliked" when user opens modal
    saveFeedback(responseId, "disliked");
};

window.submitFeedback = async function () {
    const responseId = document.getElementById("submitFeedback").getAttribute("data-id");
    const feedbackText = document.getElementById("feedbackText").value.trim();

    if (feedbackText) {
        await saveFeedback(responseId, `disliked:${feedbackText}`);
    }
    document.getElementById("feedbackModal").style.display = "none";
    alert("Thank you for your feedback! 🚀");
};

window.closeModal = function () {
    document.getElementById("feedbackModal").style.display = "none";
};

function smoothScroll(element) {
    const start = element.scrollTop;
    const end = element.scrollHeight;
    const duration = 500;
    const startTime = performance.now();

    function animateScroll(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        element.scrollTop = start + (end - start) * progress;
        if (progress < 1) requestAnimationFrame(animateScroll);
    }
    requestAnimationFrame(animateScroll);
}


// Function to format responses (Markdown-like styling)
function refineMessage(msg) {
    // Regex to match JS code blocks enclosed in triple backticks
    const matches = msg.match(/```(js|javascript)([\s\S]*?)```/g);

    let processedMsg = msg;

    // If JS code blocks are found
    if (matches) {
        matches.forEach(match => {
            // Extract JS code from the matched block
            const jsCode = match.replace(/```(js|javascript)|```/g, "").trim();
            // Wrap JS code block with HTML
            const jsWrapped = `<div class="code-container"><pre><code class="language-js">${jsCode}</code></pre></div>`;
            // Temporarily replace the original code block with a placeholder
            processedMsg = processedMsg.replace(match, `{{CODE_BLOCK}}`);
        });
    }

    // Apply marked.parse only on non-code content
    processedMsg = processedMsg
        .split("{{CODE_BLOCK}}")
        .map(part => {
            if (part.trim()) {
                // Apply marked.parse and clean extra <br> if not needed
                return marked.parse(part.trim()).replace(/<\/(p|div|ul|ol|li)>\s*<br>/g, "</$1>");
            }
            return "";
        })
        .join("{{CODE_BLOCK}}");

    // Restore code blocks after applying marked.parse
    if (matches) {
        matches.forEach(match => {
            const jsCode = match.replace(/```(js|javascript)|```/g, "").trim();
            const jsWrapped = `<div class="code-container"><pre><code class="language-js">${jsCode}</code></pre></div>`;
            processedMsg = processedMsg.replace("{{CODE_BLOCK}}", jsWrapped);
        });
    }

    // Replace inline code wrapped in single backticks
    processedMsg = processedMsg.replace(/`([^`]+)`/g, "<code>$1</code>");

    // ✅ Updated: Remove unwanted <br> after block elements
    processedMsg = processedMsg.replace(/(<\/(p|div|ul|ol|li)>)<br>/g, "$1");

    return processedMsg;
}
