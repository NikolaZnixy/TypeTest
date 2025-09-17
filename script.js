///////////// DOM ELEMENT SELECTION ////////////////

const typingContainer = document.querySelector('.typing--container');
const timeChooseContainer = document.querySelector('.time-choose-container');
const wordsChooseContainer = document.querySelector('.words-choose-container');
const currentTimeLabel = document.querySelector('.current-time');
const timeUpContainer = document.querySelector('.time-up-container');
const statisticsContainer = document.querySelector('.statistics-container');
const correctWordsLabel = document.querySelector('.correct-words-label');
const secondsElapsedLabel = document.querySelector('.seconds-elapsed-label');
const wpmLabel = document.querySelector('.wpm-label');

///////// TIMER //////////////

class Timer {
  constructor() {
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = Date.now();
    this.endTime = null; // reset if reused
  }

  stop() {
    if (!this.startTime) throw new Error("Timer hasn't been started.");
    this.endTime = Date.now();
  }

  reset() {
    this.startTime = null;
    this.endTime = null;
  }

  getElapsedSeconds() {
    if (!this.startTime) throw new Error("Timer hasn't been started.");
    const end = this.endTime ?? Date.now(); // use endTime if stopped, else now
    return Math.floor((end - this.startTime) / 1000);
  }
}

///////// GAME CONFIGURATIONS  //////////////////

let mode;
let modeType;
let typingStarted = false;
let gameFinished = false;

////////// ACTIVE ELEMENTS ////////////////////

let cursor;
let currentRow = 0;
const timer = new Timer();
let countdownIntervalId = null;

/////////////// FUNCTIONS ////////////////////

function hideTimeLabel(hide) {
  currentTimeLabel.style.opacity = hide ? 0 : 1;
}

function hideTypingContainer(hide) {
  typingContainer.style.opacity = hide ? 0 : 1;
}
function hideStatistics(hide) {
  timeUpContainer.style.opacity = hide ? 0 : 1;
  const display = hide ? 'none' : 'flex';
  statisticsContainer.style.display = display;
  if (hide) return;
  const correctWords = countCorrectWords();
  const secondsElapsed = timer.getElapsedSeconds();

  correctWordsLabel.textContent = correctWords + ' correct words';
  secondsElapsedLabel.textContent = secondsElapsed + 's';

  const wpm = secondsElapsed > 0 ? correctWords / (secondsElapsed / 60) : 0;
  wpmLabel.textContent = wpm.toFixed(1) + ' WPM';
}

function setMode(mode, modeType) {
  gameFinished = false;
  hideTypingContainer(false);
  hideStatistics(true);
  timer.reset();
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  generateWords(mode, modeType);
  insertCursor();
  const isTimeMode = mode === 'time';
  hideTimeLabel(!isTimeMode);
  if (isTimeMode) {
    currentTimeLabel.textContent = modeType;
  }
}

function generateWords(mode, modeType) {
  typingContainer.innerHTML = '';
  let wordsToType =
    mode === 'time'
      ? shuffle(commonWords).slice(-200)
      : shuffle(commonWords).slice(-modeType);
  for (let i = 0; i < wordsToType.length; i++) {
    typingContainer.insertAdjacentHTML('beforeend', `<div class="word"></div>`);
    let wordContainer = typingContainer.lastElementChild;
    for (let j = 0; j < wordsToType[i].length; j++) {
      wordContainer.insertAdjacentHTML(
        'beforeend',
        `
  <div class="letter">${wordsToType[i][j]}</div>
            `
      );
      if (j === wordsToType[i].length - 1 && i !== wordsToType.length - 1) {
        wordContainer.insertAdjacentHTML(
          'beforeend',
          `
  <div class="letter">&nbsp</div>
            `
        );
      }
    }
  }
  mapWords();
}

function mapWords() {
  let rowPosition = document.querySelector('.word').getBoundingClientRect().top;
  let dataCounter = 0;
  document.querySelectorAll('.word').forEach(word => {
    if (word.getBoundingClientRect().top > rowPosition) {
      rowPosition = word.getBoundingClientRect().top;
      dataCounter++;
    }
    word.setAttribute('data-row', `${dataCounter}`);
  });
  typingContainer.style.overflow = 'hidden';
}

function insertCursor() {
  typingContainer.querySelector('.word').insertAdjacentHTML(
    'afterbegin',
    `      <svg height="40" width="2" xmlns="http://www.w3.org/2000/svg" class='cursor-svg'>
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="50"
          style="stroke: white; stroke-width: 3"
        />`
  );
  cursor = document.querySelector('.cursor-svg');
}

function finishGameShowResults() {
  gameFinished = true;
  hideTypingContainer(true);
  hideStatistics(false);
  typingStarted = false;
  timer.stop();
}

