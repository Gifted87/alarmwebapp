// --- Global variable for the install prompt event ---
let deferredInstallPrompt = null;
console.log('[PWA Install] Script start. deferredInstallPrompt initial value:', deferredInstallPrompt);

// --- PWA Installation UI Functions ---

// Function to show the custom install promotion popup
function showInstallPromotion() {
    // *** ADDED CHECK: Only proceed if the deferredInstallPrompt is available ***
    if (!deferredInstallPrompt) {
        console.warn('[PWA Install] showInstallPromotion() called, but deferredInstallPrompt is null. Installation not available yet. Aborting show.');
        // Ensure popup remains hidden if the prompt isn't ready
        hideInstallPromotion(); // Make sure it's hidden if called prematurely
        return; // Stop execution here
    }
    // *** END OF ADDED CHECK ***

    const installPopup = document.getElementById('installPopup');
    if (installPopup) {
        console.log('[PWA Install] Attempting to show install popup (deferredInstallPrompt exists).');
        // Only remove 'hidden' if it's actually present
        if (installPopup.classList.contains('hidden')) {
            installPopup.classList.remove('hidden');
        }
    } else {
         console.error('[PWA Install] Cannot show popup - element not found!');
    }
}

// Function to hide the custom install promotion popup
function hideInstallPromotion() {
    const installPopup = document.getElementById('installPopup');
    if (installPopup) {
        // Only add 'hidden' if it's not already present
        if (!installPopup.classList.contains('hidden')) {
            console.log('[PWA Install] Attempting to hide install popup.');
            installPopup.classList.add('hidden');
        }
    }
     else {
         console.error('[PWA Install] Cannot hide popup - element not found!');
     }
}

// Function to check current installation status and hide promotion if installed
function checkInstallationStatus() {
    console.log('[PWA Install] Checking installation status...');
    // Check using standard media query
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('[PWA Install] App is running in standalone mode (installed). Hiding promotion.');
        hideInstallPromotion();
    // Check iOS specific property (less reliable but a fallback)
    } else if (window.navigator.standalone === true) {
         console.log('[PWA Install] App is running in standalone mode (iOS navigator.standalone). Hiding promotion.');
         hideInstallPromotion();
    } else {
        console.log('[PWA Install] App is running in browser mode.');
        // *** REMOVED call to showInstallPromotion() from here ***
        // We now rely solely on the 'beforeinstallprompt' event listener to trigger showing the popup.
        // If the app is not installed, we do nothing here regarding showing the popup.
        // We could optionally ensure it's hidden on load if desired:
        // hideInstallPromotion();
    }
}


// --- Listener for beforeinstallprompt ---
// This listener MUST be added early, ideally before the DOMContentLoaded listener below.
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA Install] "beforeinstallprompt" event fired!');
    // Prevent the default browser mini-infobar
    e.preventDefault();
    // Stash the event object - this makes the install possible
    deferredInstallPrompt = e;
    console.log('[PWA Install] Stashed event:', deferredInstallPrompt);
    // **Important:** Call the function to show the *custom* popup NOW that the event is ready
    // This call will pass the check inside showInstallPromotion because deferredInstallPrompt is now set.
    showInstallPromotion();
});

