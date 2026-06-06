document.addEventListener("DOMContentLoaded", () => {

  const openBtn = document.getElementById("openBtn");
  const closeBtn = document.getElementById("closeBtn");


  openBtn.addEventListener("click", () => {
    box.style.display = "block";
  });

  closeBtn.addEventListener("click", () => {
    box.style.display = "none";
  });
});


/**/

const MAX_LENGTH = 6;
let code = '';

const codeDisplay = document.getElementById('codeDisplay');
const statusText = document.getElementById('status-text');
const posBody = document.getElementById('posBody');
const zeroBtn = document.querySelector('.bottom-key.zero-btn');


function updateDisplay() {
  let display = '';
  for (let i = 0; i < MAX_LENGTH; i++) {
    display += i < code.length ? code[i] : '•';
  }
  codeDisplay.textContent = display;
}

function shakeError() {
  statusText.textContent = 'Wrong password';
  statusText.classList.add('error');
  posBody.classList.add('shake');

  setTimeout(() => {
    posBody.classList.remove('shake');
  }, 300);
}

document.querySelectorAll('.key').forEach(btn => {
  btn.addEventListener('click', () => {
    if (code.length < MAX_LENGTH) {
      code += btn.textContent;
      updateDisplay();
    }
  });
});
if (!zeroBtn) console.log("Zero button not found!");
document.querySelector('.zero-btn').addEventListener('click', () => {
  if (code.length < MAX_LENGTH) {
    code += '0';
    updateDisplay();
  }
});

document.querySelector('.delete-btn').addEventListener('click', () => {
  code = code.slice(0, -1);
  updateDisplay();
});

document.querySelector('.enter-btn').addEventListener('click', () => {
  if (code.length < MAX_LENGTH) {
    shakeError();
    code = '';
    updateDisplay();
    return;
  }

  if (code === '000000') {
      code="";
    window.location.href = 'parametre.html';

    
  } 
  else {
    shakeError();
    code = '';
    updateDisplay();
  }
});
