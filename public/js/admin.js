const $ = (s, r = document) => r.querySelector(s);
const h = (tag, props = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k.includes('-') || k === 'role') el.setAttribute(k, v); else el[k] = v; } el.append(...kids); return el; };

// ---- Language: English or Romanian, remembered in this browser ----
const LANG = localStorage.getItem('adminLang') || ((navigator.language || '').toLowerCase().startsWith('ro') ? 'ro' : 'en');
const RO = {
  // shell
  'admin': 'administrare', 'Email': 'E-mail', 'Password': 'Parolă', 'Sign in': 'Autentificare', 'View site': 'Vezi site-ul', 'Change password': 'Schimbă parola', 'Sign out': 'Deconectare',
  'Appointments': 'Programări', 'Site text': 'Texte site', 'Images': 'Imagini', 'Services': 'Servicii', 'Team': 'Echipa', 'Reviews': 'Recenzii', 'Gallery': 'Galerie', 'Messages': 'Mesaje', 'My profile': 'Profilul meu',
  // common
  'Save': 'Salvează', 'Saved.': 'Salvat.', 'Delete': 'Șterge', 'This cannot be undone.': 'Această acțiune nu poate fi anulată.', 'Loading...': 'Se încarcă...', 'Choose an image first.': 'Alege mai întâi o imagine.', 'Uploading...': 'Se încarcă...', 'Add': 'Adaugă', 'Close': 'Închide', 'Name': 'Nume', 'Description': 'Descriere',
  // appointments
  'Previous day': 'Ziua anterioară', 'Next day': 'Ziua următoare', 'Day': 'Ziua', 'Previous month': 'Luna anterioară', 'Next month': 'Luna următoare', 'No appointments on this day.': 'Nu există programări în această zi.',
  'Reschedule': 'Reprogramează', 'Cancel': 'Anulează', 'Move appointment': 'Mută programarea', 'Choose a new time.': 'Alege o oră nouă.', 'No free times that day.': 'Nu sunt ore libere în acea zi.',
  'Cancel the appointment for {name}? They will be emailed.': 'Anulezi programarea pentru {name}? Clientul va primi un e-mail.',
  // site text
  'Site text and location': 'Texte și locație', 'Save changes': 'Salvează modificările', 'Saved. Reload the site to see it.': 'Salvat. Reîncarcă site-ul pentru a vedea modificările.',
  'Find the address on the map': 'Găsește adresa pe hartă', 'Searching...': 'Se caută...', 'Map preview': 'Previzualizare hartă',
  'No match. Try a fuller address, or type the coordinates in by hand.': 'Nicio potrivire. Încearcă o adresă mai completă sau introdu coordonatele manual.', 'Found. Check the map, then save.': 'Găsit. Verifică harta, apoi salvează.',
  'Hero (top of the page)': 'Secțiunea de sus (hero)', 'About': 'Despre noi', 'Section headings': 'Titlurile secțiunilor', 'Shop details': 'Detaliile centrului', 'Location': 'Locație', 'Social and footer': 'Rețele sociale și subsol', 'Privacy policy': 'Politica de confidențialitate',
  'Headline': 'Titlu', 'Intro text': 'Text de introducere', 'Booking button text': 'Text buton de programare', 'Heading': 'Titlu', 'Opening line': 'Prima frază', 'Your story': 'Povestea ta',
  'Prices': 'Prețuri', 'Testimonials': 'Recenzii', 'Contact': 'Contact', 'Shop name': 'Numele centrului', 'Phone': 'Telefon', 'Email shown on the site': 'E-mail afișat pe site', 'Currency shown with prices': 'Moneda afișată la prețuri', 'Opening hours': 'Program',
  'Address': 'Adresă', 'Latitude': 'Latitudine', 'Longitude': 'Longitudine', 'Map zoom (3 to 19)': 'Zoom hartă (3–19)', 'Instagram link': 'Link Instagram', 'Facebook link': 'Link Facebook', 'Footer text': 'Text din subsol', 'Privacy policy text': 'Textul politicii de confidențialitate',
  'Leave a blank line between paragraphs.': 'Lasă un rând liber între paragrafe.',
  "One line per row: label | hours. This is the text on the site; booking times come from each specialist's schedule in Team.": 'Un rând pe linie: etichetă | ore. Acesta este textul de pe site; orele de programare vin din programul fiecărei specialiste, la Echipa.',
  'Start a heading with ## and leave a blank line between paragraphs. This is a starting template: have it checked for your shop.': 'Începe un titlu cu ## și lasă un rând liber între paragrafe. Este un model de pornire: verifică-l pentru frizeria ta.',
  // images
  'Section images': 'Imagini de fundal', 'Photos are resized for the web automatically. Landscape photos at least 1600 px wide work best.': 'Fotografiile sunt redimensionate automat pentru web. Cele orizontale, late de cel puțin 1600 px, funcționează cel mai bine.',
  'Upload new image': 'Încarcă o imagine nouă', 'Go back to the original image': 'Revino la imaginea originală',
  'Hero background': 'Fundal secțiunea de sus', 'Services background': 'Fundal servicii', 'About background': 'Fundal despre noi', 'Prices background': 'Fundal prețuri', 'Testimonials background': 'Fundal recenzii',
  'A wide photo, at least 1600 px across. A dark layer is added so the white text stays readable.': 'O fotografie lată, de cel puțin 1600 px. Se adaugă un strat închis pentru ca textul alb să rămână lizibil.',
  'Dark photos work best. The default is a dark portrait that fades into the page.': 'Fotografiile închise funcționează cel mai bine. Imaginea implicită este un portret închis care se topește în pagină.',
  'The text over it is dark. Any photo you upload gets a light layer on top so the text stays readable.': 'Textul de deasupra este închis la culoare. Orice fotografie încărcată primește un strat deschis deasupra, ca textul să rămână lizibil.',
  'A dark layer is added so the white text stays readable.': 'Se adaugă un strat închis pentru ca textul alb să rămână lizibil.',
  'The text over it is dark. Any photo you upload gets a light layer on top.': 'Textul de deasupra este închis la culoare. Orice fotografie încărcată primește deasupra un strat deschis.',
  // services
  'Services and prices': 'Servicii și prețuri', 'Icon': 'Pictogramă', 'Short description': 'Descriere scurtă', 'Price': 'Preț', 'Duration in minutes': 'Durată în minute', 'Order on the page (1 comes first)': 'Ordinea pe pagină (1 apare primul)',
  'Offered by': 'Oferit de', 'Show on the site and allow booking': 'Afișează pe site și permite programări', 'Add a service': 'Adaugă un serviciu', 'Add service': 'Adaugă serviciul', 'hidden': 'ascuns', 'min': 'min',
  'This service has booking history, so it was hidden instead of deleted.': 'Acest serviciu are istoric de programări, așa că a fost ascuns, nu șters.',
  'scissors': 'foarfecă', 'razor': 'brici', 'brush': 'pensulă', 'clip': 'clemă',
  // team
  'Profile': 'Profil', 'Title': 'Funcție', 'About this specialist': 'Despre această specialistă', 'Shown over their photo on the site.': 'Afișat peste fotografie pe site.', 'Email for booking notifications': 'E-mail pentru notificări de programări',
  'Photo': 'Fotografie', 'Upload photo': 'Încarcă fotografia', 'Remove photo': 'Elimină fotografia', 'Weekly schedule (when clients can book)': 'Program săptămânal (când se pot face programări)', 'Save schedule': 'Salvează programul',
  'Days off': 'Zile libere', 'No days off booked.': 'Nicio zi liberă adăugată.', 'Remove': 'Elimină', 'Reason (optional)': 'Motiv (opțional)', 'Reason': 'Motiv', 'Add day off': 'Adaugă zi liberă', 'Day off': 'Zi liberă', 'Added.': 'Adăugat.',
  'Added, but {n} appointment(s) already booked that day were not cancelled. Move them in Appointments.': 'Adăugat, dar cele {n} programări deja făcute în acea zi nu au fost anulate. Mută-le din Programări.',
  'Add a team member': 'Adaugă un membru al echipei', 'works': 'lucrează', 'opens': 'deschide', 'closes': 'închide',
  'Monday': 'Luni', 'Tuesday': 'Marți', 'Wednesday': 'Miercuri', 'Thursday': 'Joi', 'Friday': 'Vineri', 'Saturday': 'Sâmbătă', 'Sunday': 'Duminică',
  'Sign-in for this specialist': 'Autentificare pentru această specialistă', 'With a login they can manage their own profile, schedule, photos and appointments.': 'Cu un cont își pot gestiona propriul profil, program, fotografii și programări.',
  'Sign-in email': 'E-mail de autentificare', 'New password (leave empty to keep the current one)': 'Parolă nouă (lasă gol pentru a păstra parola actuală)', 'Password (at least 10 characters)': 'Parolă (cel puțin 10 caractere)', 'Save login': 'Salvează contul',
  // reviews
  'Client reviews': 'Recenziile clienților', "The sample reviews are placeholders. Replace them with real ones, with your clients' permission.": 'Recenziile de exemplu sunt orientative. Înlocuiește-le cu unele reale, cu acordul clienților.',
  'Client name': 'Numele clientului', 'Line under the name (city, etc.)': 'Rând sub nume (oraș etc.)', 'Review': 'Recenzie', 'Order (1 comes first)': 'Ordine (1 apare prima)', 'Show on the site': 'Afișează pe site', 'Add a review': 'Adaugă o recenzie', 'Add review': 'Adaugă recenzia',
  // gallery
  'Photos of finished cuts. The gallery section appears on the site once there is at least one photo.': 'Fotografii cu tunsori terminate. Secțiunea de galerie apare pe site după ce există cel puțin o fotografie.',
  'Add a photo': 'Adaugă o fotografie', 'Specialist': 'Specialistă', 'No specialist': 'Fără specialistă', 'What it shows': 'Ce arată', 'Add photo': 'Adaugă fotografia',
  'Skin fade, beard line-up': 'Fade, contur barbă', 'Describe the photo for screen readers': 'Descrie fotografia pentru cititoarele de ecran',
  'No messages yet.': 'Încă nu sunt mesaje.',
  // credit and slots
  'Created by PumaBytes (alias Paula Beltag)': 'Creat de PumaBytes (alias Paula Beltag)', 'Already booked': 'Ocupat', 'Time has passed': 'Ora a trecut', 'Not available': 'Indisponibil',
  // dashboard
  'Dashboard': 'Panou de control', 'Period': 'Perioadă', 'Today': 'Azi', 'This week': 'Săptămâna aceasta', 'This month': 'Luna aceasta', 'Last month': 'Luna trecută', 'This year': 'Anul acesta', 'Custom': 'Personalizat',
  'From': 'De la', 'To': 'Până la', 'Show': 'Afișează', 'Completed': 'Efectuate', 'Upcoming': 'Viitoare', 'Cancelled': 'Anulate', 'Earned': 'Încasat', 'Expected': 'Estimat',
  'Average per appointment': 'Medie per programare', 'Cancellation rate': 'Rată de anulare', 'Appointments per specialist': 'Programări per specialistă', 'Revenue per specialist': 'Venit per specialistă',
  'Share of appointments by service': 'Programări pe servicii', 'Appointment status': 'Starea programărilor', 'No data in this period.': 'Nu sunt date în această perioadă.', 'Total': 'Total', 'Date': 'Data', 'Month': 'Luna', 'Revenue': 'Venit',
  'By specialist': 'Pe specialiste', 'Revenue per day': 'Venit pe zile', 'Revenue per month': 'Venit pe luni', 'Choose a shorter period (up to 62 days) to see the numbers per day.': 'Alege o perioadă mai scurtă (până la 62 de zile) pentru a vedea cifrele pe zile.',
  'Download': 'Descarcă', 'Separator': 'Separator', 'Comma (Google Sheets)': 'Virgulă (Google Sheets)', 'Semicolon (Excel with European settings)': 'Punct și virgulă (Excel cu setări europene)',
  'All appointments (CSV)': 'Toate programările (CSV)', 'Summary per specialist (CSV)': 'Rezumat per specialistă (CSV)', 'Per day (CSV)': 'Pe zile (CSV)', 'Per month (CSV)': 'Pe luni (CSV)',
  'Open the file in Google Sheets with File, Import, Upload, or double-click it to open it in Excel. The appointments file contains customers\' personal data: keep it safe.': 'Deschide fișierul în Google Sheets prin Fișier, Import, Încărcare, sau dă dublu clic pentru a-l deschide în Excel. Fișierul cu programări conține datele personale ale clienților: păstrează-l în siguranță.',
  'Earned counts appointments that have already taken place, expected counts those still ahead. Cancelled appointments are not counted. Prices are the ones saved when the appointment was booked.': 'Încasat înseamnă programările care au avut deja loc, estimat cele care urmează. Programările anulate nu sunt numărate. Prețurile sunt cele salvate la momentul programării.',
  'Choose a valid period.': 'Alege o perioadă validă.', 'Choose a period of at most one year.': 'Alege o perioadă de cel mult un an.', 'Unknown export.': 'Export necunoscut.',
  'appointments': 'programări',
  // image position
  'Image position': 'Poziția imaginii', 'Save position': 'Salvează poziția', 'Invalid position.': 'Poziție invalidă.',
  'Click or drag on the photo to choose the part that must stay visible when it is cropped.': 'Apasă sau trage pe fotografie pentru a alege partea care trebuie să rămână vizibilă la decupare.',
  'Photos are cropped to fit each section. Click the photo to mark the part that must always stay visible; the previews show the result on a computer and on a phone.': 'Fotografiile sunt decupate pentru a se potrivi fiecărei secțiuni. Apasă pe fotografie pentru a marca partea care trebuie să rămână mereu vizibilă; previzualizările arată rezultatul pe computer și pe telefon.',
  'This image is small ({w} px wide) and may look blurry. Use one at least {min} px wide.': 'Imaginea este mică (lățime {w} px) și poate arăta neclar. Folosește una cu lățimea de cel puțin {min} px.',
  'Desktop': 'Computer', 'Team card': 'Card echipă', 'Gallery tile': 'Miniatură galerie', 'Phone tile': 'Miniatură pe telefon',
  // password dialog
  'Current password': 'Parola actuală', 'New password (at least 10 characters)': 'Parolă nouă (cel puțin 10 caractere)',
  // messages from the server
  'Wrong email or password.': 'E-mail sau parolă greșite.', 'Could not sign in. Try again.': 'Autentificarea a eșuat. Încearcă din nou.', 'Your current password is wrong.': 'Parola actuală este greșită.',
  'Use at least 10 characters for the new password.': 'Folosește cel puțin 10 caractere pentru parola nouă.', 'Invalid date.': 'Dată invalidă.', 'Appointment not found.': 'Programarea nu a fost găsită.',
  'Choose a date and a time.': 'Alege o dată și o oră.', 'That time is not free.': 'Ora aleasă nu este liberă.', 'Latitude must be a number between -90 and 90.': 'Latitudinea trebuie să fie un număr între -90 și 90.',
  'Longitude must be a number between -180 and 180.': 'Longitudinea trebuie să fie un număr între -180 și 180.', 'Map zoom must be a whole number from 3 to 19.': 'Zoomul hărții trebuie să fie un număr întreg între 3 și 19.',
  'Enter a valid email address.': 'Introdu o adresă de e-mail validă.', 'Set both latitude and longitude, or leave both empty.': 'Completează atât latitudinea, cât și longitudinea, sau lasă-le pe ambele goale.',
  'Unknown image.': 'Imagine necunoscută.', 'Choose an image to upload.': 'Alege o imagine de încărcat.', 'Upload a JPEG, PNG or WebP image.': 'Încarcă o imagine JPEG, PNG sau WebP.',
  'That file is too large (10 MB maximum).': 'Fișierul este prea mare (maximum 10 MB).', 'Upload failed.': 'Încărcarea a eșuat.', 'Service not found.': 'Serviciul nu a fost găsit.', 'Team member not found.': 'Membrul echipei nu a fost găsit.',
  'You can only edit your own profile.': 'Îți poți edita doar propriul profil.', 'Enter a valid email address for notifications.': 'Introdu o adresă de e-mail validă pentru notificări.', 'Send seven days.': 'Trimite cele șapte zile.',
  'Each working day needs an opening time earlier than its closing time.': 'Fiecare zi lucrătoare are nevoie de o oră de deschidere mai devreme decât ora de închidere.', 'Choose a date.': 'Alege o dată.', 'Not found.': 'Nu a fost găsit.',
  'Enter a valid sign-in email.': 'Introdu un e-mail de autentificare valid.', 'That email already has a login.': 'Acest e-mail are deja un cont.', 'Use at least 10 characters for the password.': 'Folosește cel puțin 10 caractere pentru parolă.',
  'Set a password for the new login.': 'Setează o parolă pentru contul nou.', 'Pick a specialist from the list.': 'Alege o specialistă din listă.', 'Photo not found.': 'Fotografia nu a fost găsită.', 'Only the owner can do that.': 'Doar proprietarul poate face asta.',
  'Sign in required.': 'Trebuie să te autentifici.', 'Something went wrong.': 'Ceva nu a mers bine.', 'Something went wrong. Try again.': 'Ceva nu a mers bine. Încearcă din nou.',
};

