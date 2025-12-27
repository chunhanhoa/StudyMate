let currentQuestions = [];
let userAnswers = {};

async function generateQuiz() {
    const topic = document.getElementById('topicInput').value;
    const difficulty = document.getElementById('difficultyInput').value;
    const numQuestions = parseInt(document.getElementById('numQuestionsInput').value);

    if (!topic.trim()) {
        alert('Vui lòng nhập chủ đề bạn muốn ôn tập!');
        return;
    }

    // UI Updates
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('btnGen').disabled = true;

    try {
        const response = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic: topic,
                numberOfQuestions: numQuestions,
                difficulty: difficulty
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate quiz');
        }

        currentQuestions = await response.json();
        
        if (currentQuestions.length === 0) {
            alert('AI không thể tạo câu hỏi cho chủ đề này. Vui lòng thử lại với chủ đề khác.');
            return;
        }

        renderQuiz();

    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi tạo đề thi. Vui lòng thử lại.');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('btnGen').disabled = false;
    }
}

function renderQuiz() {
    // Switch Views
    document.getElementById('setupView').style.display = 'none';
    document.getElementById('quizView').style.display = 'block';

    // Update Header Info
    const topic = document.getElementById('topicInput').value;
    document.getElementById('quizTitle').textContent = topic;
    document.getElementById('quizMeta').textContent = `${currentQuestions.length} câu hỏi • ${document.getElementById('difficultyInput').options[document.getElementById('difficultyInput').selectedIndex].text}`;

    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    currentQuestions.forEach((q, index) => {
        const html = `
            <div class="question-card" id="card_${index}">
                <div class="question-text">Câu ${index + 1}: ${q.question}</div>
                <div class="options-list">
                    ${q.options.map((opt, optIndex) => `
                        <label class="option-item" id="lbl_${index}_${optIndex}">
                            <input type="radio" name="q_${index}" value="${optIndex}" onchange="selectAnswer(${index}, ${optIndex})">
                            <span>${["A", "B", "C", "D"][optIndex]}. ${opt}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="explanation-box" id="exp_${index}">
                    <strong>Giải thích:</strong> ${q.explanation}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function selectAnswer(qIndex, optIndex) {
    userAnswers[qIndex] = optIndex;
    
    // UI Feedback (optional: highlight selected)
    // Remove selected class from all in this question
    for(let i=0; i<4; i++) {
        const lbl = document.getElementById(`lbl_${qIndex}_${i}`);
        if(lbl) lbl.style.backgroundColor = '';
        if(lbl) lbl.style.borderColor = '#eee';
    }
    // Add to current
    const currentLbl = document.getElementById(`lbl_${qIndex}_${optIndex}`);
    if(currentLbl) {
        currentLbl.style.backgroundColor = '#e3f2fd'; // Light blue
        currentLbl.style.borderColor = '#2196f3';
    }
}

function submitQuiz() {
    // Check completion
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < currentQuestions.length) {
        if (!confirm(`Bạn mới làm ${answeredCount}/${currentQuestions.length} câu. Bạn có chắc muốn nộp bài không?`)) {
            return;
        }
    }

    let correctCount = 0;

    currentQuestions.forEach((q, index) => {
        const userAns = userAnswers[index];
        const card = document.getElementById(`card_${index}`);
        const expBox = document.getElementById(`exp_${index}`);
        
        // Disable inputs
        const inputs = document.querySelectorAll(`input[name="q_${index}"]`);
        inputs.forEach(inp => inp.disabled = true);

        // Show Explanation
        expBox.style.display = 'block';

        if (userAns === undefined) {
             // Not answered
             card.classList.add('incorrect');
             // Highlight correct answer
             const correctLbl = document.getElementById(`lbl_${index}_${q.correctAnswer}`);
             if(correctLbl) {
                 correctLbl.style.backgroundColor = '#dcedc8'; // Greenish
                 correctLbl.style.borderColor = '#8bc34a';
                 correctLbl.style.fontWeight = 'bold';
             }
             return;
        }

        if (userAns === q.correctAnswer) {
            correctCount++;
            card.classList.add('correct');
            const lbl = document.getElementById(`lbl_${index}_${userAns}`);
            lbl.style.backgroundColor = '#dcedc8';
            lbl.style.borderColor = '#8bc34a';
        } else {
            card.classList.add('incorrect');
            // Highlight user's wrong answer
            const wrongLbl = document.getElementById(`lbl_${index}_${userAns}`);
            wrongLbl.style.backgroundColor = '#ffcdd2';
            wrongLbl.style.borderColor = '#e57373';
            
            // Highlight correct answer
            const correctLbl = document.getElementById(`lbl_${index}_${q.correctAnswer}`);
            correctLbl.style.backgroundColor = '#dcedc8';
            correctLbl.style.borderColor = '#8bc34a';
        }
    });

    // Show Result Overlay
    const percentage = Math.round((correctCount / currentQuestions.length) * 100);
    document.getElementById('scoreText').textContent = `${correctCount}/${currentQuestions.length}`;
    document.getElementById('scoreCircle').style.background = `conic-gradient(#4caf50 ${percentage}%, #eee ${percentage}%)`;
    
    let msg = "Cần cố gắng hơn!";
    if (percentage >= 80) msg = "Xuất sắc! 🔥";
    else if (percentage >= 50) msg = "Khá tốt! 👍";
    
    document.getElementById('scoreMessage').textContent = msg;
    document.getElementById('resultOverlay').style.display = 'flex';
}

function closeResult() {
    document.getElementById('resultOverlay').style.display = 'none';
    // Users can now scroll through the reviewed quiz
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function retryQuiz() {
    // Hide result overlay
    document.getElementById('resultOverlay').style.display = 'none';
    
    // Reset answers
    userAnswers = {};
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-generate quiz (fetches new questions based on existing inputs)
    generateQuiz();
}
