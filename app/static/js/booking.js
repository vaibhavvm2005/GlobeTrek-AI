/**
 * GlobeTrek AI – Booking & Seating Experience
 */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Ticket Quantity & Subtotal Calculator
  const qtyInputs = document.querySelectorAll(".ticket-qty-input");
  const subtotalDisplay = document.getElementById("bookingSubtotal");
  const taxDisplay = document.getElementById("bookingTax");
  const grandTotalDisplay = document.getElementById("bookingGrandTotal");

  function calculateTotals() {
    let subtotal = 0;
    qtyInputs.forEach(input => {
      const price = parseFloat(input.getAttribute("data-price") || 0);
      const qty = parseInt(input.value || 0, 10);
      subtotal += price * qty;
    });

    const tax = subtotal > 0 ? subtotal * 0.18 : 0; // 18% GST
    const fee = subtotal > 0 ? 29.0 : 0; // Flat statutory service fee
    const grandTotal = subtotal + tax + fee;

    if (subtotalDisplay) subtotalDisplay.innerText = "₹" + subtotal.toFixed(2);
    if (taxDisplay) taxDisplay.innerText = "₹" + tax.toFixed(2);
    if (grandTotalDisplay) grandTotalDisplay.innerText = "₹" + grandTotal.toFixed(2);
  }

  qtyInputs.forEach(input => {
    input.addEventListener("input", calculateTotals);
    input.addEventListener("change", calculateTotals);
  });

  // Increment / Decrement buttons
  document.querySelectorAll(".btn-qty-minus").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (input) {
        let val = parseInt(input.value || 0, 10);
        if (val > 0) {
          input.value = val - 1;
          calculateTotals();
        }
      }
    });
  });

  document.querySelectorAll(".btn-qty-plus").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (input) {
        let val = parseInt(input.value || 0, 10);
        const max = parseInt(input.getAttribute("max") || 10, 10);
        if (val < max) {
          input.value = val + 1;
          calculateTotals();
        }
      }
    });
  });

  calculateTotals();

  // 2. Interactive Seat Selection
  const seatButtons = document.querySelectorAll(".seat-btn.available");
  const selectedSeatsContainer = document.getElementById("selectedSeatsInputContainer");
  const selectedSeatsDisplay = document.getElementById("selectedSeatsBadgeList");

  let selectedSeatIds = [];

  seatButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const seatId = btn.getAttribute("data-seat-id");
      const seatNum = btn.getAttribute("data-seat-num");

      if (btn.classList.contains("selected")) {
        btn.classList.remove("selected");
        selectedSeatIds = selectedSeatIds.filter(id => id !== seatId);
      } else {
        btn.classList.add("selected");
        selectedSeatIds.push(seatId);
      }

      updateSelectedSeats();
    });
  });

  function updateSelectedSeats() {
    if (!selectedSeatsContainer) return;
    selectedSeatsContainer.innerHTML = "";
    selectedSeatIds.forEach(id => {
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = "seat_ids";
      hiddenInput.value = id;
      selectedSeatsContainer.appendChild(hiddenInput);
    });

    if (selectedSeatsDisplay) {
      if (selectedSeatIds.length === 0) {
        selectedSeatsDisplay.innerHTML = `<span class="text-muted small">No seats selected yet. Click available seats on the map above.</span>`;
      } else {
        selectedSeatsDisplay.innerHTML = selectedSeatIds.map(id => {
          const btn = document.querySelector(`.seat-btn[data-seat-id="${id}"]`);
          const label = btn ? btn.getAttribute("data-seat-num") : id;
          return `<span class="badge bg-teal me-1.5 py-1.5 px-2.5 rounded-pill"><i class="bi bi-person-check me-1"></i> Seat ${label}</span>`;
        }).join("");
      }
    }
  }

  // 3. 10-Minute Hold Expiry Countdown Timer
  const timerElem = document.getElementById("holdCountdownTimer");
  if (timerElem) {
    const expiresAtStr = timerElem.getAttribute("data-expires-at");
    if (expiresAtStr) {
      const expiresAt = new Date(expiresAtStr).getTime();

      const countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.floor((expiresAt - now) / 1000);

        if (diff <= 0) {
          clearInterval(countdownInterval);
          timerElem.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-clock-history me-1"></i> Hold Expired!</span>`;
          alert("Your 10-minute temporary ticket reservation has expired. Please re-select your tickets.");
          window.location.reload();
        } else {
          const minutes = Math.floor(diff / 60);
          const seconds = diff % 60;
          const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
          timerElem.innerHTML = `<i class="bi bi-hourglass-split text-warning me-1"></i> Holding for: <strong class="text-dark font-monospace">${formatted}</strong>`;
        }
      }, 1000);
    }
  }
});

