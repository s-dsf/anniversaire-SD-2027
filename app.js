const form = document.querySelector('#rsvpForm');
const success = document.querySelector('#success');
const rsvpIntro = document.querySelector('.rsvp-intro');
const successMessage = document.querySelector('#successMessage');
const submitButton = form.querySelector('.submit');
const values = { adults: 1, children: 0 };

// URL du Google Apps Script (à garder à jour)
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2iRe6GvjgrKUSEcm6dos8ZX8jog7pM9gOHPnkj1XVlLbo59VCt0PQALJ9Kw92DU42/exec';

/**
 * Récupère les données sauvegardées en localStorage
 */
function getSavedData() {
  const saved = localStorage.getItem('anniversaire-rsvp');
  return saved ? JSON.parse(saved) : null;
}

/**
 * Remplit le formulaire avec les données sauvegardées
 */
function populateFormWithSavedData() {
  const savedData = getSavedData();
  if (!savedData) return;

  // Remplir les champs simples
  form.elements.name.value = savedData.name || '';
  form.elements.phone.value = savedData.phone || '';
  form.elements.email.value = savedData.email || '';
  form.elements.attendance.value = savedData.attendance || 'oui';
  form.elements.arrival.value = savedData.arrival || 'jeudi 6 mai';
  form.elements.arrivalTime.value = savedData.arrivalTime || '';
  form.elements.departure.value = savedData.departure || 'dimanche 9 mai';
  form.elements.departureTime.value = savedData.departureTime || '';
  form.elements.transport.value = savedData.transport || '';
  form.elements.sleeping.value = savedData.sleeping || 'oui';
  form.elements.arrivalStation.value = savedData.arrivalStation || '';
  form.elements.food.value = savedData.food || 'aucun';
  form.elements.message.value = savedData.message || '';

  // Restaurer le nombre d'adultes et d'enfants
  values.adults = parseInt(savedData.adults) || 1;
  values.children = parseInt(savedData.children) || 0;
  document.querySelector('#adultsValue').textContent = values.adults;
  document.querySelector('#childrenValue').textContent = values.children;
  form.elements.adults.value = values.adults;
  form.elements.children.value = values.children;

  // Afficher/masquer les champs de présence
  if (savedData.attendance === 'non') {
    document.querySelector('.attendance-fields').style.display = 'none';
  }

  renderGuestDetails();
}

/**
 * Crée dynamiquement les champs pour les noms des invités
 */
function renderGuestDetails() {
  const fields = [];
  const savedData = getSavedData();
  
  // Ajouter les champs pour les adultes
  for (let index = 1; index <= values.adults; index += 1) {
    const savedName = savedData?.guests?.find(g => g.type === 'adulte' && g.name)?.name || '';
    fields.push(
      `<label>Prénom de l'adulte ${index}<input required name="adultName${index}" placeholder="Prénom" value="${savedName || ''}" /></label>`
    );
  }
  
  // Ajouter les champs pour les enfants
  for (let index = 1; index <= values.children; index += 1) {
    const savedChild = savedData?.guests?.find(g => g.type === 'enfant' && g.name);
    const savedName = savedChild?.name || '';
    const savedAge = savedChild?.age || '';
    fields.push(
      `<label>Prénom de l'enfant ${index}<input required name="childName${index}" placeholder="Prénom" value="${savedName || ''}" /></label>` +
      `<label>Âge de l'enfant ${index}<input required type="number" min="0" max="18" name="childAge${index}" placeholder="Âge" value="${savedAge || ''}" /></label>`
    );
  }
  
  document.querySelector('#guestDetails').innerHTML = fields.join('');
}

/**
 * Gère les boutons +/- pour ajouter/retirer des invités
 */
document.querySelectorAll('[data-step]').forEach(button => {
  button.addEventListener('click', () => {
    const key = button.dataset.step;
    const delta = Number(button.dataset.delta);
    const minValue = key === 'adults' ? 1 : 0; // Au moins 1 adulte
    const maxValue = 10; // Max 10 personnes pour éviter les abus
    
    values[key] = Math.max(minValue, Math.min(maxValue, values[key] + delta));
    document.querySelector(`#${key}Value`).textContent = values[key];
    form.elements[key].value = values[key];
    renderGuestDetails();
  });
});

/**
 * Gère l'affichage/masquage des champs conditionnels
 */
document.querySelectorAll('input[name="attendance"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const attendanceFields = document.querySelector('.attendance-fields');
    if (radio.value === 'oui' && radio.checked) {
      attendanceFields.style.display = 'block';
    } else if (radio.value === 'non' && radio.checked) {
      attendanceFields.style.display = 'none';
    }
  });
});

