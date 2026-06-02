/* ==========================================================================
   SMART PARKING DASHBOARD - APPLICATION CONTROLLER (DIAGNOSTIC COMPAT)
   ========================================================================== */

// Firebase Configuration matching Arduino sketch
const firebaseConfig = {
  apiKey: "AIzaSyC3hBiCo-jwu_JJLsDvDO5XU05M7KhNQLk",
  authDomain: "smartparkingsystem-8055.firebaseapp.com",
  databaseURL: "https://smartparkingsystem-8055-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "smartparkingsystem-8055",
  storageBucket: "smartparkingsystem-8055.appspot.com",
};

// Login credentials from Arduino code
const authEmail = "245123749025@mvsrec.edu.in";
const authPassword = "Login#789";

// System State
let auth = null;
let database = null;
let isSimulating = false;
let connectionTimeout = null;
let parkingState = {
  slot1: 0, // 0 = Available, 1 = Occupied
  slot2: 0,
  dist1: 15,
  dist2: 15
};

// Chart.js reference
let trendChart = null;

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  connectionText: document.getElementById('connectionText'),
  themeToggle: document.getElementById('themeToggle'),
  sunIcon: document.getElementById('sunIcon'),
  moonIcon: document.getElementById('moonIcon'),
  
  spotsAvailable: document.getElementById('spotsAvailable'),
  spotsOccupied: document.getElementById('spotsOccupied'),
  
  slotCard1: document.getElementById('slotCard1'),
  slotCard2: document.getElementById('slotCard2'),
  slotStatusBadge1: document.getElementById('slotStatusBadge1'),
  slotStatusBadge2: document.getElementById('slotStatusBadge2'),
  distanceLabel1: document.getElementById('distanceLabel1'),
  distanceLabel2: document.getElementById('distanceLabel2'),
  
  simulationSwitch: document.getElementById('simulationSwitch'),
  simulationControls: document.getElementById('simulationControls'),
  simSlot1: document.getElementById('simSlot1'),
  simSlot2: document.getElementById('simSlot2'),
  simDist1: document.getElementById('simDist1'),
  simDist2: document.getElementById('simDist2'),
  simDistVal1: document.getElementById('simDistVal1'),
  simDistVal2: document.getElementById('simDistVal2'),
  
  alertSwitch: document.getElementById('alertSwitch')
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAnalyticsChart();
  initFirebase();
  setupEventListeners();
  requestNotificationPermission();
});

// ==========================================================================
// THEME SWITCHER LOGIC
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);
}

