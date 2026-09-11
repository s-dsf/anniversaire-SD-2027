const form = document.querySelector('#rsvpForm');
const success = document.querySelector('#success');
const rsvpIntro = document.querySelector('.rsvp-intro');
const successMessage = document.querySelector('#successMessage');
const submitButton = form.querySelector('.submit');
const values = { adults: 1, children: 0 };

// URL du Google Apps Script (à garder à jour)
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMSb3IOqzkVif7PzBhOQT3hKVoH6O_RO0S2LcIq2L_VMn6BuhgoHZ_vRhIUebaCBK4/exec';

/**
 * Crée dynamiquement les champs pour les noms des invités
 */
function renderGuestDetails() {
  const fields = [];
  
  // Ajouter les champs pour les adultes
  for (let index = 1; index <= values.adults; index += 1) {
    fields.push(
      `<label>Prénom de l'adulte ${index}<input required name="adultName${index}" placeholder="Prénom" /></label>`
    );
  }
  
  // Ajouter les champs pour les enfants
  for (let index = 1; index <= values.children; index += 1) {
    fields.push(
      `<label>Prénom de l'enfant ${index}<input required name="childName${index}" placeholder="Prénom" /></label>` +
      `<label>Âge de l'enfant ${index}<input required type="number" min="0" max="18" name="childAge${index}" placeholder="Âge" /></label>`
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
    
    // Créer un tableau de lignes à ajouter au Google Sheet
    const rows = [];
    
    // Ajouter une ligne pour chaque adulte
    for (let index = 1; index <= values.adults; index++) {
      const adultName = formData[`adultName${index}`];
      if (adultName) {
        rows.push({
          'Reçu le': new Date().toLocaleString('fr-FR'),
          'Nom': adultName,
          'E-mail': formData.email || '',
          'Présence': formData.attendance === 'oui' ? 'Oui' : 'Non',
          'Arrivée': formData.attendance === 'oui' ? (formData.arrival || '') : '',
          'Départ': formData.attendance === 'oui' ? (formData.departure || '') : '',
          'Adultes': '',
          'Enfants': '',
          'Âges enfants': '',
          'Régime / allergies': formData.food || '',
          'Transport': formData.arrivalStation || '',
          'Message': formData.message || ''
        });
      }
    }
    
    // Ajouter une ligne pour chaque enfant
    for (let index = 1; index <= values.children; index++) {
      const childName = formData[`childName${index}`];
      const childAge = formData[`childAge${index}`];
      if (childName && childAge) {
        rows.push({
          'Reçu le': new Date().toLocaleString('fr-FR'),
          'Nom': childName,
          'E-mail': formData.email || '',
          'Présence': formData.attendance === 'oui' ? 'Oui' : 'Non',
          'Arrivée': formData.attendance === 'oui' ? (formData.arrival || '') : '',
          'Départ': formData.attendance === 'oui' ? (formData.departure || '') : '',
          'Adultes': '',
          'Enfants': '',
          'Âges enfants': `${childAge} ans`,
          'Régime / allergies': formData.food || '',
          'Transport': '',
          'Message': ''
        });
      }
    }
    
    // Si aucun invité n'a été ajouté, ajouter la personne principale
    if (rows.length === 0) {
      rows.push({
        'Reçu le': new Date().toLocaleString('fr-FR'),
        'Nom': formData.name || '',
        'E-mail': formData.email || '',
        'Présence': formData.attendance === 'oui' ? 'Oui' : 'Non',
        'Arrivée': formData.attendance === 'oui' ? (formData.arrival || '') : '',
        'Départ': formData.attendance === 'oui' ? (formData.departure || '') : '',
        'Adultes': '1',
        'Enfants': '0',
        'Âges enfants': '',
        'Régime / allergies': formData.food || '',
        'Transport': formData.arrivalStation || '',
        'Message': formData.message || ''
      });
    }
    
    // Sauvegarder localement (backup)
    localStorage.setItem('anniversaire-rsvp', JSON.stringify({ 
      contactName: formData.name,
      contactEmail: formData.email,
      rows: rows 
    }));

    // Envoyer chaque ligne au Google Apps Script
    for (const row of rows) {
      await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(row)
      });
    }

    // Message de succès personnalisé
    const isComing = formData.attendance === 'oui';
    successMessage.innerHTML = isComing
      ? `<strong>${formData.name}</strong>, c'est noté ! 🎉<br><br>Un email de confirmation t'a été envoyé à <strong>${formData.email}</strong>. À très vite pour fêter ça !`
      : `<strong>${formData.name}</strong>, merci beaucoup pour ta réponse ! 💌<br><br>Un email de confirmation t'a été envoyé à <strong>${formData.email}</strong>.`;

  } catch (error) {
    // Gestion des erreurs
    console.error('Erreur lors de l\'envoi:', error);
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
renderGuestDetails();
