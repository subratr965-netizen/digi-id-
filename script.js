document.addEventListener('DOMContentLoaded', () => {
  // Form inputs
  const nameInput = document.getElementById('nameInput');
  const rollInput = document.getElementById('rollInput');
  const subjectSelect = document.getElementById('subjectSelect');
  const sessionInput = document.getElementById('sessionInput');
  const courseRadios = document.querySelectorAll('input[name="courseType"]');
  const photoInput = document.getElementById('photoInput');

  // Preview elements
  const cardName = document.getElementById('cardName');
  const cardRoll = document.getElementById('cardRoll');
  const cardStream = document.getElementById('cardStream');
  const cardSession = document.getElementById('cardSession');
  const cardPhoto = document.getElementById('cardPhoto');

  // Cropper elements
  const cropModal = document.getElementById('cropModal');
  const cropImageTarget = document.getElementById('cropImageTarget');
  const btnApplyCrop = document.getElementById('btnApplyCrop');
  const btnCancelCrop = document.getElementById('btnCancelCrop');
  let cropper = null;

  // Live Sync
  function syncCard() {
    // Name
    cardName.textContent = nameInput.value.trim() ? nameInput.value.toUpperCase() : "STUDENT NAME";

    // Roll
    cardRoll.textContent = rollInput.value.trim() ? rollInput.value : "BA24-000";

    // Course + Honours Stream
    const selectedCourse = document.querySelector('input[name="courseType"]:checked').value;
    const subject = subjectSelect.value;

    if (selectedCourse === 'BED') {
      cardStream.innerHTML = `Integrated BA BEd<br>(Honours: ${subject})`;
      if (sessionInput.dataset.manual !== "true") {
        sessionInput.value = "2024-2028";
      }
    } else {
      cardStream.textContent = `Arts (Honours: ${subject})`;
      if (sessionInput.dataset.manual !== "true") {
        sessionInput.value = "2024-2027";
      }
    }

    // Session
    cardSession.textContent = sessionInput.value;
  }

  sessionInput.addEventListener('input', () => {
    sessionInput.dataset.manual = "true";
    syncCard();
  });

  nameInput.addEventListener('input', syncCard);
  rollInput.addEventListener('input', syncCard);
  subjectSelect.addEventListener('change', syncCard);
  courseRadios.forEach(r => {
    r.addEventListener('change', () => {
      sessionInput.dataset.manual = "false";
      syncCard();
    });
  });

  // Photo Cropping (Ratio 2.5cm / 2.8cm)
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
      const canvas = cropper.getCroppedCanvas({
        width: 320,
        height: 358
      });
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

  // Print
  document.getElementById('printBtn').addEventListener('click', () => {
    window.print();
  });

  // Download High-Res PNG
  document.getElementById('downloadBtn').addEventListener('click', () => {
    const card = document.getElementById('idCard');
    html2canvas(card, {
      scale: 4,
      useCORS: true
    }).then((canvas) => {
      const link = document.createElement('a');
      const filename = (nameInput.value.trim() || 'student').replace(/\s+/g, '_');
      link.download = `${filename}_ID_CARD.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  });

  syncCard();
});