<template>
  <div class="result-container">
    <div class="result-card">
      <!-- 成绩头部 -->
      <div class="result-header">
        <h1>考试成绩</h1>
        <div class="score-circle" :class="scoreClass">
          <span class="score-number">{{ score }}</span>
          <span class="score-label">分</span>
        </div>
        <p class="result-message">{{ resultMessage }}</p>
      </div>

      <!-- 统计信息 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-value">{{ totalQuestions }}</div>
          <div class="stat-label">总题数</div>
        </div>
        <div class="stat-card correct">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ correctCount }}</div>
          <div class="stat-label">正确</div>
        </div>
        <div class="stat-card wrong">
          <div class="stat-icon">❌</div>
          <div class="stat-value">{{ wrongCount }}</div>
          <div class="stat-label">错误</div>
        </div>
        <div class="stat-card time">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">{{ formatTime(timeUsed) }}</div>
          <div class="stat-label">用时</div>
        </div>
      </div>

      <!-- 答题详情 -->
      <div class="detail-section">
        <h2>点击题号回顾题目</h2>
        <div class="detail-grid">
          <div 
            v-for="(item, index) in answerDetails" 
            :key="index"
            class="detail-item"
            :class="{ 'correct': item.isCorrect, 'wrong': !item.isCorrect, 'active': reviewingIndex === index }"
            @click="reviewQuestion(index)"
          >
            <span class="detail-number">{{ index + 1 }}</span>
            <span class="detail-status">
              {{ item.isCorrect ? '✓' : '✗' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 题目回顾 -->
      <div v-if="reviewingQuestion" class="review-panel">
        <div class="review-header">
          <h2>题目回顾</h2>
          <button class="close-review" @click="closeReview">×</button>
        </div>

        <div class="review-question-card">
          <div class="review-tags">
            <span class="review-tag">{{ getTypeLabel(reviewingQuestion.type) }}</span>
            <span class="review-tag category-tag">{{ reviewingQuestion.categoryName }}</span>
            <span class="review-tag" :class="reviewingResult.isCorrect ? 'tag-correct' : 'tag-wrong'">
              {{ reviewingResult.isCorrect ? '回答正确' : '回答错误' }}
            </span>
          </div>

          <h3 class="review-question-text">{{ reviewingQuestion.question }}</h3>

          <div class="review-options">
            <div 
              v-for="(option, idx) in reviewingQuestion.options"
              :key="idx"
              class="review-option"
              :class="getOptionClass(idx)"
            >
              <span class="review-option-label">{{ ['A', 'B', 'C', 'D'][idx] }}</span>
              <span class="review-option-text">{{ option }}</span>
              <span v-if="idx === reviewingQuestion.correctAnswer" class="review-option-icon correct-icon">✓</span>
              <span v-else-if="idx === userAnswer && idx !== reviewingQuestion.correctAnswer" class="review-option-icon wrong-icon">✗</span>
            </div>
          </div>

          <div v-if="userAnswer !== reviewingQuestion.correctAnswer" class="review-correct-answer">
            正确答案：<strong>{{ ['A', 'B', 'C', 'D'][reviewingQuestion.correctAnswer] }}</strong>
            <span class="review-user-answer">
              （你的答案：{{ userAnswer !== undefined ? ['A', 'B', 'C', 'D'][userAnswer] : '未作答' }}）
            </span>
          </div>

          <div class="review-explanation">
            <strong>解析：</strong>{{ reviewingQuestion.explanation || '暂无解析' }}
          </div>
        </div>

        <div class="review-navigation">
          <button class="btn btn-outline" @click="prevReview" :disabled="reviewingIndex === 0">
            ← 上一题
          </button>
          <span class="review-position">{{ reviewingIndex + 1 }} / {{ answerDetails.length }}</span>
          <button class="btn btn-outline" @click="nextReview" :disabled="reviewingIndex >= answerDetails.length - 1">
            下一题 →
          </button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="btn btn-outline" @click="newExam">
          再考一次
        </button>
        <button class="btn btn-primary" @click="goHome">
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const examResult = ref(null)
const reviewingIndex = ref(null)

const score = computed(() => {
  return examResult.value?.score || 0
})

const scoreClass = computed(() => {
  if (score.value >= 90) return 'excellent'
  if (score.value >= 80) return 'good'
  if (score.value >= 60) return 'pass'
  return 'fail'
})

const resultMessage = computed(() => {
  if (score.value >= 90) return '太棒了！成绩优秀！'
  if (score.value >= 80) return '很好！继续保持！'
  if (score.value >= 60) return '及格了，再接再厉！'
  return '继续加油，下次会更好！'
})

const totalQuestions = computed(() => {
  return examResult.value?.totalQuestions || 0
})

const correctCount = computed(() => {
  return examResult.value?.correctCount || 0
})

const wrongCount = computed(() => {
  return examResult.value?.wrongCount || 0
})

const timeUsed = computed(() => {
  return examResult.value?.timeUsed || 0
})

const questions = computed(() => {
  return examResult.value?.questions || []
})

const answers = computed(() => {
  return examResult.value?.answers || {}
})

const answerDetails = computed(() => {
  if (!questions.value.length) return []
  
  return questions.value.map((q, i) => ({
    questionIndex: i,
    isCorrect: answers.value[q.id] === q.correctAnswer
  }))
})

const reviewingQuestion = computed(() => {
  if (reviewingIndex.value === null) return null
  return questions.value[reviewingIndex.value] || null
})

const userAnswer = computed(() => {
  if (!reviewingQuestion.value) return undefined
  return answers.value[reviewingQuestion.value.id]
})

const reviewingResult = computed(() => {
  if (!reviewingQuestion.value) return { isCorrect: false }
  return {
    isCorrect: answers.value[reviewingQuestion.value.id] === reviewingQuestion.value.correctAnswer
  }
})

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getTypeLabel = (type) => {
  const labels = {
    'single': '单选题',
    'multiple': '多选题',
    'judge': '判断题'
  }
  return labels[type] || '单选题'
}

const getOptionClass = (idx) => {
  if (!reviewingQuestion.value) return ''
  const correct = reviewingQuestion.value.correctAnswer
  const selected = userAnswer.value

  if (idx === correct) {
    if (idx === selected) return 'option-correct-selected'
    return 'option-correct'
  }
  if (idx === selected && idx !== correct) {
    return 'option-wrong'
  }
  return ''
}

const reviewQuestion = (index) => {
  reviewingIndex.value = index
}

const closeReview = () => {
  reviewingIndex.value = null
}

const prevReview = () => {
  if (reviewingIndex.value > 0) {
    reviewingIndex.value--
  }
}

const nextReview = () => {
  if (reviewingIndex.value < answerDetails.value.length - 1) {
    reviewingIndex.value++
  }
}

const newExam = () => {
  router.push('/exam')
}

const goHome = () => {
  router.push('/')
}

onMounted(() => {
  const savedResult = localStorage.getItem('examResult')
  if (savedResult) {
    examResult.value = JSON.parse(savedResult)
  } else {
    router.push('/')
  }
})
</script>

<style scoped>
.result-container {
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.result-card {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.result-header {
  text-align: center;
  margin-bottom: 40px;
}

.result-header h1 {
  font-size: 32px;
  color: #333;
  margin-bottom: 30px;
}

.score-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.score-circle.excellent {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
}

.score-circle.good {
  background: linear-gradient(135deg, #2196f3 0%, #1565c0 100%);
}

.score-circle.pass {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
}

.score-circle.fail {
  background: linear-gradient(135deg, #f44336 0%, #c62828 100%);
}

.score-number {
  font-size: 56px;
  font-weight: bold;
  line-height: 1;
}

.score-label {
  font-size: 18px;
  margin-top: 5px;
}

.result-message {
  font-size: 20px;
  color: #666;
  font-weight: 500;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card.correct {
  background: #e8f5e9;
}

.stat-card.wrong {
  background: #ffebee;
}

.stat-card.time {
  background: #e3f2fd;
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-card.correct .stat-value {
  color: #4caf50;
}

.stat-card.wrong .stat-value {
  color: #f44336;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.detail-section {
  margin-bottom: 40px;
}

.detail-section h2 {
  font-size: 20px;
  color: #333;
  margin-bottom: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 10px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 10px;
  background: #f5f5f5;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.detail-item:hover {
  transform: scale(1.05);
}

.detail-item.active {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
}

.detail-item.correct {
  background: #c8e6c9;
}

.detail-item.wrong {
  background: #ffcdd2;
}

.detail-number {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.detail-status {
  font-size: 16px;
}

.review-panel {
  margin-bottom: 30px;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 16px;
  border: 2px solid #667eea;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.review-header h2 {
  font-size: 20px;
  color: #333;
  margin: 0;
}

.close-review {
  width: 36px;
  height: 36px;
  border: none;
  background: #e0e0e0;
  border-radius: 50%;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.close-review:hover {
  background: #f44336;
  color: white;
}

.review-question-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
}

.review-tags {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.review-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  background: #e3f2fd;
  color: #1976d2;
}

.review-tag.category-tag {
  background: #f3e5f5;
  color: #7b1fa2;
}

.review-tag.tag-correct {
  background: #e8f5e9;
  color: #2e7d32;
}

.review-tag.tag-wrong {
  background: #ffebee;
  color: #c62828;
}

.review-question-text {
  font-size: 18px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 20px;
}

.review-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-option {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  transition: all 0.2s;
}

.review-option.option-correct {
  border-color: #4caf50;
  background: #e8f5e9;
}

.review-option.option-correct-selected {
  border-color: #4caf50;
  background: #e8f5e9;
}

.review-option.option-wrong {
  border-color: #f44336;
  background: #ffebee;
}

.review-option-label {
  font-weight: 600;
  margin-right: 10px;
  min-width: 24px;
  font-size: 16px;
}

.review-option-text {
  flex: 1;
  font-size: 16px;
  color: #333;
}

.review-option-icon {
  font-size: 18px;
  margin-left: 10px;
}

.review-option-icon.correct-icon {
  color: #4caf50;
  font-weight: bold;
}

.review-option-icon.wrong-icon {
  color: #f44336;
  font-weight: bold;
}

.review-correct-answer {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff3e0;
  border-radius: 8px;
  font-size: 15px;
  color: #e65100;
  border-left: 4px solid #ff9800;
}

.review-user-answer {
  color: #999;
  font-weight: normal;
  margin-left: 10px;
}

.review-explanation {
  margin-top: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;
  color: #666;
  border-left: 4px solid #667eea;
}

.review-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.review-position {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

@media (max-width: 768px) {
  .result-card {
    padding: 24px;
  }
  
  .score-circle {
    width: 140px;
    height: 140px;
  }
  
  .score-number {
    font-size: 40px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .review-panel {
    padding: 20px;
  }
  
  .review-question-card {
    padding: 16px;
  }
  
  .action-buttons {
    flex-wrap: wrap;
  }
  
  .action-buttons .btn {
    flex: 1;
    min-width: 120px;
  }
}
</style>