Object.assign(RO, {
  'Forgot password?': 'Ai uitat parola?', 'Reset your password': 'Resetează-ți parola', 'Back to sign in': 'Înapoi la autentificare', 'Recovery code': 'Cod de recuperare', 'Set new password': 'Setează parola nouă',
  'Specialists: enter the recovery code you were shown when you set up your account. Your appointments stay readable.': 'Specialistele: introdu codul de recuperare primit la crearea contului. Programările tale rămân lizibile.',
  'New password (at least 12 characters)': 'Parolă nouă (cel puțin 12 caractere)', 'Password (at least 12 characters)': 'Parolă (cel puțin 12 caractere)', 'Repeat password': 'Repetă parola',
  'Password changed. Sign in with the new one.': 'Parola a fost schimbată. Autentifică-te cu cea nouă.', 'Welcome': 'Bine ai venit', 'Choose a password for': 'Alege o parolă pentru', 'Invitation not valid': 'Invitație invalidă', 'The two passwords are different.': 'Cele două parole sunt diferite.',
  'Checking your invitation...': 'Se verifică invitația...', 'Create my account': 'Creează-mi contul', 'Save your recovery code': 'Salvează-ți codul de recuperare', 'Continue to sign in': 'Continuă spre autentificare',
  'Only you will know this password, not the owner of the shop. It also protects your clients\' details, so make it long: a few words in a row work well.': 'Doar tu vei ști această parolă, nu și proprietarul salonului. Ea protejează și datele clienților tăi, așa că fă-o lungă: câteva cuvinte puse la rând merg bine.',
  'This code is shown once and cannot be shown again. If you forget your password, it is the only way to keep your appointment history. Without it, the owner can only reset your account, which erases that history.': 'Acest cod este afișat o singură dată. Dacă îți uiți parola, este singura cale de a-ți păstra istoricul programărilor. Fără el, proprietarul poate doar să-ți reseteze contul, ceea ce șterge istoricul.',
  'I saved the code somewhere safe (a password manager or on paper).': 'Am salvat codul într-un loc sigur (manager de parole sau pe hârtie).',
  'To confirm': 'De confirmat', 'Confirm': 'Confirmă', 'Decline': 'Refuză', 'Requests': 'Cereri', 'Upcoming': 'Viitoare', 'Dashboard': 'Panou', 'Notifications': 'Notificări', 'No requests waiting.': 'Nicio cerere în așteptare.', 'Nothing in the next 30 days.': 'Nimic în următoarele 30 de zile.',
  'Decline the request from {name}? They will be emailed.': 'Refuzi cererea de la {name}? Va primi un e-mail.',
  'These customers asked for a time and wait for your call. The hour stays reserved for them until you confirm or decline (or 24 hours pass).': 'Acești clienți au cerut o oră și așteaptă apelul tău. Ora rămâne rezervată până confirmi sau refuzi (sau trec 24 de ore).',
  'New booking request': 'Cerere nouă de programare', 'Open your dashboard to see who it is.': 'Deschide panoul ca să vezi cine este.',
  'Account': 'Cont', 'active': 'activ', 'invited': 'invitat', 'suspended': 'suspendat', 'Suspend': 'Suspendă', 'Reactivate': 'Reactivează', 'Delete...': 'Șterge...', 'Reset account...': 'Resetează contul...', 'New invitation link': 'Link nou de invitație', 'Invitation emailed.': 'Invitația a fost trimisă pe e-mail.', 'Invitation link': 'Link de invitație',
  'You can add or remove a specialist and suspend their account. You cannot see their appointments, customers, schedule or income: that stays private to the specialist.': 'Poți adăuga sau elimina o specialistă și îi poți suspenda contul. Nu poți vedea programările, clienții, programul sau încasările lui: acestea rămân private pentru specialistă.',
  'Send this link to the specialist yourself. It works once, for 3 days. Do not open it yourself: whoever opens it chooses the password.': 'Trimite tu linkul specialistei. Funcționează o singură dată, 3 zile. Nu-l deschide tu: cine îl deschide alege parola.',
  'The specialist gets an invitation email and chooses their own password.': 'Specialista primește o invitație pe e-mail și își alege singur parola.', 'Email sending is not set up, so you get a link to pass on to the specialist, who then chooses their own password.': 'Trimiterea de e-mailuri nu este configurată, deci primești un link pe care îl dai specialistei, care își alege apoi parola.',
  'Delete this specialist?': 'Ștergi această specialistă?', 'Reset this account?': 'Resetezi acest cont?', 'Delete for good': 'Șterge definitiv', 'Reset account': 'Resetează contul', 'Cancel': 'Anulează', 'Your password': 'Parola ta', 'Type the sign-in email to confirm': 'Scrie e-mailul de autentificare pentru confirmare',
  'This permanently deletes the specialist, their photos, schedule and every appointment. It cannot be undone, and customers with upcoming bookings are not told.': 'Șterge definitiv specialista, pozele, programul și toate programările. Nu se poate anula, iar clienții cu programări viitoare nu sunt anunțați.',
  'Use this only if the specialist lost BOTH their password and recovery code. Their appointment history is erased (nobody can read it any more) and they get a new invitation.': 'Folosește asta doar dacă specialista a pierdut ȘI parola, ȘI codul de recuperare. Istoricul programărilor se șterge (nimeni nu-l mai poate citi) și primește o nouă invitație.',
  'Notifications and booking style': 'Notificări și mod de programare', 'When someone books': 'Când cineva se programează', 'Instant: bookings are confirmed automatically': 'Imediat: programările se confirmă automat', 'Request: I call the customer to confirm': 'Cerere: sun eu clientul pentru confirmare',
  'In request mode the hour is held for the customer and you get a message with their name, email and phone.': 'În modul cerere, ora este rezervată clientului, iar tu primești un mesaj cu numele, e-mailul și telefonul lui.',
  'My messages are written in': 'Mesajele mele sunt scrise în', 'Send to': 'Trimite la', 'Send a test': 'Trimite un test', 'Alerts in this browser': 'Alerte în acest browser',
  'Test sent. Save first if you just changed something.': 'Test trimis. Salvează mai întâi dacă tocmai ai schimbat ceva.', 'or tap here to open it': 'sau apasă aici ca să-l deschizi', 'This page updates when it is connected. The code works for 10 minutes.': 'Pagina se actualizează când este conectat. Codul este valabil 10 minute.',
  'Beep and show a notification when a new request arrives while this page is open (checked every 30 seconds).': 'Sunet și notificare când sosește o cerere nouă cât timp pagina este deschisă (verificare la 30 de secunde).',
  'This is private to each specialist.': 'Aceste date sunt private pentru fiecare specialistă.', 'Only the owner can do that.': 'Doar proprietarul poate face asta.', 'Too many attempts. Try again later.': 'Prea multe încercări. Încearcă mai târziu.',
});