// --- Main script logic after DOM is loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM fully loaded and parsed');

    // --- DOM Elements ---
    const simNumberInput = document.getElementById('simNumber');
    const statusIndicator = document.getElementById('statusIndicator');
    const mainToggleButton = document.getElementById('mainToggleButton');
    const toggleDescription = document.getElementById('toggleDescription');
    const activateButton = document.getElementById('activateButton');
    const deactivateButton = document.getElementById('deactivateButton');
    const numberListContainer = document.getElementById('numberListContainer');
    const installPopup = document.getElementById('installPopup'); // Needed by install listeners
    const installButton = document.getElementById('installButton'); // Needed by install listeners
    const installDismissButton = document.getElementById('installDismissButton'); // Needed by install listeners

    // Verify install elements were found (important for PWA functionality)
    if (!installPopup) console.error('[App Error] Install popup element (#installPopup) not found!');
    if (!installButton) console.error('[App Error] Install button element (#installButton) not found!');
    if (!installDismissButton) console.error('[App Error] Install dismiss button element (#installDismissButton) not found!');


    const MAX_NUMBERS = 5;
    let numberInputs = []; // To hold references to the dynamically created inputs

    // --- State Management ---
    let appAlarmState = localStorage.getItem('appAlarmState') || 'unknown';
    let targetSimNumber = localStorage.getItem('targetSimNumber') || '';
    let phoneNumbers = JSON.parse(localStorage.getItem('phoneNumbers')) || Array(MAX_NUMBERS).fill('');

    // --- Initialization ---
    function initializeApp() {
        console.log('[App] Initializing App UI...');
        if(simNumberInput) {
            simNumberInput.value = targetSimNumber;
        } else {
            console.warn("[App Warn] simNumberInput element not found.");
        }

        if(numberListContainer) {
            numberListContainer.innerHTML = ''; // Clear previous entries
            numberInputs = []; // Reset input references
            for (let i = 0; i < MAX_NUMBERS; i++) {
                const row = document.createElement('div');
                row.className = 'number-row';

                const label = document.createElement('label');
                label.htmlFor = `numberInput-${i}`;
                label.textContent = `Nr. ${i}:`;

                const input = document.createElement('input');
                input.type = 'tel';
                input.id = `numberInput-${i}`;
                input.placeholder = 'Enter number';
                input.value = phoneNumbers[i] || '';
                input.autocomplete = 'tel';
                // Add listener to save on change
                input.addEventListener('change', savePhoneNumbers);

                const button = document.createElement('button');
                button.className = 'update-single-button';
                button.textContent = 'Update';
                button.dataset.index = i; // Store index for the click handler
                button.addEventListener('click', handleSingleUpdateClick);

                row.appendChild(label);
                row.appendChild(input);
                row.appendChild(button);
                numberListContainer.appendChild(row);
                numberInputs.push(input); // Store reference
            }
        } else {
            console.error("[App Error] numberListContainer element not found!");
        }

        updateUI(); // Set initial UI state based on loaded values
        setupInstallListeners(); // Setup listeners for the custom install/dismiss buttons
        checkInstallationStatus(); // Check if already installed and hide promo if necessary
        console.log('[App] App Initialized.');
    }

    // --- UI Update Function ---
    function updateUI() {
        console.log(`[App UI] Updating UI. State: ${appAlarmState}, SIM: ${targetSimNumber}`);

        // Status Indicator Text and Color
        if (statusIndicator) {
            switch (appAlarmState) {
                case 'active':
                    statusIndicator.textContent = 'Alarm Status: ACTIVE';
                    statusIndicator.className = 'status-indicator status-active';
                    break;
                case 'inactive':
                    statusIndicator.textContent = 'Alarm Status: INACTIVE';
                    statusIndicator.className = 'status-indicator status-inactive';
                    break;
                default:
                    statusIndicator.textContent = 'Alarm Status: Unknown';
                    statusIndicator.className = 'status-indicator status-unknown';
                    break;
            }
        } else {
             console.warn("[App Warn] statusIndicator element not found.");
        }


        // Main Toggle Button Appearance and Description
        if (mainToggleButton && toggleDescription) {
            mainToggleButton.classList.remove('active', 'inactive', 'unknown');
            switch (appAlarmState) {
                case 'active':
                    mainToggleButton.classList.add('active');
                    toggleDescription.textContent = 'Tap to Deactivate';
                    break;
                case 'inactive':
                    mainToggleButton.classList.add('inactive');
                    toggleDescription.textContent = 'Tap to Activate';
                    break;
                default:
                    mainToggleButton.classList.add('unknown');
                    toggleDescription.textContent = 'Tap to Refresh Status (Not Implemented)'; // Or handle unknown state appropriately
                    break;
            }
        } else {
            if (!mainToggleButton) console.warn("[App Warn] mainToggleButton element not found.");
            if (!toggleDescription) console.warn("[App Warn] toggleDescription element not found.");
        }


        // Activate/Deactivate Button States (Optional: Disable based on state)
         if (activateButton) activateButton.disabled = appAlarmState === 'active';
         if (deactivateButton) deactivateButton.disabled = appAlarmState === 'inactive';

        console.log("[App UI] UI Update complete.");
    }

    // --- SMS Functionality ---
    function sendSms(messageBody) {
        if (!targetSimNumber) {
            alert('Please enter the Alarm Module SIM number first.');
            console.warn('[SMS] Send attempt failed: Target SIM number is missing.');
            if(simNumberInput) simNumberInput.focus();
            return;
        }
        if (!messageBody) {
            alert('Cannot send empty message.');
            console.error('[SMS] Send attempt failed: Message body is empty.');
            return;
        }

        // Basic validation for common SIM format, adjust as needed
        const simPattern = /^\+?[0-9\s\-]{7,}$/; // Very basic: allows +, digits, spaces, hyphens, min 7 digits
        if (!simPattern.test(targetSimNumber)) {
             alert('Invalid SIM number format. Please check.');
             console.warn('[SMS] Send attempt failed: Invalid SIM format:', targetSimNumber);
             if(simNumberInput) simNumberInput.focus();
             return;
        }


        const separator = navigator.platform.includes('iOS') ? '&' : '?';
        const smsLink = `sms:${targetSimNumber}${separator}body=${encodeURIComponent(messageBody)}`;

        console.log(`[SMS] Attempting to send SMS. Link: ${smsLink}`);
        // Use window.location.href for broader compatibility
        window.location.href = smsLink;
    }

    // --- State Update & Persistence ---
    function setAppAlarmState(newState) {
        if (appAlarmState !== newState) {
            console.log(`[App State] State changing from ${appAlarmState} to ${newState}`);
            appAlarmState = newState;
            localStorage.setItem('appAlarmState', newState);
            updateUI(); // Reflect the change in the UI
        } else {
             console.log(`[App State] State already ${newState}. No change.`);
        }
    }

    function savePhoneNumbers() {
        console.log('[App Storage] Saving phone numbers...');
        const currentNumbers = numberInputs.map(input => input.value.trim());
        phoneNumbers = currentNumbers; // Update the global array
        localStorage.setItem('phoneNumbers', JSON.stringify(phoneNumbers));
        console.log('[App Storage] Phone numbers saved:', phoneNumbers);
    }

    // --- Core Event Listeners ---
    if (simNumberInput) {
        simNumberInput.addEventListener('change', (event) => {
            const newSimNumber = event.target.value.trim();
             console.log(`[App Event] SIM number changed to: ${newSimNumber}`);
            targetSimNumber = newSimNumber;
            localStorage.setItem('targetSimNumber', targetSimNumber);
        });
    }

    if (mainToggleButton) {
        mainToggleButton.addEventListener('click', () => {
            console.log('[App Event] Main toggle button clicked.');
            if (appAlarmState === 'active') {
                sendSms('end'); // Command to deactivate
                 // Optimistic UI update (or wait for confirmation if possible)
                 setAppAlarmState('inactive');
            } else if (appAlarmState === 'inactive') {
                sendSms('activate'); // Command to activate
                 // Optimistic UI update
                 setAppAlarmState('active');
            } else {
                // Handle 'unknown' state - maybe send a status check command?
                 alert('Alarm status is unknown. Use Activate/Deactivate buttons or implement status check.');
                 console.log('[App Event] Main toggle clicked while state is unknown.');
                 // sendSms('STATUS?'); // Example status check command
            }
        });
    }

    if (activateButton) {
        activateButton.addEventListener('click', () => {
            console.log('[App Event] Activate button clicked.');
            sendSms('activate');
            setAppAlarmState('active'); // Optimistic update
        });
    }

    if (deactivateButton) {
        deactivateButton.addEventListener('click', () => {
            console.log('[App Event] Deactivate button clicked.');
            sendSms('end');
            setAppAlarmState('inactive'); // Optimistic update
        });
    }

    // Handler for individual number update buttons
    function handleSingleUpdateClick(event) {
        const index = parseInt(event.target.dataset.index, 10);
        console.log(`[App Event] Update button clicked for index: ${index}`);
        if (isNaN(index) || index < 0 || index >= numberInputs.length) {
             console.error(`[App Error] Invalid index on update button: ${event.target.dataset.index}`);
             return;
        }

        const numberToSet = numberInputs[index].value.trim();
        if (!numberToSet) {
             alert(`Please enter a number for Nr. ${index} before updating.`);
             console.warn(`[App Event] Update attempt failed: Number at index ${index} is empty.`);
             numberInputs[index].focus();
             return;
        }

        // Format validation (optional but recommended)
        const phonePattern = /^\+?[0-9\s\-]{7,}$/; // Same basic pattern as SIM
        if (!phonePattern.test(numberToSet)) {
            alert(`Invalid phone number format for Nr. ${index}. Please check.`);
            console.warn(`[App Event] Update attempt failed: Invalid phone format at index ${index}:`, numberToSet);
            numberInputs[index].focus();
            return;
        }

const newIndex = index + 1;
        // Assuming the command format is SET<index>:<number>, e.g., SET0:123456789
        const command = `SET ${newIndex},${numberToSet}`;
        sendSms(command);
        // Also save all numbers locally when one is updated/sent
        savePhoneNumbers();
    }

    // --- PWA Install Button Listeners ---
    function setupInstallListeners() {
        console.log('[PWA Install] Setting up install button listeners...');

        // Use the elements found during DOMContentLoaded
        if (installButton) {
            installButton.addEventListener('click', async () => {
                console.log('[PWA Install] Custom install button clicked.');
                // Ensure the prompt event is still available (it should be if button is visible)
                if (!deferredInstallPrompt) {
                    console.warn('[PWA Install] Install button clicked, but deferredInstallPrompt is null. This should not happen if the button is visible. Hiding button.');
                    alert("Installation cannot be prompted at this time. The option might have expired. Please reload.");
                    hideInstallPromotion(); // Hide button as prompt is no longer valid
                    return;
                }

                // Hide the custom popup first
                hideInstallPromotion();

                console.log('[PWA Install] Calling deferredInstallPrompt.prompt()...');
                deferredInstallPrompt.prompt(); // Show the native browser prompt

                // Wait for the user to respond
                try {
                    const { outcome } = await deferredInstallPrompt.userChoice;
                    console.log(`[PWA Install] User choice outcome: ${outcome}`);
                     // outcome is 'accepted' or 'dismissed'

                    // Important: Clear the deferred prompt variable. It can only be used once.
                    deferredInstallPrompt = null;
                    console.log('[PWA Install] deferredInstallPrompt cleared.');

                } catch (error) {
                    console.error('[PWA Install] Error awaiting userChoice:', error);
                     // Clear the prompt even if there was an error
                    deferredInstallPrompt = null;
                }
            });
        } else {
            console.error("[PWA Install] Install button element not found, cannot add listener.")
        }

        if (installDismissButton) {
            installDismissButton.addEventListener('click', () => {
                console.log('[PWA Install] Install popup dismiss button clicked.');
                hideInstallPromotion();
                // Optional: Remember dismissal so it doesn't pop up again immediately in this session
                // sessionStorage.setItem('installDismissed', 'true');
                // Note: The browser itself often tracks dismissals and might not fire 'beforeinstallprompt' again for a while.
            });
        } else {
             console.error("[PWA Install] Dismiss button element not found, cannot add listener.")
        }
    }


    // Listener for successful installation (fired by the browser)
    window.addEventListener('appinstalled', () => {
        console.log('🎉 [PWA Install] "appinstalled" event fired! PWA was installed.');
        // Hide the install promotion controls as they are no longer needed
        hideInstallPromotion();
        // Clear the deferredPrompt variable as it's no longer valid
        deferredInstallPrompt = null;
    });

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        // Use window.load event to ensure the page is fully loaded before registering SW
        window.addEventListener('load', () => {
            console.log('[App] Window loaded, attempting Service Worker registration...');
            navigator.serviceWorker.register('/sw.js') // Ensure this path is correct relative to the origin
                .then(registration => {
                    console.log('✅ [SW] Registration successful! Scope:', registration.scope);
                    // Optional: Add logic to listen for SW updates
                    // registration.onupdatefound = () => { ... };
                })
                .catch(error => {
                    console.error('❌ [SW] Registration failed:', error);
                });
        });
    } else {
        console.warn('[App] Service workers are not supported in this browser.');
    }

    // --- Initial Application Load ---
    initializeApp();

}); // End DOMContentLoaded Event Listener
