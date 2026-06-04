// Firebase configuration credentials
const firebaseConfig = {
  apiKey: "AIzaSyC3hBiCo-jwu_JJLsDvDO5XU05M7KhNQLk",
  authDomain: "smartparkingsystem-8055.firebaseapp.com",
  databaseURL: "https://smartparkingsystem-8055-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "smartparkingsystem-8055",
  storageBucket: "smartparkingsystem-8055.appspot.com",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// State variables to track slot status (0 = Available, 1 = Occupied)
let slot1Status = 0;
let slot2Status = 0;

// Function to update the summary counters
function updateSummary() {
  const occupiedCount = slot1Status + slot2Status;
  const availableCount = 2 - occupiedCount;
  
  document.getElementById("spotsAvailable").textContent = availableCount;
  document.getElementById("spotsOccupied").textContent = occupiedCount;
}

// Real-time listener for Slot 1
database.ref("parking/slot1").on("value", function(snapshot) {
  const value = snapshot.val();
  slot1Status = (value !== null) ? Number(value) : 0;
  
  const card = document.getElementById("slotCard1");
  const statusLabel = document.getElementById("slotStatus1");
  
  if (slot1Status === 1) {
    card.className = "slot-card occupied";
    statusLabel.textContent = "Occupied";
  } else {
    card.className = "slot-card available";
    statusLabel.textContent = "Available";
  }
  
  updateSummary();
}, function(error) {
  console.error("Database read error for Slot 1:", error);
});

// Real-time listener for Slot 2
database.ref("parking/slot2").on("value", function(snapshot) {
  const value = snapshot.val();
  slot2Status = (value !== null) ? Number(value) : 0;
  
  const card = document.getElementById("slotCard2");
  const statusLabel = document.getElementById("slotStatus2");
  
  if (slot2Status === 1) {
    card.className = "slot-card occupied";
    statusLabel.textContent = "Occupied";
  } else {
    card.className = "slot-card available";
    statusLabel.textContent = "Available";
  }
  
  updateSummary();
}, function(error) {
  console.error("Database read error for Slot 2:", error);
});