Object.assign(RO, {
  'WhatsApp number': 'Număr WhatsApp', 'verified': 'verificat', 'connected': 'conectat', 'Remove this number': 'Elimină acest număr', 'Verify': 'Verifică', 'Code we sent to your WhatsApp': 'Codul trimis pe WhatsApp-ul tău',
  'My WhatsApp number (with country code)': 'Numărul meu de WhatsApp (cu prefix de țară)', 'Send me a code on WhatsApp': 'Trimite-mi un cod pe WhatsApp', 'Code sent. Check your WhatsApp.': 'Cod trimis. Verifică WhatsApp-ul.',
  'Tip: save the shop WhatsApp number in your contacts and send it a "hi" first. It helps WhatsApp see this as a normal conversation.': 'Sfat: salvează numărul WhatsApp al salonului în contacte și trimite-i mai întâi un „salut”. Ajută WhatsApp să vadă o conversație normală.',
  "The shop's WhatsApp is not connected yet. The owner links it in the WhatsApp tab. Until then, the email message includes a link that opens WhatsApp chat with the customer.": 'WhatsApp-ul salonului nu este conectat încă. Proprietarul îl leagă din fila WhatsApp. Până atunci, e-mailul conține un link care deschide chatul WhatsApp cu clientul.',
  'The WhatsApp library is not installed on this server yet.': 'Biblioteca WhatsApp nu este instalată încă pe acest server.',
  'With WhatsApp on and request mode, you can answer a request message with YES (or DA) to confirm it, or NO (or NU) to decline it.': 'Cu WhatsApp activ și modul cerere, poți răspunde la mesajul unei cereri cu DA ca să o confirmi sau cu NU ca să o refuzi.',
  "So you do not have to keep opening this page. Each message has the customer's name, email and phone, the day and hour, and links to call or WhatsApp them. Messages travel through the service you pick (your email provider or WhatsApp) in readable form, so only turn on what you are comfortable with.": 'Ca să nu mai trebuiască să deschizi mereu această pagină. Fiecare mesaj conține numele, e-mailul și telefonul clientului, ziua și ora, plus linkuri pentru apel sau WhatsApp. Mesajele trec prin serviciul ales (furnizorul de e-mail sau WhatsApp) în formă lizibilă, așa că activează doar ce te simți confortabil.',
  'Shop WhatsApp number': 'Numărul WhatsApp al salonului', 'Connected as': 'Conectat ca', 'Disconnect': 'Deconectează', 'Connecting...': 'Se conectează...', 'Get a pairing code': 'Obține un cod de asociere', 'WhatsApp number to link (with country code)': 'Număr WhatsApp de legat (cu prefix de țară)',
  'Disconnect the shop WhatsApp? Specialists stop getting WhatsApp messages until you link it again.': 'Deconectezi WhatsApp-ul salonului? Specialistele nu mai primesc mesaje pe WhatsApp până îl legi din nou.',
  'On the phone with this number: WhatsApp > Settings > Linked devices > Link a device > "Link with phone number instead", then type this code:': 'Pe telefonul cu acest număr: WhatsApp > Setări > Dispozitive conectate > Conectează un dispozitiv > „Conectează cu numărul de telefon”, apoi scrie acest cod:',
  'Waiting for you to enter the code on the phone...': 'Se așteaptă să introduci codul pe telefon...', 'Read this first': 'Citește mai întâi',
  "Known problem: with current WhatsApp versions the Baileys library often fails with “Couldn’t link device”, for both QR and pairing code. If it fails, it is not your phone. Do not spend hours on it: each specialist can use the simple route (CallMeBot) in Notifications. This uses Baileys, an unofficial way of using WhatsApp. It is against WhatsApp's terms and the number can be banned. Use a dedicated number, not a personal one. The phone linked here also shows every message sent from it, including the customers' details, so keep it with someone who should see them. The linked session is stored on the server in data/whatsapp-auth: keep that folder private.": 'Problemă cunoscută: cu versiunile actuale de WhatsApp, biblioteca Baileys eșuează adesea cu „Couldn\'t link device”, atât cu QR, cât și cu cod. Dacă eșuează, nu e vina telefonului tău. Nu pierde ore: fiecare specialistă poate folosi varianta simplă (CallMeBot) din Notificări. Se folosește Baileys, un mod neoficial de a folosi WhatsApp. Este împotriva regulilor WhatsApp și numărul poate fi blocat. Folosește un număr dedicat, nu unul personal. Telefonul legat aici afișează și fiecare mesaj trimis, inclusiv datele clienților, deci ține-l la cineva care are voie să le vadă. Sesiunea legată este păstrată pe server în data/whatsapp-auth: ține acel folder privat.',
  'The WhatsApp library is not installed. Run: npm install': 'Biblioteca WhatsApp nu este instalată. Rulează: npm install', 'That number is not on WhatsApp.': 'Acest număr nu este pe WhatsApp.', 'That code is not right.': 'Codul nu este corect.',
});

Object.assign(RO, {
  'Show a QR code': 'Arată un cod QR', 'Option 1 (recommended): scan a QR code with the phone.': 'Varianta 1 (recomandată): scanează un cod QR cu telefonul.', 'Option 2: link with a pairing code instead.': 'Varianta 2: leagă cu un cod de asociere.',
  'On the phone with this number: WhatsApp > Settings > Linked devices > Link a device, then scan this QR code with the camera:': 'Pe telefonul cu acest număr: WhatsApp > Setări > Dispozitive conectate > Conectează un dispozitiv, apoi scanează acest cod QR cu camera:',
  'The code renews by itself every few seconds. Keep this page open.': 'Codul se reînnoiește singur la câteva secunde. Ține pagina deschisă.', 'Waiting for WhatsApp to show a QR code...': 'Se așteaptă codul QR de la WhatsApp...',
  'WhatsApp, simple (no linking)': 'WhatsApp, simplu (fără legare)', 'WhatsApp through the shop number': 'WhatsApp prin numărul salonului', 'CallMeBot API key': 'Cheia API CallMeBot', 'API key from CallMeBot': 'Cheia API de la CallMeBot', '(saved)': '(salvată)', 'Save and send a test message': 'Salvează și trimite un mesaj de test', 'Remove': 'Elimină',
  'Open callmebot.com/blog/free-api-whatsapp-messages and add the CallMeBot contact it shows (the number can change). Then send it exactly: I allow callmebot to send me messages': 'Deschide callmebot.com/blog/free-api-whatsapp-messages și adaugă contactul CallMeBot afișat acolo (numărul se poate schimba). Apoi trimite-i exact: I allow callmebot to send me messages',
  'It answers with your API key. Type your WhatsApp number and that key below.': 'Îți răspunde cu cheia ta API. Scrie mai jos numărul tău de WhatsApp și acea cheie.',
  'CallMeBot is a free third-party service: your messages pass through it and arrive from its number. You cannot reply to them; use the confirm / decline link inside the message.': 'CallMeBot este un serviciu terț gratuit: mesajele tale trec prin el și vin de la numărul lui. Nu poți răspunde; folosește linkul de confirmare / refuz din mesaj.',
  'WhatsApp (CallMeBot)': 'WhatsApp (CallMeBot)', 'WhatsApp (shop number)': 'WhatsApp (numărul salonului)',
});
const PATTERNS = [
  [/^(.+) is required\.$/, m => `${t(m[1])} este obligatoriu.`],
  [/^(.+) must be a whole number from (\d+) to (\d+)\.$/, m => `${t(m[1])} trebuie să fie un număr întreg între ${m[2]} și ${m[3]}.`],
  [/^(.+) must start with https:\/\/$/, m => `${t(m[1])} trebuie să înceapă cu https://`],
];
// Translate an English phrase (the English text is the key). Unknown phrases stay as they are.
function t(s) {
  if (LANG !== 'ro' || typeof s !== 'string') return s;
  if (s in RO) return RO[s];
  for (const [re, fn] of PATTERNS) { const m = re.exec(s); if (m) return fn(m); }
  return s;
}
document.documentElement.lang = LANG;
document.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.textContent); });
document.querySelectorAll('[data-lang]').forEach(b => {
  b.setAttribute('aria-pressed', String(b.dataset.lang === LANG));
  b.onclick = () => { localStorage.setItem('adminLang', b.dataset.lang); location.reload(); };
});

async function api(url, body, method = body ? 'POST' : 'GET') {
  const isForm = body instanceof FormData;
  const csrf = document.body.dataset.csrf; // proves a change comes from this signed-in page
  const headers = { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF': csrf } : {}) };
  const res = await fetch(url, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.endsWith('/login')) location.href = '/admin/login';
  if (!res.ok) throw new Error(t(data.error || 'Something went wrong.'));
  return data;
}
const A = '/admin/api';

// ---- Sign in ----
const login = $('#login');
if (login) login.addEventListener('submit', async e => {
  e.preventDefault();
  try { await api(`${A}/login`, { email: login.elements.email.value, password: login.elements.password.value }); location.href = '/admin'; }
  catch (err) { $('#msg').textContent = err.message; }
});


// Forgot password (barbers): the recovery code from account setup opens the key, then a new password is set.
const forgot = $('#forgot'), recover = $('#recover');
if (forgot && recover) {
  forgot.onclick = () => { login.hidden = true; recover.hidden = false; };
  $('#backlogin').onclick = () => { recover.hidden = true; login.hidden = false; };
  recover.addEventListener('submit', async e => {
    e.preventDefault();
    const f = recover.elements;
    try { await api(`${A}/recover`, { email: f.email.value, code: f.code.value, password: f.password.value }); recover.hidden = true; login.hidden = false; $('#msg').className = 'msg ok'; $('#msg').textContent = t('Password changed. Sign in with the new one.'); }
    catch (err) { $('#rmsg').textContent = err.message; }
  });
}

// Invitation page: the barber chooses their own password and is shown a recovery code once.
if (document.body.dataset.setup) {
  const token = location.hash.slice(1); history.replaceState(null, '', location.pathname);
  const form = $('#setup'), msg = $('#msg');
  api(`${A}/setup/check`, { token }).then(w => { $('#welcome').textContent = `${t('Welcome')}, ${w.name}. ${t('Choose a password for')} ${w.email}.`; })
    .catch(err => { form.replaceChildren(h('h1', { textContent: t('Invitation not valid') }), h('p', { textContent: err.message })); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = form.elements;
    if (f.password.value !== f.again.value) { msg.textContent = t('The two passwords are different.'); return; }
    try {
      const r = await api(`${A}/setup`, { token, password: f.password.value });
      form.hidden = true; $('#recovery').hidden = false; $('#code').textContent = r.recoveryCode;
      $('#saved').onchange = ev => $('#go').setAttribute('aria-disabled', String(!ev.target.checked));
    } catch (err) { msg.textContent = err.message; }
  });
}

if (document.body.dataset.owner !== undefined) {
const OWNER = document.body.dataset.owner === '1';
const panel = $('#panel');
const today = () => Dates.iso(new Date());

// ---- Form building blocks ----
function fieldEl(f) {
  const label = t(f.label);
  if (f.type === 'checks') {
    return h('fieldset', { className: 'checks' }, h('legend', { textContent: label }), ...f.options.map(([v, text]) =>
      h('label', { className: 'check' }, h('input', { type: 'checkbox', name: f.name, value: v, checked: (f.value || []).includes(v) }), t(text))));
  }
  if (f.type === 'checkbox') return h('label', { className: 'check' }, h('input', { type: 'checkbox', name: f.name, checked: !!f.value }), label);
  let input;
  if (f.type === 'textarea') input = h('textarea', { name: f.name, rows: f.rows || 3, value: f.value ?? '' });
  else if (f.type === 'select') input = h('select', { name: f.name }, ...f.options.map(([v, text]) => h('option', { value: v, textContent: t(text), selected: String(v) === String(f.value) })));
  else input = h('input', { type: f.type || 'text', name: f.name, value: f.value ?? '', ...(f.attrs || {}) });
  if (f.placeholder) input.placeholder = t(f.placeholder);
  return h('label', {}, label, input, ...(f.hint ? [h('small', { className: 'hint', textContent: t(f.hint) })] : []));
}
// A field that exists in English and in Romanian: name and name_ro, side by side.
const bi = (name, label, vals, extra = {}) => [
  { name, label: `${t(label)} (EN)`, value: vals[name], half: true, ...extra },
  { name: `${name}_ro`, label: `${t(label)} (RO)`, value: vals[`${name}_ro`], half: true, ...extra },
];
function readForm(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name || el.type === 'file' || el.tagName === 'BUTTON') continue;
    if (el.type === 'checkbox' && el.value !== 'on') { (o[el.name] ||= []); if (el.checked) o[el.name].push(Number(el.value)); }
    else o[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return o;
}
function say(msgEl, ok, text) { msgEl.className = ok ? 'msg ok' : 'msg'; msgEl.textContent = text; }

// A form with a Save button (and optional Delete) that reports success or errors inline.
function editor({ fields, onSave, onDelete, saveText = 'Save', deleteText = 'Delete' }) {
  const form = h('form', { className: 'stack' });
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].half && fields[i + 1]?.half) { form.append(h('div', { className: 'grid2' }, fieldEl(fields[i]), fieldEl(fields[i + 1]))); i++; }
    else form.append(fieldEl(fields[i]));
  }
  const msg = h('p', { className: 'msg', role: 'status' });
  form.append(msg, h('div', { className: 'actions' }, h('button', { className: 'btn', type: 'submit', textContent: t(saveText) }),
    ...(onDelete ? [h('button', { className: 'linkbtn danger', type: 'button', textContent: t(deleteText), onclick: async () => {
      if (!confirm(`${t(deleteText)}? ${t('This cannot be undone.')}`)) return;
      try { await onDelete(); } catch (err) { say(msg, false, err.message); }
    } })] : [])));
  form.addEventListener('submit', async e => {
    e.preventDefault(); say(msg, false, '');
    try { await onSave(readForm(form)); say(msg, true, t('Saved.')); } catch (err) { say(msg, false, err.message); }
  });
  return form;
}