function updateThemeUI(theme) {
  if (theme === 'light') {
    elements.sunIcon.style.display = 'none';
    elements.moonIcon.style.display = 'block';
  } else {
    elements.sunIcon.style.display = 'block';
    elements.moonIcon.style.display = 'none';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeUI(newTheme);
  
  // Re-draw chart on theme change to match text colors
  if (trendChart) {
    const isDark = newTheme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    
    trendChart.options.scales.x.grid.color = gridColor;
    trendChart.options.scales.x.ticks.color = textColor;
    trendChart.options.scales.y.grid.color = gridColor;
    trendChart.options.scales.y.ticks.color = textColor;
    trendChart.update();
  }
}

// ==========================================================================
// FIREBASE CORE CONNECTIONS
// ==========================================================================
function initFirebase() {
  try {
    updateConnectionStatus('connecting', 'Connecting...');
    
    // Clear any previous timeout
    if (connectionTimeout) clearTimeout(connectionTimeout);
    
    // Set a 6-second timeout to handle slow/blocked network requests
    connectionTimeout = setTimeout(() => {
      if (elements.connectionText.textContent === 'Connecting...') {
        updateConnectionStatus('connecting', 'Offline / Delay');
        console.warn("Firebase connection took too long. Check network or database status.");
        
        // Show an amber warning in the diagnostic panel
        const debugBanner = document.getElementById('debugBanner');
        if (debugBanner && debugBanner.style.display !== 'block') {
          debugBanner.style.display = 'block';
          debugBanner.style.background = 'rgba(217, 119, 6, 0.95)'; // Amber color
          debugBanner.style.borderColor = '#b45309';
          debugBanner.innerHTML = '<strong>⚠️ Connection Diagnosis:</strong> The Firebase connection is taking longer than expected.<br><small>If you are testing offline, toggle <strong>"Hardware Simulation Mode"</strong> in the Control Panel on the right to test dashboard animations immediately.</small>';
        }
      }
    }, 6000);
    
    // Initialize Firebase Web App using UMD compat SDK
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    
    // Set up database listeners IMMEDIATELY (since rules are public, this works without login)
    setupDatabaseListeners();
    
    // Authenticate with predefined user credentials in the background
    auth.signInWithEmailAndPassword(authEmail, authPassword)
      .then((userCredential) => {
        console.log("Firebase Auth Success", userCredential.user.email);
        updateConnectionStatus('connected', 'Live Connected');
      })
      .catch((error) => {
        console.warn("Firebase Auth Failed (continuing with public rules):", error.message);
        // If listeners are already working, we don't block the UI
        if (elements.connectionText.textContent === 'Connecting...') {
          updateConnectionStatus('connected', 'Connected (Public)');
        }
      });
      
  } catch (error) {
    console.error("Firebase Config Error:", error);
    updateConnectionStatus('disconnected', 'Config Error');
  }
}

function updateConnectionStatus(state, message) {
  elements.connectionStatus.className = 'connection-badge';
  elements.connectionText.textContent = message;
  
  if (state === 'connected') {
    elements.connectionStatus.classList.add('connected');
  } else if (state === 'connecting') {
    // keeping grey status
  } else {
    // offline/failed
  }
}

// Database Read Listeners
function setupDatabaseListeners() {
  if (isSimulating) return;

  const slot1Ref = database.ref('parking/slot1');
  const slot2Ref = database.ref('parking/slot2');
  
  // Bind Slot 1 Real-time listener
  slot1Ref.on('value', (snapshot) => {
    if (isSimulating) return;
    const value = snapshot.val();
    // 0 = Available, 1 = Occupied (as set in Arduino sketch)
    const intVal = (value === null) ? 0 : Number(value);
    
    // Clear connection timeout on successful snapshot fetch
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    
    // Hide diagnostic banner if it was showing a connection warning
    const debugBanner = document.getElementById('debugBanner');
    if (debugBanner && debugBanner.innerHTML.includes('Connection Diagnosis')) {
      debugBanner.style.display = 'none';
    }
    
    // Check if slot changed from Occupied (1) to Available (0) for browser alerts
    if (parkingState.slot1 === 1 && intVal === 0) {
      triggerNotification("Spot Open!", "Parking Slot 01 is now available!");
    }
    
    parkingState.slot1 = intVal;
    
    // Infer simulated distance for standard display
    // Arduino threshold is 7cm. So Occupied < 7cm, Available >= 7cm
    parkingState.dist1 = intVal === 1 ? 4.2 : 15.5; 
    
    updateSlotUI(1, intVal, parkingState.dist1);
    recalculateCounters();
    
    // Mark connection status active once we get the first successful data sync
    if (elements.connectionText.textContent === 'Connecting...' || elements.connectionText.textContent === 'Offline / Delay') {
      updateConnectionStatus('connected', 'Live Connected');
    }
  }, (error) => {
    console.error("Slot 1 RTDB read error:", error);
    updateConnectionStatus('disconnected', 'Connection Error');
  });

  // Bind Slot 2 Real-time listener
  slot2Ref.on('value', (snapshot) => {
    if (isSimulating) return;
    const value = snapshot.val();
    const intVal = (value === null) ? 0 : Number(value);
    
    if (parkingState.slot2 === 1 && intVal === 0) {
      triggerNotification("Spot Open!", "Parking Slot 02 is now available!");
    }
    
    parkingState.slot2 = intVal;
    parkingState.dist2 = intVal === 1 ? 3.8 : 18.2;
    
    updateSlotUI(2, intVal, parkingState.dist2);
    recalculateCounters();
    
    if (elements.connectionText.textContent === 'Connecting...' || elements.connectionText.textContent === 'Offline / Delay') {
      updateConnectionStatus('connected', 'Live Connected');
    }
  }, (error) => {
    console.error("Slot 2 RTDB read error:", error);
  });
}

// ==========================================================================
// UI UPDATE DISPATCHERS
// ==========================================================================
function updateSlotUI(slotNum, occupied, distance) {
  const card = document.getElementById(`slotCard${slotNum}`);
  const badge = document.getElementById(`slotStatusBadge${slotNum}`);
  const distLabel = document.getElementById(`distanceLabel${slotNum}`);
  
  if (!card) return;

  if (occupied === 1) {
    card.className = 'parking-slot-card occupied';
    badge.textContent = 'Occupied';
    distLabel.textContent = `Distance: ${distance.toFixed(1)} cm`;
  } else {
    card.className = 'parking-slot-card available';
    badge.textContent = 'Available';
    distLabel.textContent = `Distance: ${distance > 25 ? 'No Object' : distance.toFixed(1) + ' cm'}`;
  }
}

function recalculateCounters() {
  const occupiedCount = parkingState.slot1 + parkingState.slot2;
  const availableCount = 2 - occupiedCount;
  
  elements.spotsAvailable.textContent = availableCount;
  elements.spotsOccupied.textContent = occupiedCount;
}

// ==========================================================================
// HARDWARE SIMULATION LOGIC
// ==========================================================================
function toggleSimulationMode(checked) {
  isSimulating = checked;
  
  // Clear any existing connection timeout when toggling modes
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
  
  // Hide warning diagnostic banner
  const debugBanner = document.getElementById('debugBanner');
  if (debugBanner && debugBanner.innerHTML.includes('Connection Diagnosis')) {
    debugBanner.style.display = 'none';
  }
  
  if (isSimulating) {
    elements.simulationControls.classList.add('active');
    updateConnectionStatus('connected', 'Simulation Sandbox');
    
    // Set simulator slider UI components to represent actual values
    elements.simSlot1.checked = parkingState.slot1 === 1;
    elements.simSlot2.checked = parkingState.slot2 === 1;
    elements.simDist1.value = parkingState.slot1 === 1 ? 4 : 15;
    elements.simDist2.value = parkingState.slot2 === 1 ? 4 : 15;
    elements.simDistVal1.textContent = `${elements.simDist1.value} cm`;
    elements.simDistVal2.textContent = `${elements.simDist2.value} cm`;
  } else {
    elements.simulationControls.classList.remove('active');
    updateConnectionStatus('connecting', 'Reconnecting...');
    
    // Re-authenticate and establish active RTDB listeners
    initFirebase();
  }
}

// When a simulation switch or distance slider is adjusted
function handleSimulationInput(slotNum) {
  if (!isSimulating) return;
  
  const isOccupiedSwitch = document.getElementById(`simSlot${slotNum}`).checked;
  const distSliderVal = parseFloat(document.getElementById(`simDist${slotNum}`).value);
  
  parkingState[`slot${slotNum}`] = isOccupiedSwitch ? 1 : 0;
  parkingState[`dist${slotNum}`] = distSliderVal;
  
  updateSlotUI(slotNum, parkingState[`slot${slotNum}`], distSliderVal);
  recalculateCounters();
  
  // Sync simulation back to Cloud Firebase RTDB so the hardware LEDs 
  // also respond in real-time if they are running and subscribed!
  if (database) {
    const nodePath = `parking/slot${slotNum}`;
    database.ref(nodePath).set(parkingState[`slot${slotNum}`])
      .then(() => console.log(`Sim Sync Cloud: Slot ${slotNum} synced to ${parkingState[`slot${slotNum}`]}`))
      .catch(err => console.error("Sim Sync Cloud Error:", err));
  }
}

// Sync distance change automatically with sensor thresholds
function handleDistanceSliderChange(slotNum, value) {
  const distVal = parseFloat(value);
  document.getElementById(`simDistVal${slotNum}`).textContent = `${distVal} cm`;
  
  // Auto occupy if distance is under threshold (7cm as defined in ESP8266 code)
  const isOccupied = distVal < 7;
  const toggle = document.getElementById(`simSlot${slotNum}`);
  
  if (toggle.checked !== isOccupied) {
    toggle.checked = isOccupied;
  }
  
  handleSimulationInput(slotNum);
}

// ==========================================================================
// NOTIFICATIONS
// ==========================================================================
function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

// Custom simple notification builder
function triggerNotification(title, message) {
  if (elements.alertSwitch.checked && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message
    });
  }
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
  // Theme Switching
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Simulation switches
  elements.simulationSwitch.addEventListener('change', (e) => {
    toggleSimulationMode(e.target.checked);
  });
  
  elements.simSlot1.addEventListener('change', () => handleSimulationInput(1));
  elements.simSlot2.addEventListener('change', () => handleSimulationInput(2));
  
  elements.simDist1.addEventListener('input', (e) => handleDistanceSliderChange(1, e.target.value));
  elements.simDist2.addEventListener('input', (e) => handleDistanceSliderChange(2, e.target.value));
}

// ==========================================================================
// ANALYTICS GRAPH IMPLEMENTATION (CHART.JS)
// ==========================================================================
function initAnalyticsChart() {
  const ctx = document.getElementById('occupancyChart');
  if (!ctx) return;
  
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isDark = currentTheme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  
  const chartData = {
    labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    datasets: [
      {
        label: 'Slot 1 Activity Rate',
        data: [10, 45, 95, 80, 50, 90, 85, 30],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.05)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: '#06b6d4',
        pointRadius: 3
      },
      {
        label: 'Slot 2 Activity Rate',
        data: [20, 60, 80, 95, 65, 85, 70, 15],
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: '#a855f7',
        pointRadius: 3
      }
    ]
  };
  
  trendChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11
            },
            color: textColor
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        x: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 10
            }
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          min: 0,
          max: 100,
          ticks: {
            color: textColor,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 10
            },
            callback: function(value) {
              return value + "%";
            }
          }
        }
      }
    }
  });
}
