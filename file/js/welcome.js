// Welcome Notification Handler
document.addEventListener('DOMContentLoaded', () => {
  const welcomeUsername = sessionStorage.getItem('welcomeUsername');
  
  if (welcomeUsername) {
    showWelcomeNotification(welcomeUsername);
    sessionStorage.removeItem('welcomeUsername');
  }
});

function showWelcomeNotification(username) {
  const notification = document.getElementById('welcomeNotification');
  const message = document.getElementById('welcomeMessage');
  
  if (!notification || !message) return;
  
  // Set the welcome message
  message.textContent = `Welcome, ${username}! 👋`;
  
  // Show the notification
  notification.classList.add('show');
  
  // Auto-hide after 2.5 seconds (2500ms)
  setTimeout(() => {
    notification.classList.remove('show');
    notification.classList.add('hide');
    
    // Remove hide class after animation completes
    setTimeout(() => {
      notification.classList.remove('hide');
    }, 400);
  }, 2500);
}