// Upload control: choose a file, send it, then call done(result).
function uploader(label, url, done, extra = {}) {
  const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': t(label) });
  const msg = h('p', { className: 'msg', role: 'status' });
  const btn = h('button', { className: 'btn secondary', type: 'button', textContent: t(label), onclick: async () => {
    if (!file.files[0]) return say(msg, false, t('Choose an image first.'));
    const fd = new FormData(); fd.append('photo', file.files[0]);
    for (const [k, v] of Object.entries(extra)) fd.append(k, typeof v === 'function' ? v() : v);
    btn.disabled = true; say(msg, true, t('Uploading...'));
    try { done(await api(url, fd)); say(msg, true, t('Saved.')); } catch (err) { say(msg, false, err.message); } finally { btn.disabled = false; }
  } });
  return h('div', { className: 'stack' }, file, h('div', { className: 'actions' }, btn), msg);
}
// ---- Focal point picker ----
// Shows the photo. Click or drag (or use the arrow keys) to mark the part that must stay visible when the photo is
// cropped. The frames underneath show the result in the shapes the site uses, on a computer and on a phone.
const FRAMES = {
  wide: [['Desktop', '16 / 10', 230], ['Phone', '9 / 19', 92]],
  square: [['Team card', '1 / 1', 150]],
  tile: [['Gallery tile', '4 / 5', 120], ['Phone tile', '1 / 1', 100]],
};
function focalPicker({ url, pos, frames, minWidth = 0, onSave }) {
  const parse = v => { const m = /^([\d.]+)% ([\d.]+)%$/.exec(v || ''); return m ? [+m[1], +m[2]] : [50, 50]; };
  let [x, y] = parse(pos);
  const img = h('img', { alt: '', draggable: false });
  const dot = h('span', { className: 'focal-dot' });
  const stage = h('div', { className: 'focal-stage', tabIndex: 0 }, img, dot);
  stage.setAttribute('role', 'group'); stage.setAttribute('aria-label', t('Image position'));
  const warn = h('p', { className: 'msg', role: 'status' });
  const previews = [];
  const frameBox = h('div', { className: 'frames' }, ...frames.map(([label, ratio, width]) => {
    const im = h('img', { alt: '' }); previews.push(im);
    const box = h('div', { className: 'frame' }, im); box.style.width = `${width}px`; box.style.aspectRatio = ratio;
    return h('figure', { className: 'frame-wrap' }, box, h('figcaption', { textContent: t(label) }));
  }));
  const msg = h('p', { className: 'msg', role: 'status' });
  const clamp = v => Math.max(0, Math.min(100, v));
  const fmt = () => `${Math.round(x * 100) / 100}% ${Math.round(y * 100) / 100}%`;
  const render = () => { dot.style.left = `${x}%`; dot.style.top = `${y}%`; for (const im of previews) im.style.objectPosition = `${x}% ${y}%`; };
  function setImage(newUrl, newPos) {
    for (const im of [img, ...previews]) { if (newUrl) im.src = newUrl; else im.removeAttribute('src'); }
    [x, y] = parse(newPos); render();
  }
  img.addEventListener('load', () => {
    warn.textContent = minWidth && img.naturalWidth < minWidth
      ? t('This image is small ({w} px wide) and may look blurry. Use one at least {min} px wide.').replace('{w}', img.naturalWidth).replace('{min}', minWidth) : '';
  });
  let dragging = false;
  const moveTo = e => { const r = img.getBoundingClientRect(); x = clamp((e.clientX - r.left) / r.width * 100); y = clamp((e.clientY - r.top) / r.height * 100); render(); };
  stage.addEventListener('pointerdown', e => { dragging = true; stage.setPointerCapture(e.pointerId); moveTo(e); });
  stage.addEventListener('pointermove', e => { if (dragging) moveTo(e); });
  stage.addEventListener('pointerup', () => { dragging = false; });
  stage.addEventListener('pointercancel', () => { dragging = false; });
  stage.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 2;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) { e.preventDefault(); x = clamp(x + d[0]); y = clamp(y + d[1]); render(); }
  });
  const save = h('button', { className: 'btn secondary', type: 'button', textContent: t('Save position'), onclick: async () => {
    try { await onSave(fmt()); say(msg, true, t('Saved.')); } catch (err) { say(msg, false, err.message); }
  } });
  const root = h('div', { className: 'focal stack' }, h('p', { className: 'hint', textContent: t('Click or drag on the photo to choose the part that must stay visible when it is cropped.') }),
    stage, warn, frameBox, h('div', { className: 'actions' }, save), msg);
  root.setImage = setImage;
  setImage(url, pos);
  return root;
}
const dateField = (opts = {}) => Dates.field({ lang: LANG, prevLabel: t('Previous month'), nextLabel: t('Next month'), ...opts });

// ---- Dashboard ----
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.append(...kids); return e; };
const PALETTE = ['#b47f41', '#3b2a25', '#6a8caf', '#7a9e7e', '#c0504d', '#8e6bb0', '#d4a64a', '#5b5b5b'];
const num = n => new Intl.NumberFormat(LANG === 'ro' ? 'ro-RO' : 'en-GB').format(n);
const percent = (v, total) => (total ? Math.round((v / total) * 1000) / 10 : 0);

// A ring chart with the total in the middle and a legend with values and percentages.
function donut({ title, items, big, small }) {
  const card = h('div', { className: 'chartcard' }, h('h3', { textContent: title }));
  const colored = items.map((i, k) => ({ ...i, color: PALETTE[k % PALETTE.length] }));
  const total = colored.reduce((n, i) => n + i.value, 0);
  if (!total) { card.append(h('p', { className: 'hint', textContent: t('No data in this period.') })); return card; }
  const R = 100 / (2 * Math.PI); // circumference 100, so a segment's length is its percentage
  let used = 0;
  const rings = colored.filter(i => i.value > 0).map(i => {
    const share = (i.value / total) * 100;
    const c = sv('circle', { cx: 21, cy: 21, r: R, fill: 'none', stroke: i.color, 'stroke-width': 6, 'stroke-dasharray': `${share} ${100 - share}`, 'stroke-dashoffset': 25 - used });
    used += share;
    c.append(sv('title', {}, `${i.label}: ${i.text ?? i.value} (${percent(i.value, total)}%)`));
    return c;
  });
  const svg = sv('svg', { viewBox: '0 0 42 42', class: 'donut', role: 'img', 'aria-label': title },
    sv('circle', { cx: 21, cy: 21, r: R, fill: 'none', stroke: '#eee', 'stroke-width': 6 }), ...rings,
    sv('text', { x: 21, y: 21, 'text-anchor': 'middle', class: 'donut-big' }, String(big)), sv('text', { x: 21, y: 26, 'text-anchor': 'middle', class: 'donut-small' }, small));
  const legend = h('ul', { className: 'legend' }, ...colored.map(i => {
    const sw = h('span', { className: 'swatch' }); sw.style.background = i.color;
    return h('li', {}, sw, h('span', { className: 'lname', textContent: i.label }), h('span', { className: 'lval', textContent: `${i.text ?? i.value} \u00b7 ${percent(i.value, total)}%` }));
  }));
  card.append(h('div', { className: 'donutrow' }, svg, legend));
  return card;
}

const niceMax = v => { const mag = 10 ** Math.floor(Math.log10(v)); return ([1, 2, 2.5, 5, 10].map(k => k * mag).find(x => x >= v)) || v; };
// Stacked bars: earned (dark gold) and expected (light gold). rows: [{ label, done, expected, tip }]
function barChart({ title, rows, every = 1 }) {
  const W = 640, H = 220, L = 46, B = 24, top = 10, iw = W - L - 8, ih = H - B - top;
  const max = niceMax(Math.max(1, ...rows.map(r => r.done + r.expected)));
  const step = iw / rows.length, bw = Math.max(2, step * 0.7), y = v => top + ih - (v / max) * ih;
  const kids = [];
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    kids.push(sv('line', { x1: L, x2: W - 8, y1: y(v), y2: y(v), stroke: '#e6e0d6' }), sv('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'axis' }, num(Math.round(v))));
  }
  rows.forEach((r, k) => {
    const x = L + k * step + (step - bw) / 2, hd = (r.done / max) * ih, he = (r.expected / max) * ih;
    const g = sv('g', {}, sv('title', {}, r.tip));
    if (r.done) g.append(sv('rect', { x, y: top + ih - hd, width: bw, height: hd, fill: '#b47f41' }));
    if (r.expected) g.append(sv('rect', { x, y: top + ih - hd - he, width: bw, height: he, fill: '#e3c99c' }));
    kids.push(g);
    if (k % every === 0) kids.push(sv('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis' }, r.label));
  });
  return h('div', { className: 'chartwrap' }, sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'bars', role: 'img', 'aria-label': title }, ...kids));
}

function table(head, rows, foot) {
  const tb = h('table', { className: 'data' }, h('thead', {}, h('tr', {}, ...head.map(x => h('th', { textContent: x })))), h('tbody', {}, ...rows.map(r => h('tr', {}, ...r.map(c => (c instanceof Node ? c : h('td', { textContent: c })))))));
  if (foot) tb.append(h('tfoot', {}, h('tr', {}, ...foot.map(c => (c instanceof Node ? c : h('td', { textContent: c }))))));
  return h('div', { className: 'tablewrap' }, tb);
}