function moveDown(letterPressed) {
  //Moving to next letter/word logic

  const next = cursor.nextElementSibling;
  const container = cursor.closest('.word');
  if (next) {
    container.insertBefore(cursor, next.nextElementSibling);
  } else {
    const nextWordContainer = container.nextElementSibling;
    if (container.nextElementSibling == null) {
      //END OF WORDS REACHED
      finishGameShowResults();
      return;
    }
    const nextWordFirstLetter =
      container.nextElementSibling.querySelector('.letter');

    nextWordContainer.insertBefore(
      cursor,
      nextWordFirstLetter.nextElementSibling
    );
  }

  /////// hide certain row for nicer typing

  if (parseInt(cursor.closest('.word').dataset.row) > currentRow) {
    currentRow = parseInt(cursor.closest('.word').dataset.row);
    // Show the current row and previous row
    document.querySelectorAll('.word').forEach(word => {
      const row = parseInt(word.dataset.row);
      if (row >= currentRow - 1) {
        word.style.display = 'flex';
      } else {
        word.style.display = 'none';
      }
    });
  }

  ////determine if letter pressed was correct

  const letterPassed = cursor.previousElementSibling;
  console.log(letterPassed.textContent);
  let expected =
    letterPassed.textContent === '\u00A0' ? ' ' : letterPassed.textContent;

  if (expected === letterPressed) {
    letterPassed.classList.add('correct');
  } else {
    letterPassed.classList.add('wrong');
  }
}

function moveBack() {
  //Check if there is previous letter or previous word, if not -> return

  if (
    cursor.parentElement === typingContainer.firstChild &&
    cursor.previousElementSibling === null
  )
    return;

  //insert cursor before logic

  const currentWordContainer = cursor.closest('.word');
  if (cursor.previousElementSibling != null) {
    currentWordContainer.insertBefore(cursor, cursor.previousElementSibling);
  } else {
    const previousWordContainer = currentWordContainer.previousElementSibling;
    previousWordContainer.insertBefore(
      cursor,
      previousWordContainer.lastElementChild
    );
  }

  //hide rows for nicer typing

  if (parseInt(cursor.closest('.word').dataset.row) < currentRow) {
    currentRow = parseInt(cursor.closest('.word').dataset.row);
    document.querySelectorAll('.word').forEach(word => {
      const row = parseInt(word.dataset.row);
      if (row >= currentRow - 1) {
        word.style.display = 'flex';
      } else {
        word.style.display = 'none';
      }
    });
  }

  //remove correct or wrong since we are erasing the letter

  const letterPassed = cursor.nextElementSibling;
  letterPassed.classList.remove('correct');
  letterPassed.classList.remove('wrong');
}

function timeModeEndAwait() {
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
  }

  let timeLeft = modeType;
  currentTimeLabel.textContent = timeLeft;

  countdownIntervalId = setInterval(() => {
    timeLeft--;
    currentTimeLabel.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
      finishGameShowResults();
    }
  }, 1000);
}

function countCorrectWords() {
  let correctAmount = 0;
  document.querySelectorAll('.word').forEach(w => {
    if (
      Array.from(w.querySelectorAll('.letter')).every(letter =>
        letter.classList.contains('correct')
      )
    )
      correctAmount++;
  });
  return correctAmount;
}

//////////// LISTENERS ///////////////////

document.addEventListener('keydown', function (e) {
  e.preventDefault();

  if (!gameFinished && !typingStarted) {
    typingStarted = true;
    timer.start();
    if (mode === 'time') timeModeEndAwait();
  }

  if (e.key != 'Backspace' && allowedKeys.includes(e.key)) {
    moveDown(e.key);
  } else if (e.key === 'Backspace') {
    moveBack();
  }
});

document.querySelectorAll('nav .options').forEach(option => {
  option.addEventListener('mouseenter', () => {
    option.querySelector('.choose').classList.add('showOptions');
  });
  option.addEventListener('mouseleave', () => {
    option.querySelector('.choose').classList.remove('showOptions');
  });
});

wordsChooseContainer.addEventListener('click', function (e) {
  if (e.target.hasAttribute('data-words')) {
    document
      .querySelectorAll('.options')
      .forEach(o => o.classList.remove('active-mode'));
    e.target.closest('.options').classList.add('active-mode');
    mode = 'words';
    modeType = Number(e.target.dataset.words);
    console.log(mode, modeType);
    setMode(mode, modeType);
  }
});

timeChooseContainer.addEventListener('click', function (e) {
  if (e.target.hasAttribute('data-time')) {
    document
      .querySelectorAll('.options')
      .forEach(o => o.classList.remove('active-mode'));
    e.target.closest('.options').classList.add('active-mode');
    mode = 'time';
    modeType = Number(e.target.dataset.time);
    console.log(mode, modeType);
    setMode(mode, modeType);
  }
});

document.addEventListener('keydown', function (e) {
  e.preventDefault();
  if (gameFinished && e.key === ' ') {
    setMode(mode, modeType);
  }
});

////////// MONKEY TYPE HEHEHEHE ///////////////////
let isTabPressed = false;

document.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    isTabPressed = true;
  }

  if (e.key === 'Enter' && isTabPressed) {
    e.preventDefault();
    finishGameShowResults();
    setMode(mode, modeType);
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'Tab') {
    isTabPressed = false;
  }
});

////////// APPLICATION START //////////////////

mode = 'time';
modeType = 10;
setMode(mode, modeType);
document.querySelector('.option-time-container').classList.add('active-mode');