/**
 * Soumet le formulaire et envoie les données
 */
form.addEventListener('submit', async event => {
  event.preventDefault();
  
  // Vérifier la validité du formulaire
  if (!form.reportValidity()) return;

  // Désactiver le bouton pendant l'envoi
  submitButton.disabled = true;
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Envoi en cours…';

  try {
    // Collecter les données du formulaire
    const formData = Object.fromEntries(new FormData(form));
    
    // Construire un tableau d'objets pour chaque personne
    const guests = [];
    
    // Ajouter les adultes
    for (let index = 1; index <= values.adults; index++) {
      const adultName = formData[`adultName${index}`];
      if (adultName) {
        guests.push({
          name: adultName,
          type: 'adulte',
          age: null
        });
      }
    }
    
    // Ajouter les enfants
    for (let index = 1; index <= values.children; index++) {
      const childName = formData[`childName${index}`];
      const childAge = formData[`childAge${index}`];
      if (childName && childAge) {
        guests.push({
          name: childName,
          type: 'enfant',
          age: parseInt(childAge)
        });
      }
    }
    
    // Créer un objet de données global (pour infos générales)
    const globalData = {
      confirmedAt: new Date().toISOString(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      attendance: formData.attendance,
      arrival: formData.arrival || '',
      arrivalTime: formData.arrivalTime || '',
      departure: formData.departure || '',
      departureTime: formData.departureTime || '',
      transport: formData.transport || '',
      adults: values.adults,
      children: values.children,
      guests: guests,
      sleeping: formData.sleeping || '',
      arrivalStation: formData.arrivalStation || '',
      food: formData.food || '',
      message: formData.message || ''
    };
    
    // Vérifier si c'est une modification
    const savedData = getSavedData();
    const isModification = savedData && savedData.email === globalData.email;
    globalData.isModification = isModification;
    
    // Sauvegarder localement (backup)
    localStorage.setItem('anniversaire-rsvp', JSON.stringify(globalData));

    console.log('📤 Envoi des données:', globalData);

    // Envoyer les données globales au Google Apps Script
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(globalData)
    });

    console.log('📨 Réponse du serveur:', response.status, response.statusText);
    const responseText = await response.text();
    console.log('📋 Contenu de la réponse:', responseText);

    if (!response.ok) {
      console.warn('⚠️ Réponse serveur non-ok:', response.status, response.statusText);
    }

    // Message de succès personnalisé
    const isComing = formData.attendance === 'oui';
    if (isModification) {
      successMessage.innerHTML = isComing
        ? `<strong>${formData.name}</strong>, ta réponse a été mise à jour ! 🎉<br><br>Un email de confirmation t'a été envoyé à <strong>${formData.email}</strong>.`
        : `<strong>${formData.name}</strong>, ta réponse a bien été modifiée ! 💌<br><br>Un email de confirmation t'a été envoyé à <strong>${formData.email}</strong>.`;
    } else {
      successMessage.innerHTML = isComing
        ? `<strong>${formData.name}</strong>, c'est noté ! 🎉<br><br>Un email de confirmation t'a été envoyé à <strong>${formData.email}</strong>. À très vite pour fêter ça !`
        : `<strong>${formData.name}</strong>, merci beaucoup pour ta réponse ! 💌<br><br>Un email de confirmation t'a été envoyé à <strong>${formData.email}</strong>.`;
    }

  } catch (error) {
    // Gestion des erreurs
    console.error('❌ Erreur lors de l\'envoi:', error);
    successMessage.innerHTML = `
      <strong>Oups !</strong><br><br>
      Ta réponse a bien été sauvegardée sur cet appareil, mais n'a pas pu être envoyée à nos serveurs.<br><br>
      <small>Essaie de rafraîchir la page et de réessayer. Si le problème persiste, contacte-nous directement.</small>
    `;
  } finally {
    // Réactiver le bouton et afficher le succès
    submitButton.disabled = false;
    submitButton.textContent = originalText;
    
    form.classList.add('hidden');
    rsvpIntro.classList.add('hidden');
    success.classList.remove('hidden');
  }
});

/**
 * Permet de modifier sa réponse
 */
document.querySelector('#editResponse').addEventListener('click', () => {
  success.classList.add('hidden');
  form.classList.remove('hidden');
  rsvpIntro.classList.remove('hidden');
  window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
});

// Initialisation
populateFormWithSavedData();