async function dashboard() {
  const first = await api(`${A}/stats`); // the current month, which also tells us today's date in the shop
  const today = first.today, d0 = Dates.parse(today), iso = Dates.iso;
  const y = d0.getFullYear(), m = d0.getMonth(), dow = (d0.getDay() + 6) % 7;
  const week0 = new Date(d0); week0.setDate(d0.getDate() - dow); const week1 = new Date(week0); week1.setDate(week0.getDate() + 6);
  const presets = {
    today: [today, today], week: [iso(week0), iso(week1)], month: [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))],
    lastmonth: [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))], year: [`${y}-01-01`, `${y}-12-31`],
  };
  const sel = h('select', { 'aria-label': t('Period') }, ...[['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['year', 'This year'], ['custom', 'Custom']].map(([v, l]) => h('option', { value: v, textContent: t(l) })));
  sel.value = 'month';
  const fromF = dateField({ value: first.range.from, label: t('From') }), toF = dateField({ value: first.range.to, label: t('To') });
  const show = h('button', { className: 'btn secondary', type: 'button', textContent: t('Show') });
  const custom = h('span', { className: 'row', hidden: true }, h('span', { textContent: t('From') }), fromF, h('span', { textContent: t('To') }), toF, show);
  const body = h('div', { className: 'stack' });
  const load = async (from, to) => {
    try { render(await api(`${A}/stats?from=${from}&to=${to}`)); } catch (e) { body.replaceChildren(h('p', { className: 'msg', textContent: e.message })); }
  };
  sel.onchange = () => { custom.hidden = sel.value !== 'custom'; if (sel.value !== 'custom') { const [a, b] = presets[sel.value]; fromF.value = a; toF.value = b; load(a, b); } };
  show.onclick = () => load(fromF.value, toF.value);

  function render(d) {
    const cur = d.currency, money = n => `${num(n)} ${cur}`, T = d.totals, name = b => b.name;
    const earned = T.revenue_done, expected = T.revenue_expected, all = T.total + T.cancelled;
    const kpi = (label, value, note) => h('div', { className: 'kpi' }, h('span', { className: 'kl', textContent: t(label) }), h('strong', { textContent: value }), ...(note ? [h('small', { className: 'hint', textContent: note })] : []));
    const parts = [
      h('p', { className: 'hint', textContent: `${Dates.fmt(d.range.from, LANG)} \u2013 ${Dates.fmt(d.range.to, LANG)}` }),
      h('div', { className: 'kpis' }, kpi('Appointments', num(T.total)), kpi('Completed', num(T.completed)), kpi('Upcoming', num(T.upcoming)),
        kpi('Cancelled', num(T.cancelled), all ? `${percent(T.cancelled, all)}% ${t('Cancellation rate').toLowerCase()}` : ''),
        kpi('Earned', money(earned)), kpi('Expected', money(expected)), kpi('Average per appointment', T.total ? money(Math.round((earned + expected) / T.total)) : '\u2013')),
      h('div', { className: 'charts' },
        donut({ title: t('Appointments per specialist'), items: d.barbers.map(b => ({ label: name(b), value: b.total })), big: T.total, small: t('Appointments').toLowerCase() }),
        donut({ title: t('Revenue per specialist'), items: d.barbers.map(b => ({ label: name(b), value: b.revenue_done + b.revenue_expected, text: money(b.revenue_done + b.revenue_expected) })), big: num(earned + expected), small: cur }),
        donut({ title: t('Share of appointments by service'), items: d.services.map(s => ({ label: (LANG === 'ro' && s.name_ro) || s.name, value: s.total })), big: T.total, small: t('Appointments').toLowerCase() }),
        donut({ title: t('Appointment status'), items: [{ label: t('Completed'), value: T.completed }, { label: t('Upcoming'), value: T.upcoming }, { label: t('Cancelled'), value: T.cancelled }], big: all, small: t('Appointments').toLowerCase() })),
      h('h2', { textContent: t('By specialist') }),
      table([t('Specialist'), t('Appointments'), t('Completed'), t('Upcoming'), t('Cancelled'), t('Earned'), t('Expected')],
        d.barbers.map(b => [b.name, num(b.total), num(b.completed), num(b.upcoming), num(b.cancelled), money(b.revenue_done), money(b.revenue_expected)]),
        [t('Total'), num(T.total), num(T.completed), num(T.upcoming), num(T.cancelled), money(earned), money(expected)]),
    ];

    // revenue per day (a bar chart for the period, and a table of the days that had appointments)
    const cell = (done, exp) => h('td', {}, document.createTextNode(num(done)), ...(exp ? [h('span', { className: 'exp', textContent: ` +${num(exp)}` })] : []));
    const matrix = (rows, key) => {
      const by = new Map();
      for (const r of rows) { const e = by.get(r[key]) || new Map(); e.set(r.barber_id, r); by.set(r[key], e); }
      return by;
    };
    const days = Math.round((Dates.parse(d.range.to) - Dates.parse(d.range.from)) / 864e5) + 1;
    parts.push(h('h2', { textContent: t('Revenue per day') }));
    if (days <= 62) {
      const byDay = matrix(d.daily, 'day'), chartRows = [];
      for (let i = 0; i < days; i++) {
        const dt = Dates.parse(d.range.from); dt.setDate(dt.getDate() + i); const key = iso(dt), e = byDay.get(key);
        const done = e ? [...e.values()].reduce((n, r) => n + r.revenue_done, 0) : 0, exp = e ? [...e.values()].reduce((n, r) => n + r.revenue_expected, 0) : 0;
        chartRows.push({ label: String(dt.getDate()), done, expected: exp, tip: `${Dates.fmt(key, LANG)}: ${money(done)}${exp ? ` + ${money(exp)}` : ''}` });
      }
      parts.push(barChart({ title: t('Revenue per day'), rows: chartRows, every: days > 31 ? 3 : 1 }));
      const dayRows = [...byDay.keys()].sort().map(key => {
        const e = byDay.get(key), rs = [...e.values()];
        return [Dates.fmt(key, LANG), ...d.barbers.map(b => (e.get(b.id) ? cell(e.get(b.id).revenue_done, e.get(b.id).revenue_expected) : h('td', { textContent: '\u2013' }))),
          cell(rs.reduce((n, r) => n + r.revenue_done, 0), rs.reduce((n, r) => n + r.revenue_expected, 0)), num(rs.reduce((n, r) => n + r.completed + r.upcoming, 0))];
      });
      parts.push(dayRows.length ? table([t('Date'), ...d.barbers.map(b => b.name), t('Total'), t('Appointments')], dayRows) : h('p', { className: 'hint', textContent: t('No data in this period.') }));
    } else parts.push(h('p', { className: 'hint', textContent: t('Choose a shorter period (up to 62 days) to see the numbers per day.') }));

    // revenue per month for the year the period ends in
    parts.push(h('h2', { textContent: `${t('Revenue per month')} ${d.year}` }));
    const byMonth = matrix(d.monthly, 'month'), monthFmt = new Intl.DateTimeFormat(LANG === 'ro' ? 'ro-RO' : 'en-GB', { month: 'short' });
    const mrows = [], mchart = [];
    for (let i = 0; i < 12; i++) {
      const key = `${d.year}-${String(i + 1).padStart(2, '0')}`, e = byMonth.get(key), rs = e ? [...e.values()] : [];
      const done = rs.reduce((n, r) => n + r.revenue_done, 0), exp = rs.reduce((n, r) => n + r.revenue_expected, 0), label = monthFmt.format(new Date(+d.year, i, 1));
      mchart.push({ label, done, expected: exp, tip: `${label} ${d.year}: ${money(done)}${exp ? ` + ${money(exp)}` : ''}` });
      mrows.push([label, ...d.barbers.map(b => (e && e.get(b.id) ? cell(e.get(b.id).revenue_done, e.get(b.id).revenue_expected) : h('td', { textContent: '\u2013' }))), cell(done, exp), num(rs.reduce((n, r) => n + r.completed + r.upcoming, 0))]);
    }
    parts.push(barChart({ title: `${t('Revenue per month')} ${d.year}`, rows: mchart }), table([t('Month'), ...d.barbers.map(b => b.name), t('Total'), t('Appointments')], mrows));

    // downloads
    const sep = h('select', { 'aria-label': t('Separator') }, h('option', { value: ',', textContent: t('Comma (Google Sheets)') }), h('option', { value: ';', textContent: t('Semicolon (Excel with European settings)') }));
    if (LANG === 'ro') sep.value = ';';
    const get = kind => () => { location.href = `${A}/export.csv?kind=${kind}&from=${d.range.from}&to=${d.range.to}&sep=${encodeURIComponent(sep.value)}&lang=${LANG}`; };
    parts.push(h('div', { className: 'card stack' }, h('h3', { textContent: t('Download') }),
      h('label', {}, t('Separator'), sep),
      h('div', { className: 'actions' }, ...[['appointments', 'All appointments (CSV)'], ['summary', 'Summary per specialist (CSV)'], ['daily', 'Per day (CSV)'], ['monthly', 'Per month (CSV)']].map(([k, l]) => h('button', { className: 'btn secondary', type: 'button', textContent: t(l), onclick: get(k) }))),
      h('p', { className: 'hint', textContent: t("Open the file in Google Sheets with File, Import, Upload, or double-click it to open it in Excel. The appointments file contains customers' personal data: keep it safe.") })),
      h('p', { className: 'hint', textContent: t('Earned counts appointments that have already taken place, expected counts those still ahead. Cancelled appointments are not counted. Prices are the ones saved when the appointment was booked.') }));
    body.replaceChildren(...parts);
  }
  panel.replaceChildren(h('h1', { textContent: t('Dashboard') }), h('div', { className: 'dayrow' }, sel, custom), body);
  render(first);
}

// ---- Appointments (private to each barber; the owner has no such tab) ----
const CC = document.body.dataset.cc || '40';
const waLink = phone => { let d = String(phone).replace(/[^\d+]/g, ''); d = d.startsWith('+') ? d.slice(1) : d.startsWith('00') ? d.slice(2) : d.startsWith('0') ? CC + d.slice(1) : d; return 'https://wa.me/' + d.replace(/\D/g, ''); };
let pendingCount = -1;
const beep = () => { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(); o.connect(c.destination); o.frequency.value = 880; o.start(); o.stop(c.currentTime + 0.25); } catch { /* no audio */ } };
const alertsOn = () => localStorage.getItem('alerts') === '1';

// One appointment. A request that still needs the specialist's call has Confirm / Decline buttons.
function apptRow(a, reload, withDate) {
  const box = h('div', { className: 'appt' });
  const run = fn => async () => { try { await fn(); reload(); } catch (e) { if (e.message) alert(e.message); } };
  function picker() {
    const open = box.querySelector('.picker'); if (open) return open.remove();
    let picked = null;
    const date = dateField({ value: a.date, min: today() });
    const slots = h('div', { className: 'slots' }), msg = h('p', { className: 'msg', role: 'alert' });
    const refresh = async () => {
      slots.replaceChildren(); picked = null;
      try {
        const { slots: list } = await api(`${A}/appointments/${a.id}/slots?date=${date.value}`);
        const why = { booked: t('Already booked'), past: t('Time has passed'), off: t('Not available') };
        if (!list.some(s => s.free)) slots.append(h('span', { className: 'hint', textContent: t('No free times that day.') }));
        for (const s of list) {
          const b = h('button', { type: 'button', className: 'slot' + (s.free ? '' : ' taken'), textContent: s.label, disabled: !s.free });
          b.setAttribute('aria-pressed', 'false');
          if (s.free) b.onclick = () => { slots.querySelectorAll('.slot').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); picked = s; };
          else b.title = why[s.reason] || '';
          slots.append(b);
        }
      } catch (e) { msg.textContent = e.message; }
    };
    date.addEventListener('change', refresh);
    const go = h('button', { className: 'btn', type: 'button', textContent: t('Move appointment'), onclick: async () => {
      if (!picked) return say(msg, false, t('Choose a new time.'));
      try { await api(`${A}/appointments/${a.id}/move`, { date: date.value, start_min: picked.start_min }); reload(); } catch (e) { say(msg, false, e.message); refresh(); }
    } });
    box.append(h('div', { className: 'picker' }, date, slots, msg, go)); refresh();
  }
  const svc = LANG === 'ro' && a.service_name_ro ? a.service_name_ro : a.service_name;
  const pending = a.status === 'pending';
  box.append(
    h('div', {}, h('strong', { textContent: `${withDate ? Dates.fmt(a.date, LANG) + ' ' : ''}${a.start}\u2013${a.end}` }), ...(pending ? [h('span', { className: 'badge pending', textContent: t('To confirm') })] : []), ` ${svc}`, h('br'),
      `${a.name}, `, h('a', { href: 'tel:' + a.phone, textContent: a.phone }), ' \u00b7 ', h('a', { href: waLink(a.phone), target: '_blank', rel: 'noopener noreferrer', textContent: 'WhatsApp' }),
      ...(a.email ? [' \u00b7 ', h('a', { href: 'mailto:' + a.email, textContent: a.email })] : [])),
    h('div', { className: 'actions' },
      ...(pending ? [h('button', { className: 'btn', type: 'button', textContent: t('Confirm'), onclick: run(() => api(`${A}/appointments/${a.id}/confirm`, {})) })] : []),
      h('button', { className: 'linkbtn', type: 'button', textContent: t('Reschedule'), onclick: picker }),
      h('button', { className: 'linkbtn danger', type: 'button', textContent: t(pending ? 'Decline' : 'Cancel'), onclick: run(async () => {
        if (!confirm(t((pending ? 'Decline the request from {name}? They will be emailed.' : 'Cancel the appointment for {name}? They will be emailed.')).replace('{name}', a.name))) throw new Error('');
        await api(`${A}/appointments/${a.id}/cancel`, {});
      }) })));
  return box;
}

