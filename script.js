document.addEventListener('DOMContentLoaded', () => {
  // Aapka Active Apps Script Web App URL
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8a-ZqdSHCnEc8vMeQ1h09T9KadVKkNFXINrvWsUnFuC6Xe6vt5U8aY0m3JbFl9rrhnA/exec";

  // Elements
  const rollInput = document.getElementById('rollInput');
  const verifyBtn = document.getElementById('verifyBtn');
  const statusMsg = document.getElementById('statusMessage');
  const idForm = document.getElementById('idForm');

  const nameInput = document.getElementById('nameInput');
  const subjectSelect = document.getElementById('subjectSelect');
  const sessionInput = document.getElementById('sessionInput');
  const courseRadios = document.querySelectorAll('input[name="courseType"]');
  const photoInput = document.getElementById('photoInput');
  const downloadBtn = document.getElementById('downloadBtn');
  const printBtn = document.getElementById('printBtn');

  // Preview elements
  const cardName = document.getElementById('cardName');
  const cardRoll = document.getElementById('cardRoll');
  const cardStream = document.getElementById('cardStream');
  const cardSession = document.getElementById('cardSession');
  const cardPhoto = document.getElementById('cardPhoto');
  const cardQrImage = document.getElementById('cardQrImage');

  // Cropper elements
  const cropModal = document.getElementById('cropModal');
  const cropImageTarget = document.getElementById('cropImageTarget');
  const btnApplyCrop = document.getElementById('btnApplyCrop');
  const btnCancelCrop = document.getElementById('btnCancelCrop');
  let cropper = null;

  let isVerified = false;
  let verifiedOfficialRoll = "";

  function showStatus(text, type) {
    statusMsg.className = `status-msg ${type}`;
    statusMsg.textContent = text;
    statusMsg.style.display = 'block';
  }

  // Guaranteed Scan-Ready QR Code Generator
  function refreshQrCode(payloadText) {
    const encoded = encodeURIComponent(payloadText);
    cardQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encoded}&color=0b3c74&bgcolor=ffffff&margin=1`;
  }

  // Live ID Card Visual Sync
  function syncCard() {
    cardName.textContent = nameInput.value.trim() ? nameInput.value.toUpperCase() : "STUDENT NAME";
    cardRoll.textContent = verifiedOfficialRoll || (rollInput.value.trim() ? rollInput.value.toUpperCase() : "BA24-000");

    const selectedCourse = document.querySelector('input[name="courseType"]:checked').value;
    const subject = subjectSelect.value;

    if (selectedCourse === 'BED') {
      cardStream.innerHTML = `Integrated BA BEd<br>(Honours: ${subject})`;
    } else {
      cardStream.textContent = `Arts (Honours: ${subject})`;
    }

    const currentSession = sessionInput.value.trim() || "2024-2027";
    cardSession.textContent = currentSession;

    // Mobile camera scan text payload
    const qrPayload = `GMU WELCOME PARTY PASS\nRoll: ${cardRoll.textContent}\nName: ${cardName.textContent}\nStream: ${subject}\nSession: ${currentSession}\nEntry Status: VERIFIED (PAID)`;
    refreshQrCode(qrPayload);
  }

  sessionInput.addEventListener('input', syncCard);
  subjectSelect.addEventListener('change', syncCard);
  courseRadios.forEach(r => r.addEventListener('change', syncCard));

  // STEP 1: VERIFY (BATCH YEAR + ROLL NO NO-CLASH LOGIC)
  verifyBtn.addEventListener('click', async () => {
    const rawInput = rollInput.value.trim().toUpperCase();
    if (!rawInput) {
      showStatus("Please enter your Roll No (e.g. BA24-035 or BA23-035)!", "error");
      return;
    }

    // Validation: Check karein ki user ne batch year include kiya hai ya nahi
    const digitsOnly = rawInput.replace(/\D/g, "");
    if (digitsOnly.length < 5 && !rawInput.includes("21") && !rawInput.includes("22") && !rawInput.includes("23") && !rawInput.includes("24") && !rawInput.includes("25")) {
      showStatus("⚠️ Please include your batch year (e.g. BA24-035, BA23-035) to avoid batch clash!", "error");
      return;
    }

    showStatus("Connecting to GMU database & verifying...", "loading");
    verifyBtn.disabled = true;

    try {
      const response = await fetch(`${SCRIPT_URL}?action=check&roll=${encodeURIComponent(rawInput)}`, {
        method: "GET",
        redirect: "follow"
      });
      const result = await response.json();

      if (!result.success || !result.found) {
        showStatus("❌ Roll Number not registered in department list!", "error");
        verifyBtn.disabled = false;
        return;
      }

      // Check Payment Status
      if (result.paymentStatus !== "PAID") {
        showStatus(`❌ Payment Pending for ${result.name}! Please clear party dues first.`, "error");
        verifyBtn.disabled = false;
        return;
      }

      // Check One-Time Download Restriction
      if (result.downloadCount >= 1) {
        showStatus(`❌ ID Card already downloaded for ${result.name}! Re-download blocked.`, "error");
        verifyBtn.disabled = false;
        return;
      }

      // Successful Verification
      isVerified = true;
      verifiedOfficialRoll = result.matchedRoll;
      nameInput.value = result.name;

      // Smart Session Auto-Suggestion based on Batch Year (Still fully editable)
      if (!sessionInput.value) {
        if (verifiedOfficialRoll.includes("25")) {
          sessionInput.value = "2025-2028";
        } else if (verifiedOfficialRoll.includes("24")) {
          sessionInput.value = "2024-2027";
        } else if (verifiedOfficialRoll.includes("23")) {
          sessionInput.value = "2023-2026";
        } else if (verifiedOfficialRoll.includes("22")) {
          sessionInput.value = "2022-2025";
        } else {
          sessionInput.value = "2024-2027";
        }
      }

      showStatus(`✅ Verified: ${result.name} (${verifiedOfficialRoll}). Fill info and download.`, "success");

      // Unlock Form Controls
      idForm.classList.add('unlocked');
      photoInput.disabled = false;
      subjectSelect.disabled = false;
      sessionInput.disabled = false;
      downloadBtn.disabled = false;
      printBtn.disabled = false;
      courseRadios.forEach(r => r.disabled = false);

      syncCard();

    } catch (err) {
      console.error(err);
      showStatus("Network Error: Could not reach Google Sheets. Please retry.", "error");
    } finally {
      verifyBtn.disabled = false;
    }
  });

  // PHOTO UPLOAD & PASSPORT CROPPER
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        cropImageTarget.src = event.target.result;
        cropModal.style.display = 'flex';

        if (cropper) cropper.destroy();

        cropper = new Cropper(cropImageTarget, {
          aspectRatio: 2.5 / 2.8,
          viewMode: 1,
          autoCropArea: 0.95,
          background: false,
          guides: true
        });
      };
      reader.readAsDataURL(file);
    }
  });

  btnApplyCrop.addEventListener('click', () => {
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({ width: 300, height: 336 });
      cardPhoto.src = canvas.toDataURL('image/png');
      cropModal.style.display = 'none';
      cropper.destroy();
      cropper = null;
    }
  });

  btnCancelCrop.addEventListener('click', () => {
    cropModal.style.display = 'none';
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    photoInput.value = '';
  });

  // PRINT
  printBtn.addEventListener('click', () => {
    if (!isVerified) return;
    window.print();
  });

  // DOWNLOAD & LOCK DATA IN GOOGLE SHEET
  downloadBtn.addEventListener('click', async () => {
    if (!isVerified) return;

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Securing & Generating...";

    try {
      // 1. Google Sheet mein Download Count +1 mark karein
      await fetch(`${SCRIPT_URL}?action=markDownload&roll=${encodeURIComponent(verifiedOfficialRoll)}`, {
        method: "GET",
        redirect: "follow"
      });

      // 2. High-Res PNG Capture (Exact 5.3cm x 8.5cm card dimensions)
      const cardElement = document.getElementById('idCard');
      const canvas = await html2canvas(cardElement, {
        scale: 4,
        useCORS: true,
        allowTaint: true
      });

      const link = document.createElement('a');
      link.download = `${verifiedOfficialRoll}_ID_CARD.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showStatus("✅ Card downloaded! Your Roll Number is now locked.", "success");
      idForm.classList.remove('unlocked');
      downloadBtn.textContent = "Downloaded (Locked)";
      photoInput.disabled = true;
      sessionInput.disabled = true;

    } catch (err) {
      console.error(err);
      alert("Download error! Please check network and retry.");
      downloadBtn.disabled = false;
      downloadBtn.textContent = "Download ID Card (PNG)";
    }
  });

  syncCard();
});
