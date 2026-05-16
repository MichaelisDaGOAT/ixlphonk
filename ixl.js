// IXL Phonk Celebration Extension

// Array of song files
const songs = [
  { file: 'phonk1.mp3', fadeOut: true },
  { file: 'phonk2.mp3', fadeOut: false }, // This song has its own fade out
  { file: 'phonk3.mp3', fadeOut: true },
  { file: 'phonk4.mp3', fadeOut: true },
  { file: 'phonk5.mp3', fadeOut: true }
];

// Create audio element
let audio = null;
let currentSong = null;
let isPlaying = false; // Track if celebration is currently active

// Function to get random song
function getRandomSong() {
  const randomIndex = Math.floor(Math.random() * songs.length);
  currentSong = songs[randomIndex];
  return chrome.runtime.getURL(currentSong.file);
}

// Create skull overlay element
const skullOverlay = document.createElement('div');
skullOverlay.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999999;
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
`;

const skullImg = document.createElement('img');
skullImg.src = chrome.runtime.getURL('skullface.png');
skullImg.style.cssText = `
  width: 250px;
  height: 250px;
  filter: drop-shadow(0 0 30px rgba(0, 0, 0, 0.9));
`;
skullOverlay.appendChild(skullImg);
document.body.appendChild(skullOverlay);

// Function to apply black and white filter with fade
function applyBWFilter() {
  // Apply grayscale filter
  document.body.style.filter = 'grayscale(100%)';
  document.body.style.transition = 'filter 0.5s ease';
  
  // Show skull
  skullOverlay.style.opacity = '1';
  
  // Get audio duration and calculate when to start fading
  // Start fade 500ms before audio ends, or after 3 seconds minimum
  const audioDuration = audio.duration * 1000; // convert to milliseconds
  const minDisplayTime = 3000; // minimum 3 seconds
  const fadeOutTime = 500; // 500ms fade out
  
  // Wait for metadata to load to get duration
  audio.addEventListener('loadedmetadata', () => {
    const totalDuration = audio.duration * 1000;
    const displayTime = Math.max(minDisplayTime, totalDuration - fadeOutTime);
    
    setTimeout(() => {
      // Fade out grayscale
      document.body.style.filter = 'grayscale(0%)';
      
      // Fade out skull
      skullOverlay.style.opacity = '0';
      
      // Only fade out audio if this song needs it
      if (currentSong && currentSong.fadeOut) {
        const fadeSteps = 25;
        const fadeInterval = fadeOutTime / fadeSteps;
        const volumeStep = audio.volume / fadeSteps;
        
        let currentStep = 0;
        const fadeOutTimer = setInterval(() => {
          currentStep++;
          audio.volume = Math.max(0, audio.volume - volumeStep);
          
          if (currentStep >= fadeSteps) {
            clearInterval(fadeOutTimer);
            audio.pause();
            audio.volume = 0.7; // Reset volume for next time
            isPlaying = false; // Reset flag when done
          }
        }, fadeInterval);
      } else {
        // For phonk2, just let it play naturally
        setTimeout(() => {
          audio.pause();
          audio.volume = 0.7;
          isPlaying = false; // Reset flag when done
        }, fadeOutTime);
      }
    }, displayTime);
  }, { once: true });
  
  // Fallback in case metadata doesn't load - use 3.5 seconds
  setTimeout(() => {
    if (audio.volume > 0.6) { // Check if fade hasn't started yet
      document.body.style.filter = 'grayscale(0%)';
      skullOverlay.style.opacity = '0';
      
      if (currentSong && currentSong.fadeOut) {
        const fadeSteps = 25;
        const fadeInterval = fadeOutTime / fadeSteps;
        const volumeStep = audio.volume / fadeSteps;
        
        let currentStep = 0;
        const fadeOutTimer = setInterval(() => {
          currentStep++;
          audio.volume = Math.max(0, audio.volume - volumeStep);
          
          if (currentStep >= fadeSteps) {
            clearInterval(fadeOutTimer);
            audio.pause();
            audio.volume = 0.7;
            isPlaying = false; // Reset flag when done
          }
        }, fadeInterval);
      } else {
        setTimeout(() => {
          audio.pause();
          audio.volume = 0.7;
          isPlaying = false; // Reset flag when done
        }, fadeOutTime);
      }
    }
  }, 3500);
}

// Function to play phonk and trigger effect
function celebrate() {
  // If already playing, ignore this trigger
  if (isPlaying) {
    console.log('⏭️ Celebration already in progress, skipping...');
    return;
  }
  
  console.log('🎵 CORRECT ANSWER! Playing phonk...');
  isPlaying = true;
  
  // Create new audio element with random song
  audio = new Audio(getRandomSong());
  audio.volume = 0.7;
  
  audio.currentTime = 0;
  audio.play().catch(e => console.log('Audio play failed:', e));
  applyBWFilter();
}

// Track the current SmartScore (for IXL)
let currentScore = null;

// Track the current question index (for Big Ideas Math)
let currentQuestionIndex = null;
let correctCount = 0; // Track how many times we've seen lrn_correct for this question

// Function to get SmartScore
function getSmartScore() {
  const scoreElement = document.querySelector('.smartscore-text');
  if (scoreElement) {
    const score = parseInt(scoreElement.textContent);
    return isNaN(score) ? null : score;
  }
  return null;
}

// Function to get current question index (Big Ideas Math)
function getCurrentQuestionIndex() {
  const activeQuestion = document.querySelector('.lrn-assess-li.pagination-active');
  if (activeQuestion) {
    return activeQuestion.getAttribute('data-index');
  }
  return null;
}

// Initialize score and question tracking
currentScore = getSmartScore();
currentQuestionIndex = getCurrentQuestionIndex();

// Observer to watch for SmartScore changes (IXL) and correct answers (Big Ideas Math)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        // IXL: Check if this is the SmartScore container or contains it
        if (node.classList?.contains('current-smartscore') || 
            node.querySelector?.('.current-smartscore') ||
            node.classList?.contains('smartscore-text') ||
            node.querySelector?.('.smartscore-text')) {
          
          const newScore = getSmartScore();
          
          // If score increased, celebrate!
          if (currentScore !== null && newScore !== null && newScore > currentScore) {
            celebrate();
          }
          
          // Update current score
          if (newScore !== null) {
            currentScore = newScore;
          }
        }
        
        // Big Ideas Math: Check for correct answer class
        if (node.classList?.contains('lrn_correct') || 
            node.querySelector?.('.lrn_correct')) {
          console.log('🎯 Big Ideas Math correct answer detected!');
          
          // Count how many lrn_correct elements exist now
          const correctElements = document.querySelectorAll('.lrn_correct').length;
          
          // Only play if we haven't seen this many correct answers before on this question
          if (correctElements > correctCount) {
            celebrate();
            correctCount = correctElements;
          }
        }
      }
    });
    
    // IXL: Also check for attribute/text changes in the score element
    if (mutation.type === 'characterData' || mutation.type === 'childList') {
      const target = mutation.target;
      if (target.classList?.contains('smartscore-text') || 
          target.parentElement?.classList?.contains('smartscore-text')) {
        
        const newScore = getSmartScore();
        
        if (currentScore !== null && newScore !== null && newScore > currentScore) {
          celebrate();
        }
        
        if (newScore !== null) {
          currentScore = newScore;
        }
      }
    }
    
    // Big Ideas Math: Check for class changes
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target;
      
      // Check if question changed (pagination-active moved to new question)
      if (target.classList?.contains('lrn-assess-li') && 
          target.classList?.contains('pagination-active')) {
        const newQuestionIndex = target.getAttribute('data-index');
        
        if (newQuestionIndex !== currentQuestionIndex) {
          console.log(`📝 Question changed from ${currentQuestionIndex} to ${newQuestionIndex}`);
          currentQuestionIndex = newQuestionIndex;
          correctCount = 0; // Reset counter for new question
        }
      }
      
      // Check for correct answer
      if (target.classList?.contains('lrn_correct')) {
        console.log('🎯 Big Ideas Math correct answer detected via class change!');
        
        // Count how many lrn_correct elements exist now
        const correctElements = document.querySelectorAll('.lrn_correct').length;
        
        // Only play if we haven't seen this many correct answers before on this question
        if (correctElements > correctCount) {
          celebrate();
          correctCount = correctElements;
        }
      }
    }
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['class']
});

console.log('IXL & Big Ideas Math Phonk Extension loaded! 🎵');