async function appointments() {
  const day = dateField({ value: today(), label: t('Day') });
  const cols = h('div', { className: 'cols' });
  const shift = n => { const d = Dates.parse(day.value); d.setDate(d.getDate() + n); day.value = Dates.iso(d); load(); };
  day.addEventListener('change', () => load());
  async function load() {
    const { appointments: list } = await api(`${A}/appointments?date=${day.value}`);
    cols.replaceChildren();
    if (!list.length) return cols.append(h('p', { textContent: t('No appointments on this day.') }));
    cols.append(h('div', {}, ...list.map(a => apptRow(a, load))));
    pollPending();
  }
  panel.replaceChildren(h('h1', { textContent: t('Appointments') }),
    h('div', { className: 'dayrow' }, h('button', { className: 'btn secondary', type: 'button', textContent: t('Previous day'), onclick: () => shift(-1) }), day,
      h('button', { className: 'btn secondary', type: 'button', textContent: t('Next day'), onclick: () => shift(1) })), cols);
  await load();
}

// Requests: customers who asked for a time and wait for the specialist's call. The hour is held for them meanwhile.
async function requests() {
  const { appointments: list } = await api(`${A}/pending`);
  setPending(list.length);
  const body = h('div', { className: 'cols' });
  body.append(h('div', {}, ...(list.length ? list.map(a => apptRow(a, requests, true)) : [h('p', { textContent: t('No requests waiting.') })])));
  panel.replaceChildren(h('h1', { textContent: t('Requests') }), h('p', { className: 'hint', textContent: t('These customers asked for a time and wait for your call. The hour stays reserved for them until you confirm or decline (or 24 hours pass).') }), body);
}
const setPending = n => { pendingCount = n; const b = document.querySelector('#tabs button[data-id="requests"]'); if (b) { b.replaceChildren(t('Requests'), ...(n ? [h('span', { className: 'dot', textContent: n })] : [])); } document.title = (n ? `(${n}) ` : '') + 'Admin'; };
// Checks for new requests every 30 seconds while the page is open; beeps and notifies when one arrives.
async function pollPending() {
  try {
    const { count } = await api(`${A}/pending`);
    const grew = pendingCount >= 0 && count > pendingCount;
    setPending(count);
    if (grew && alertsOn()) { beep(); try { if (Notification.permission === 'granted') new Notification(t('New booking request'), { body: t('Open your dashboard to see who it is.') }); } catch { /* unsupported */ } }
    if (grew && ['requests', 'appointments'].includes(location.hash.slice(1))) show();
  } catch { /* offline or signed out */ }
}

// Upcoming appointments for the next 30 days, grouped by day.
async function upcoming() {
  const { appointments: list } = await api(`${A}/upcoming`), by = new Map();
  for (const a of list) by.set(a.date, [...(by.get(a.date) || []), a]);
  panel.replaceChildren(h('h1', { textContent: t('Upcoming') }), ...(by.size ? [...by].map(([d, items]) => h('div', { className: 'card' }, h('h2', { textContent: Dates.fmt(d, LANG) }), ...items.map(a => apptRow(a, upcoming)))) : [h('p', { textContent: t('Nothing in the next 30 days.') })]));
}

// ---- Site text and location ----
const mapSrc = (lat, lng, zoom) => {
  const w = 0.004 * 2 ** (16 - Math.min(19, Math.max(3, Math.round(+zoom || 16)))), ht = w * 0.6, f = n => n.toFixed(6);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${f(lng - w)},${f(lat - ht)},${f(lng + w)},${f(lat + ht)}&layer=mapnik&marker=${f(lat)},${f(lng)}`;
};
async function site() {
  const { fields, values } = await api(`${A}/settings`);
  const form = h('form', { className: 'stack' });
  const msg = h('p', { className: 'msg', role: 'status' });
  let group;
  for (const f of fields) {
    if (f.group !== group) { group = f.group; form.append(h('h2', { textContent: t(group) })); }
    const base = { type: f.type || 'text', rows: f.rows, hint: f.hint };
    if (f.i18n) form.append(h('div', { className: 'grid2' }, ...bi(f.key, f.label, values, base).map(fieldEl)));
    else form.append(fieldEl({ name: f.key, label: f.label, value: values[f.key], ...base }));
    if (f.key === 'zoom') {
      const preview = h('iframe', { className: 'preview', title: t('Map preview'), hidden: true });
      const note = h('p', { className: 'msg', role: 'status' });
      const refresh = () => {
        const lat = parseFloat(form.elements.lat.value), lng = parseFloat(form.elements.lng.value);
        preview.hidden = isNaN(lat) || isNaN(lng);
        if (!preview.hidden) preview.src = mapSrc(lat, lng, form.elements.zoom.value);
      };
      for (const n of ['lat', 'lng', 'zoom']) form.elements[n].addEventListener('change', refresh);
      form.append(h('div', { className: 'actions' }, h('button', { className: 'btn secondary', type: 'button', textContent: t('Find the address on the map'), onclick: async () => {
        say(note, true, t('Searching...'));
        try {
          const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(form.elements.address.value));
          const j = await r.json();
          if (!j.length) throw new Error(t('No match. Try a fuller address, or type the coordinates in by hand.'));
          form.elements.lat.value = (+j[0].lat).toFixed(6); form.elements.lng.value = (+j[0].lon).toFixed(6);
          say(note, true, t('Found. Check the map, then save.')); refresh();
        } catch (err) { say(note, false, err.message); }
      } })), note, preview);
      refresh();
    }
  }
  form.append(msg, h('div', { className: 'actions' }, h('button', { className: 'btn', type: 'submit', textContent: t('Save changes') })));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try { await api(`${A}/settings`, readForm(form), 'PUT'); say(msg, true, t('Saved. Reload the site to see it.')); } catch (err) { say(msg, false, err.message); }
  });
  panel.replaceChildren(h('h1', { textContent: t('Site text and location') }), form);
}

// ---- Images ----
async function images() {
  const { images: list } = await api(`${A}/images`);
  panel.replaceChildren(h('h1', { textContent: t('Section images') }),
    h('p', { className: 'hint', textContent: t('Photos are resized for the web automatically. Landscape photos at least 1600 px wide work best.') }),
    h('p', { className: 'hint', textContent: t('Photos are cropped to fit each section. Click the photo to mark the part that must always stay visible; the previews show the result on a computer and on a phone.') }),
    ...list.map(im => {
      const picker = focalPicker({ url: im.url, pos: im.pos, frames: FRAMES.wide, minWidth: im.minWidth, onSave: pos => api(`${A}/images/${im.slot}/pos`, { pos }, 'PUT') });
      const reset = h('button', { className: 'linkbtn', type: 'button', textContent: t('Go back to the original image'), hidden: !im.custom, onclick: async () => { await api(`${A}/images/${im.slot}`, null, 'DELETE'); images(); } });
      return h('div', { className: 'card stack' }, h('h3', { textContent: t(im.label) }), h('p', { className: 'hint', textContent: t(im.hint) }), picker,
        uploader('Upload new image', `${A}/images/${im.slot}`, () => images()), reset);
    }));
}

// ---- Services ----
async function services() {
  const { services: list, barbers, icons } = await api(`${A}/services`);
  const fieldsFor = s => [
    ...bi('name', 'Name', s), { name: 'icon', label: 'Icon', type: 'select', value: s.icon || 'scissors', options: icons.map(i => [i, i]) },
    ...bi('description', 'Short description', s),
    { name: 'price', label: 'Price', type: 'number', value: s.price ?? '', attrs: { min: 0 }, half: true }, { name: 'duration_min', label: 'Duration in minutes', type: 'number', value: s.duration_min ?? 30, attrs: { min: 5, step: 5 }, half: true },
    { name: 'sort', label: 'Order on the page (1 comes first)', type: 'number', value: s.sort ?? 0, attrs: { min: 0 } },
    { name: 'barbers', label: 'Offered by', type: 'checks', options: barbers.map(b => [b.id, b.name]), value: s.barbers ?? barbers.map(b => b.id) },
    { name: 'active', label: 'Show on the site and allow booking', type: 'checkbox', value: s.active ?? 1 },
  ];
  const add = h('details', {}, h('summary', { textContent: t('Add a service') }), h('div', { className: 'body' },
    editor({ fields: fieldsFor({}), saveText: 'Add service', onSave: async v => { await api(`${A}/services`, v); services(); } })));
  panel.replaceChildren(h('h1', { textContent: t('Services and prices') }),
    ...list.map(s => h('details', {}, h('summary', {}, (LANG === 'ro' && s.name_ro) || s.name, h('small', { textContent: `${s.price}, ${s.duration_min} ${t('min')}${s.active ? '' : ', ' + t('hidden')}` })),
      h('div', { className: 'body' }, editor({ fields: fieldsFor(s), onSave: v => api(`${A}/services/${s.id}`, v, 'PUT'),
        onDelete: async () => { const r = await api(`${A}/services/${s.id}`, null, 'DELETE'); if (r.deactivated) alert(t('This service has booking history, so it was hidden instead of deleted.')); services(); } })))), add);
}

// ---- Team ----
const DAYS = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']];
function hoursEditor(b) {
  const form = h('form', { className: 'stack' }), grid = h('div', { className: 'hours' }), msg = h('p', { className: 'msg', role: 'status' });
  const rows = DAYS.map(([i, name]) => {
    const d = b.hours[i], n = t(name);
    const on = h('input', { type: 'checkbox', checked: !!d, 'aria-label': `${n}, ${t('works')}` });
    const from = h('input', { type: 'time', value: d?.opens || '10:00', 'aria-label': `${n}, ${t('opens')}` }), to = h('input', { type: 'time', value: d?.closes || '19:00', 'aria-label': `${n}, ${t('closes')}` });
    const sync = () => { from.disabled = to.disabled = !on.checked; }; on.onchange = sync; sync();
    grid.append(h('span', { textContent: n }), on, from, to);
    return { i, on, from, to };
  });
  form.append(grid, msg, h('div', { className: 'actions' }, h('button', { className: 'btn', type: 'submit', textContent: t('Save schedule') })));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const days = Array(7).fill(null);
    for (const r of rows) if (r.on.checked) days[r.i] = { opens: r.from.value, closes: r.to.value };
    try { await api(`${A}/team/${b.id}/hours`, { days }, 'PUT'); say(msg, true, t('Saved.')); } catch (err) { say(msg, false, err.message); }
  });
  return form;
}
function timeOff(b) {
  const list = h('div'), msg = h('p', { className: 'msg', role: 'status' });
  const draw = () => {
    list.replaceChildren(...(b.timeoff.length ? b.timeoff.map(x => h('p', {}, `${Dates.fmt(x.date, LANG)}${x.reason ? ', ' + x.reason : ''} `,
      h('button', { className: 'linkbtn danger', type: 'button', textContent: t('Remove'), onclick: async () => { await api(`${A}/timeoff/${x.id}`, null, 'DELETE'); b.timeoff = b.timeoff.filter(y => y.id !== x.id); draw(); } })))
      : [h('p', { className: 'hint', textContent: t('No days off booked.') })]));
  };
  draw();
  const date = dateField({ min: today(), label: t('Day off') }), reason = h('input', { placeholder: t('Reason (optional)'), 'aria-label': t('Reason') });
  const add = h('button', { className: 'btn secondary', type: 'button', textContent: t('Add day off'), onclick: async () => {
    try {
      const r = await api(`${A}/team/${b.id}/timeoff`, { date: date.value, reason: reason.value });
      b.timeoff = [...b.timeoff, { id: r.id, date: date.value, reason: reason.value }].sort((x, y) => x.date.localeCompare(y.date)); draw(); date.value = ''; reason.value = '';
      say(msg, !r.booked, r.booked ? t('Added, but {n} appointment(s) already booked that day were not cancelled. Move them in Appointments.').replace('{n}', r.booked) : t('Added.'));
    } catch (err) { say(msg, false, err.message); }
  } });
  return h('div', { className: 'stack' }, list, h('div', { className: 'grid2' }, date, reason), h('div', { className: 'actions' }, add), msg);
}
// Owner: add, suspend, reset or delete a specialist's sign-in. Dangerous actions ask for the specialist's email and the owner's password.
function dangerDialog(b, kind, done) {
  const del = kind === 'delete';
  const msg = h('p', { className: 'msg', role: 'alert' });
  const dlg = h('dialog');
  const form = h('form', { className: 'stack' },
    h('h2', { textContent: t(del ? 'Delete this specialist?' : 'Reset this account?') }),
    h('p', { className: 'hint', textContent: t(del ? 'This permanently deletes the specialist, their photos, schedule and every appointment. It cannot be undone, and customers with upcoming bookings are not told.' : 'Use this only if the specialist lost BOTH their password and recovery code. Their appointment history is erased (nobody can read it any more) and they get a new invitation.') }),
    h('label', {}, `${t('Type the sign-in email to confirm')}: ${b.login_email}`, h('input', { name: 'confirm', autocomplete: 'off' })),
    h('label', {}, t('Your password'), h('input', { name: 'password', type: 'password', autocomplete: 'current-password' })), msg,
    h('div', { className: 'actions' }, h('button', { className: 'btn', type: 'submit', textContent: t(del ? 'Delete for good' : 'Reset account') }), h('button', { className: 'linkbtn', type: 'button', textContent: t('Cancel'), onclick: () => dlg.close() })));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try { const r = await api(`${A}/team/${b.id}${del ? '' : '/reset'}`, { confirm: form.elements.confirm.value, password: form.elements.password.value }, del ? 'DELETE' : 'POST'); dlg.close(); done(r); }
    catch (err) { say(msg, false, err.message); }
  });
  dlg.append(form); dlg.addEventListener('close', () => dlg.remove()); document.body.append(dlg); dlg.showModal();
}
const inviteBox = (url, emailed) => url ? h('div', { className: 'notice' }, h('strong', { textContent: t('Invitation link') }), h('p', { className: 'hint', textContent: t('Send this link to the specialist yourself. It works once, for 3 days. Do not open it yourself: whoever opens it chooses the password.') }), h('div', { className: 'linkbox', textContent: url })) : h('p', { className: 'msg ok', textContent: emailed });

async function team() {
  const { team: list, emailInvites } = await api(`${A}/team`);
  let invite = null;
  const cards = list.map(b => {
    const photo = focalPicker({ url: b.photo || '', pos: b.photo_pos, frames: FRAMES.square, minWidth: 500, onSave: pos => api(`${A}/team/${b.id}/photo-pos`, { pos }, 'PUT') });
    photo.hidden = !b.photo;
    const removePhoto = h('button', { className: 'linkbtn danger', type: 'button', textContent: t('Remove photo'), hidden: !b.photo, onclick: async () => { await api(`${A}/team/${b.id}/photo`, null, 'DELETE'); photo.hidden = removePhoto.hidden = true; photo.setImage('', '50% 50%'); } });
    const act = (text, fn, cls = 'linkbtn') => h('button', { className: cls, type: 'button', textContent: t(text), onclick: async () => { try { await fn(); } catch (e) { alert(e.message); } } });
    const account = OWNER ? h('div', { className: 'stack' }, h('h3', { textContent: t('Account') }),
      h('p', {}, `${b.login_email} `, h('span', { className: `badge ${b.account_status}`, textContent: t(b.account_status) })),
      h('p', { className: 'hint', textContent: t('You can add or remove a specialist and suspend their account. You cannot see their appointments, customers, schedule or income: that stays private to the specialist.') }),
      h('div', { className: 'actions' },
        ...(b.account_status === 'invited' ? [act('New invitation link', async () => { const r = await api(`${A}/team/${b.id}/invite`, {}); alert(r.inviteUrl ? r.inviteUrl : t('Invitation emailed.')); })] : []),
        ...(b.account_status === 'active' ? [act('Suspend', async () => { await api(`${A}/team/${b.id}/suspend`, { suspended: true }); team(); })] : []),
        ...(b.account_status === 'suspended' ? [act('Reactivate', async () => { await api(`${A}/team/${b.id}/suspend`, { suspended: false }); team(); })] : []),
        ...(b.account_status !== 'invited' ? [act('Reset account...', () => dangerDialog(b, 'reset', r => { alert(r.inviteUrl || t('Invitation emailed.')); team(); }), 'linkbtn danger')] : []),
        act('Delete...', () => dangerDialog(b, 'delete', () => team()), 'linkbtn danger'))) : '';
    return h('details', { open: !OWNER }, h('summary', {}, b.name, h('small', { textContent: `${(LANG === 'ro' && b.role_ro) || b.role || ''}${b.active ? '' : ` (${t('hidden')})`}` })),
      h('div', { className: 'body stack' },
        h('h3', { textContent: t('Profile') }),
        editor({ fields: [
          { name: 'name', label: 'Name', value: b.name },
          ...bi('role', 'Title', { role: b.role || '', role_ro: b.role_ro || '' }),
          ...bi('bio', 'About this specialist', { bio: b.bio || '', bio_ro: b.bio_ro || '' }, { type: 'textarea', rows: 5, hint: 'Shown over their photo on the site.' })],
          onSave: v => api(`${A}/team/${b.id}`, v, 'PUT') }),
        h('h3', { textContent: t('Photo') }), photo, removePhoto,
        uploader('Upload photo', `${A}/team/${b.id}/photo`, r => { photo.setImage(r.url, '50% 50%'); photo.hidden = removePhoto.hidden = false; }),
        ...(OWNER ? [account] : [h('h3', { textContent: t('Weekly schedule (when clients can book)') }), hoursEditor(b), h('h3', { textContent: t('Days off') }), timeOff(b)])));
  });
  const holder = h('div');
  const add = OWNER ? h('details', {}, h('summary', { textContent: t('Add a team member') }), h('div', { className: 'body' },
    h('p', { className: 'hint', textContent: t(emailInvites ? 'The specialist gets an invitation email and chooses their own password.' : 'Email sending is not set up, so you get a link to pass on to the specialist, who then chooses their own password.') }),
    editor({ saveText: 'Add', fields: [{ name: 'name', label: 'Name', value: '' }, { name: 'role', label: 'Title', value: '' }, { name: 'email', label: 'Sign-in email', type: 'email', value: '' }],
      onSave: async v => { const r = await api(`${A}/team`, v); holder.replaceChildren(inviteBox(r.inviteUrl, t('Invitation emailed.'))); if (emailInvites) setTimeout(team, 1500); else await Promise.resolve(); } }))) : '';
  panel.replaceChildren(h('h1', { textContent: t(OWNER ? 'Team' : 'My profile') }), holder, ...cards, add);
}

// ---- Reviews ----
async function reviews() {
  const { testimonials: list } = await api(`${A}/testimonials`);
  const fieldsFor = x => [
    { name: 'name', label: 'Client name', value: x.name || '' },
    ...bi('label', 'Line under the name (city, etc.)', x),
    ...bi('quote', 'Review', x, { type: 'textarea', rows: 4 }),
    { name: 'sort', label: 'Order (1 comes first)', type: 'number', value: x.sort ?? 0, attrs: { min: 0 } },
    { name: 'active', label: 'Show on the site', type: 'checkbox', value: x.active ?? 1 }];
  panel.replaceChildren(h('h1', { textContent: t('Client reviews') }),
    h('p', { className: 'hint', textContent: t("The sample reviews are placeholders. Replace them with real ones, with your clients' permission.") }),
    ...list.map(x => h('details', {}, h('summary', {}, x.name, h('small', { textContent: x.active ? '' : t('hidden') })),
      h('div', { className: 'body' }, editor({ fields: fieldsFor(x), onSave: v => api(`${A}/testimonials/${x.id}`, v, 'PUT'), onDelete: async () => { await api(`${A}/testimonials/${x.id}`, null, 'DELETE'); reviews(); } })))),
    h('details', {}, h('summary', { textContent: t('Add a review') }), h('div', { className: 'body' }, editor({ fields: fieldsFor({}), saveText: 'Add review', onSave: async v => { await api(`${A}/testimonials`, v); reviews(); } }))));
}

// ---- Gallery ----
async function gallery() {
  const [{ photos }, teamData] = await Promise.all([api(`${A}/gallery`), OWNER ? api(`${A}/team`) : { team: [] }]);
  const inp = (ph) => h('input', { placeholder: t(ph) });
  const tag = inp('Skin fade, beard line-up'), tagRo = inp('Skin fade, beard line-up'), caption = inp('Describe the photo for screen readers'), captionRo = inp('Describe the photo for screen readers');
  const barber = OWNER ? h('select', {}, h('option', { value: '', textContent: t('No specialist') }), ...teamData.team.map(b => h('option', { value: b.id, textContent: b.name }))) : null;
  const up = uploader('Add photo', `${A}/gallery`, () => gallery(), { tag: () => tag.value, tag_ro: () => tagRo.value, caption: () => caption.value, caption_ro: () => captionRo.value, barber_id: () => barber?.value || '' });
  panel.replaceChildren(h('h1', { textContent: t('Gallery') }),
    h('p', { className: 'hint', textContent: t('Photos of finished cuts. The gallery section appears on the site once there is at least one photo.') }),
    h('div', { className: 'card stack' }, h('h3', { textContent: t('Add a photo') }), ...(barber ? [h('label', {}, t('Specialist'), barber)] : []),
      h('div', { className: 'grid2' }, h('label', {}, `${t('What it shows')} (EN)`, tag), h('label', {}, `${t('What it shows')} (RO)`, tagRo)),
      h('div', { className: 'grid2' }, h('label', {}, `${t('Description')} (EN)`, caption), h('label', {}, `${t('Description')} (RO)`, captionRo)), up),
    h('div', { className: 'photos' }, ...photos.map(p => h('div', { className: 'card' }, focalPicker({ url: p.url, pos: p.pos, frames: FRAMES.tile, minWidth: 700, onSave: pos => api(`${A}/gallery/${p.id}/pos`, { pos }, 'PUT') }),
      editor({ fields: [...bi('tag', 'What it shows', { tag: p.tag || '', tag_ro: p.tag_ro || '' }, { half: false }), ...bi('caption', 'Description', { caption: p.caption || '', caption_ro: p.caption_ro || '' }, { half: false })],
        onSave: v => api(`${A}/gallery/${p.id}`, v, 'PUT'), onDelete: async () => { await api(`${A}/gallery/${p.id}`, null, 'DELETE'); gallery(); } })))));
}

// ---- Messages ----
async function messages() {
  const { messages: list } = await api(`${A}/messages`);
  panel.replaceChildren(h('h1', { textContent: t('Messages') }), ...(list.length ? list.map(m => h('div', { className: 'msgrow' },
    h('strong', { textContent: m.name }), ' ', h('a', { href: 'tel:' + m.phone, textContent: m.phone }), ' ', h('small', { className: 'hint', textContent: Dates.fmtStamp(m.created_at, LANG) }), ' ',
    h('button', { className: 'linkbtn danger', type: 'button', textContent: t('Delete'), onclick: async () => { await api(`${A}/messages/${m.id}`, null, 'DELETE'); messages(); } }),
    h('p', { textContent: m.message }))) : [h('p', { textContent: t('No messages yet.') })]));
}

// ---- Notifications and booking style (barber) ----
async function notifications() {
  const n = await api(`${A}/notify`);
  const waBox = h('div', { className: 'stack' });
  const phone = h('input', { type: 'tel', value: n.whatsapp.to, placeholder: '+40 7xx xxx xxx', autocomplete: 'tel' });
  const msg = h('p', { className: 'msg', role: 'alert' });
  const failWith = e => say(msg, false, e.message);
  if (n.whatsapp.verified) {
    waBox.append(h('p', {}, `${t('WhatsApp number')}: ${n.whatsapp.to} `, h('span', { className: 'badge active', textContent: t('verified') })),
      h('button', { className: 'linkbtn danger', type: 'button', textContent: t('Remove this number'), onclick: async () => { await api(`${A}/notify/whatsapp-remove`, {}); notifications(); } }));
  } else if (!n.available.whatsapp) {
    waBox.append(h('p', { className: 'hint', textContent: t(n.available.whatsappState === 'unavailable' ? 'The WhatsApp library is not installed on this server yet.' : "The shop's WhatsApp is not connected yet. The owner links it in the WhatsApp tab. Until then, the email message includes a link that opens WhatsApp chat with the customer.") }));
  } else {
    const codeInput = h('input', { inputMode: 'numeric', autocomplete: 'one-time-code', placeholder: '123456', maxLength: 6 });
    const verify = h('div', { className: 'stack', hidden: true }, h('label', {}, t('Code we sent to your WhatsApp'), codeInput),
      h('button', { className: 'btn', type: 'button', textContent: t('Verify'), onclick: async () => { try { await api(`${A}/notify/whatsapp-verify`, { code: codeInput.value }); notifications(); } catch (e) { failWith(e); } } }));
    waBox.append(h('label', {}, t('My WhatsApp number (with country code)'), phone),
      h('button', { className: 'btn secondary', type: 'button', textContent: t('Send me a code on WhatsApp'), onclick: async () => { try { await api(`${A}/notify/whatsapp-code`, { phone: phone.value }); verify.hidden = false; say(msg, true, t('Code sent. Check your WhatsApp.')); } catch (e) { failWith(e); } } }),
      verify, msg,
      h('p', { className: 'hint', textContent: t('Tip: save the shop WhatsApp number in your contacts and send it a "hi" first. It helps WhatsApp see this as a normal conversation.') }));
  }
  // Simple route: CallMeBot. No linking and no business account; the barber only needs their own WhatsApp.
  const cmbPhone = h('input', { type: 'tel', value: n.callmebot.phone, placeholder: '+40 7xx xxx xxx', autocomplete: 'tel' }), cmbKey = h('input', { placeholder: t(n.callmebot.saved ? '(saved)' : 'API key from CallMeBot'), autocomplete: 'off', spellcheck: false });
  const cmbMsg = h('p', { className: 'msg', role: 'alert' });
  const cmb = h('div', { className: 'stack' },
    h('ol', { className: 'hint' }, h('li', { textContent: t('Open callmebot.com/blog/free-api-whatsapp-messages and add the CallMeBot contact it shows (the number can change). Then send it exactly: I allow callmebot to send me messages') }), h('li', { textContent: t('It answers with your API key. Type your WhatsApp number and that key below.') })),
    h('label', {}, t('My WhatsApp number (with country code)'), cmbPhone), h('label', {}, t('CallMeBot API key'), cmbKey),
    h('div', { className: 'actions' }, h('button', { className: 'btn', type: 'button', textContent: t('Save and send a test message'), onclick: async () => { try { await api(`${A}/notify/callmebot`, { phone: cmbPhone.value, apikey: cmbKey.value }); notifications(); } catch (e) { say(cmbMsg, false, e.message); } } }),
      ...(n.callmebot.saved ? [h('button', { className: 'linkbtn danger', type: 'button', textContent: t('Remove'), onclick: async () => { await api(`${A}/notify/callmebot-remove`, {}); notifications(); } })] : [])), cmbMsg,
    h('p', { className: 'hint', textContent: t('CallMeBot is a free third-party service: your messages pass through it and arrive from its number. You cannot reply to them; use the confirm / decline link inside the message.') }));
  const form = editor({ saveText: 'Save', fields: [
    { name: 'booking_mode', label: 'When someone books', type: 'select', value: n.booking_mode, options: [['instant', 'Instant: bookings are confirmed automatically'], ['request', 'Request: I call the customer to confirm']],
      hint: 'In request mode the hour is held for the customer and you get a message with their name, email and phone.' },
    { name: 'notify_lang', label: 'My messages are written in', type: 'select', value: n.notify_lang, options: [['en', 'English'], ['ro', 'Română']] },
    { name: 'email_on', label: 'Email', type: 'checkbox', value: n.email.enabled },
    { name: 'email_to', label: 'Send to', type: 'email', value: n.email.to, hint: n.available.emailReal ? '' : 'Email sending is not set up on this server yet: messages are only printed in the server log.' },
    ...(n.callmebot.saved ? [{ name: 'cmb_on', label: 'WhatsApp (CallMeBot)', type: 'checkbox', value: n.callmebot.enabled }] : []),
    ...(n.whatsapp.verified ? [{ name: 'wa_on', label: 'WhatsApp (shop number)', type: 'checkbox', value: n.whatsapp.enabled }] : [])],
    onSave: v => api(`${A}/notify`, { booking_mode: v.booking_mode, notify_lang: v.notify_lang, email: { enabled: v.email_on, to: v.email_to }, whatsapp: { enabled: v.wa_on }, callmebot: { enabled: v.cmb_on } }, 'PUT') });
  const alerts = h('input', { type: 'checkbox', checked: alertsOn(), onchange: async e => { localStorage.setItem('alerts', e.target.checked ? '1' : '0'); if (e.target.checked && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } });
  const test = h('button', { className: 'btn secondary', type: 'button', textContent: t('Send a test'), onclick: async () => { try { await api(`${A}/notify/test`, {}); alert(t('Test sent. Save first if you just changed something.')); } catch (e) { alert(e.message); } } });
  panel.replaceChildren(h('h1', { textContent: t('Notifications') }),
    h('p', { className: 'hint', textContent: t("So you do not have to keep opening this page. Each message has the customer's name, email and phone, the day and hour, and links to call or WhatsApp them. Messages travel through the service you pick (your email provider or WhatsApp) in readable form, so only turn on what you are comfortable with.") }),
    h('div', { className: 'card stack' }, h('h3', { textContent: t('WhatsApp, simple (no linking)') }), cmb),
    h('div', { className: 'card stack' }, h('h3', { textContent: t('WhatsApp through the shop number') }), waBox,
      h('p', { className: 'hint', textContent: t('With WhatsApp on and request mode, you can answer a request message with YES (or DA) to confirm it, or NO (or NU) to decline it.') })),
    h('div', { className: 'card stack' }, form, h('div', { className: 'actions' }, test)),
    h('div', { className: 'card stack' }, h('h3', { textContent: t('Alerts in this browser') }), h('label', { className: 'check' }, alerts, t('Beep and show a notification when a new request arrives while this page is open (checked every 30 seconds).'))));
}

// ---- Owner: link the shop's WhatsApp number (it only sends booking messages to barbers) ----
async function whatsappTab() {
  let st = await api(`${A}/whatsapp`);
  const box = h('div', { className: 'card stack' });
  const act = async fn => { try { st = await fn(); draw(); } catch (e) { alert(e.message); } };
  function draw() {
    const phone = h('input', { type: 'tel', placeholder: '+40 7xx xxx xxx', autocomplete: 'off' });
    const parts = [h('h3', { textContent: t('Shop WhatsApp number') })];
    if (st.state === 'open') parts.push(h('p', {}, `${t('Connected as')} +${st.number} `, h('span', { className: 'badge active', textContent: t('connected') })),
      h('button', { className: 'linkbtn danger', type: 'button', textContent: t('Disconnect'), onclick: () => { if (confirm(t('Disconnect the shop WhatsApp? Specialists stop getting WhatsApp messages until you link it again.'))) act(() => api(`${A}/whatsapp/logout`, {})); } }));
    else if (st.state === 'unavailable') parts.push(h('p', { className: 'msg', textContent: t(st.error) }));
    else if (st.state === 'pairing' && st.qrImage) parts.push(h('p', { textContent: t('On the phone with this number: WhatsApp > Settings > Linked devices > Link a device, then scan this QR code with the camera:') }), h('img', { src: st.qrImage, alt: 'WhatsApp QR code', width: 300, height: 300 }),
      h('p', { className: 'hint', textContent: t('The code renews by itself every few seconds. Keep this page open.') }));
    else if (st.state === 'pairing' && st.code) parts.push(h('p', { textContent: t('On the phone with this number: WhatsApp > Settings > Linked devices > Link a device > "Link with phone number instead", then type this code:') }), h('p', { className: 'recoverycode', textContent: st.code }),
      h('p', { className: 'hint', textContent: t('Waiting for you to enter the code on the phone...') }));
    else if (st.state === 'pairing') parts.push(h('p', { textContent: t('Waiting for WhatsApp to show a QR code...') }));
    else if (st.state === 'connecting') parts.push(h('p', { textContent: t('Connecting...') }));
    else parts.push(h('p', { className: 'hint', textContent: t('Option 1 (recommended): scan a QR code with the phone.') }), h('button', { className: 'btn', type: 'button', textContent: t('Show a QR code'), onclick: () => act(() => api(`${A}/whatsapp/link-qr`, {})) }),
      h('p', { className: 'hint', textContent: t('Option 2: link with a pairing code instead.') }), h('label', {}, t('WhatsApp number to link (with country code)'), phone), h('button', { className: 'btn secondary', type: 'button', textContent: t('Get a pairing code'), onclick: () => act(() => api(`${A}/whatsapp/link`, { phone: phone.value })) }));
    if (st.error && st.state !== 'unavailable') parts.push(h('p', { className: 'msg', textContent: t(st.error) }));
    box.replaceChildren(...parts);
  }
  draw();
  panel.replaceChildren(h('h1', { textContent: 'WhatsApp' }),
    h('div', { className: 'notice' }, h('strong', { textContent: t('Read this first') }), h('p', { className: 'hint', textContent: t("Known problem: with current WhatsApp versions the Baileys library often fails with “Couldn’t link device”, for both QR and pairing code. If it fails, it is not your phone. Do not spend hours on it: each specialist can use the simple route (CallMeBot) in Notifications. This uses Baileys, an unofficial way of using WhatsApp. It is against WhatsApp's terms and the number can be banned. Use a dedicated number, not a personal one. The phone linked here also shows every message sent from it, including the customers' details, so keep it with someone who should see them. The linked session is stored on the server in data/whatsapp-auth: keep that folder private.") })), box);
  const timer = setInterval(async () => {
    if (location.hash.slice(1) !== 'whatsapp') return clearInterval(timer);
    try { const n = await api(`${A}/whatsapp`); if (JSON.stringify(n) !== JSON.stringify(st)) { st = n; draw(); } } catch { /* try again */ }
  }, 2500);
}

// ---- Tabs ----
const TABS = OWNER
  ? [['site', 'Site text', site], ['images', 'Images', images], ['services', 'Services', services], ['team', 'Team', team], ['whatsapp', 'WhatsApp', whatsappTab], ['reviews', 'Reviews', reviews], ['gallery', 'Gallery', gallery], ['messages', 'Messages', messages]]
  : [['appointments', 'Appointments', appointments], ['requests', 'Requests', requests], ['upcoming', 'Upcoming', upcoming], ['dashboard', 'Dashboard', dashboard], ['team', 'My profile', team], ['notifications', 'Notifications', notifications], ['gallery', 'Gallery', gallery]];
const tabs = $('#tabs');
async function show() {
  const id = location.hash.slice(1) || TABS[0][0];
  const tab = TABS.find(x => x[0] === id) || TABS[0];
  tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.id === tab[0])));
  panel.replaceChildren(h('p', { className: 'hint', textContent: t('Loading...') }));
  try { await tab[2](); } catch (err) { panel.replaceChildren(h('p', { className: 'msg', textContent: err.message })); }
}
tabs.replaceChildren(...TABS.map(([id, label]) => { const b = h('button', { type: 'button', textContent: t(label), onclick: () => { location.hash = id; } }); b.dataset.id = id; return b; }));
addEventListener('hashchange', show);
show();
if (!OWNER) { pollPending(); setInterval(pollPending, 30000); }

// ---- Header actions ----
$('#logout').onclick = async () => { await api(`${A}/logout`, {}); location.href = '/admin/login'; };
$('#pw').onclick = () => {
  const dlg = h('dialog');
  const form = editor({ saveText: 'Change password', fields: [
    { name: 'current', label: 'Current password', type: 'password', attrs: { autocomplete: 'current-password' } },
    { name: 'next', label: 'New password (at least 12 characters)', type: 'password', attrs: { autocomplete: 'new-password' } }],
    onSave: async v => { await api(`${A}/password`, v); setTimeout(() => dlg.close(), 800); } });
  dlg.append(h('h2', { textContent: t('Change password') }), form, h('p', {}, h('button', { className: 'linkbtn', type: 'button', textContent: t('Close'), onclick: () => dlg.close() })));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg); dlg.showModal();
};
}
